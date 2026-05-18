import crypto from 'node:crypto';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Payment from '../models/Payment.js';
import { createConfirmedAppointment } from './appointmentController.js';
import { normalizeAppointmentDate } from '../services/tokenService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { formatGatewayError } from '../utils/paymentGatewayHealth.js';
import { getRazorpayCredentials, razorpayRequest } from '../utils/razorpayClient.js';
import { getStripe } from '../utils/stripeClient.js';

const MIN_CONSULTATION_FEE = 50;

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

/** Public config — gateways with keys in .env (fast; no blocking probe). */
export const getPaymentConfig = asyncHandler(async (_req, res) => {
  let stripe = false;
  let razorpay = false;
  try {
    getStripe();
    stripe = true;
  } catch {
    stripe = false;
  }
  try {
    getRazorpayCredentials();
    razorpay = true;
  } catch {
    razorpay = false;
  }
  res.json({ stripe, razorpay });
});

const runRazorpay = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    const wrapped = new Error(formatGatewayError(error, 'razorpay'));
    wrapped.statusCode = error.statusCode || 503;
    throw wrapped;
  }
};

const runStripe = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    const wrapped = new Error(formatGatewayError(error, 'stripe'));
    wrapped.statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 503;
    throw wrapped;
  }
};

const requirePatientDetails = (patientDetails = {}) => {
  const required = ['name', 'age', 'gender', 'phone', 'symptoms'];
  const missing = required.filter((key) => patientDetails[key] === undefined || patientDetails[key] === '');
  if (missing.length) {
    const error = new Error(`Missing patient details: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

const getSlotFee = (doctor, slotId) => {
  const slot = doctor.slots.id(slotId);
  if (!slot) {
    const error = new Error('Selected slot not found');
    error.statusCode = 404;
    throw error;
  }
  return Math.max(Number(slot.fee ?? doctor.fee ?? 500), MIN_CONSULTATION_FEE);
};

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, doctorName, slotLabel, appointmentDate, patientDetails, preferredPaymentMode = 'upi' } = req.body;
  requirePatientDetails(patientDetails);

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < MIN_CONSULTATION_FEE) {
    const error = new Error(`Consultation fee must be at least INR ${MIN_CONSULTATION_FEE} for Razorpay payments`);
    error.statusCode = 400;
    throw error;
  }

  const order = await runRazorpay(() =>
    razorpayRequest('/orders', {
      body: {
        amount: Math.round(numericAmount * 100),
        currency: 'INR',
        receipt: `JKH-${Date.now()}`,
        payment_capture: 1,
        notes: {
          doctorName: String(doctorName || ''),
          slotLabel: String(slotLabel || ''),
          appointmentDate: String(appointmentDate || ''),
          patientName: String(patientDetails.name || ''),
          patientEmail: String(patientDetails.email || ''),
          preferredPaymentMode: String(preferredPaymentMode)
        }
      }
    })
  );

  res.status(201).json({
    keyId: getRazorpayCredentials().keyId,
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency
    }
  });
});

export const verifyRazorpayOrder = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    const error = new Error('Missing Razorpay verification details');
    error.statusCode = 400;
    throw error;
  }

  const { keySecret } = getRazorpayCredentials();
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    const error = new Error('Razorpay payment verification failed');
    error.statusCode = 400;
    throw error;
  }

  const razorpayPayment = await runRazorpay(() =>
    razorpayRequest(`/payments/${razorpay_payment_id}`, { method: 'GET' })
  );
  if (razorpayPayment.order_id !== razorpay_order_id) {
    const error = new Error('Razorpay payment does not match this order');
    error.statusCode = 400;
    throw error;
  }
  if (!['captured', 'authorized'].includes(razorpayPayment.status)) {
    const error = new Error(`Razorpay payment is not complete yet: ${razorpayPayment.status || 'unknown'}`);
    error.statusCode = 402;
    throw error;
  }

  res.json({
    verified: true,
    payment: {
      amount: Number(razorpayPayment.amount) / 100,
      currency: razorpayPayment.currency || 'INR',
      method: 'razorpay',
      status: 'success',
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpayPaymentMethod: razorpayPayment.method,
      paidAt: new Date().toISOString()
    }
  });
});

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { doctorId, slotId, appointmentDate, patientDetails, preferredPaymentMode = 'upi' } = req.body;
  requirePatientDetails(patientDetails);

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const existing = await Appointment.findOne({
    patient: req.user._id,
    doctor: doctor._id,
    appointmentDate: normalizeAppointmentDate(appointmentDate),
    slotId,
    status: { $nin: ['cancelled', 'rejected'] }
  });
  if (existing) {
    const error = new Error('Duplicate booking for this doctor, date, and slot is not allowed');
    error.statusCode = 409;
    throw error;
  }

  const amount = getSlotFee(doctor, slotId);
  const session = await runStripe(() =>
    getStripe().checkout.sessions.create({
    mode: 'payment',
    client_reference_id: String(req.user._id),
    customer_email: req.user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'inr',
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `JK Hospital appointment with ${doctor.name}`,
            description: `${appointmentDate} - ${patientDetails.name}`
          }
        }
      }
    ],
    metadata: {
      userId: String(req.user._id),
      doctorId: String(doctor._id),
      slotId: String(slotId),
      appointmentDate: String(appointmentDate),
      preferredPaymentMode: String(preferredPaymentMode)
    },
    success_url: `${clientUrl()}/payment?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl()}/payment?cancelled=true`
    })
  );

  res.status(201).json({ url: session.url, sessionId: session.id });
});

export const createLocalCheckoutSession = asyncHandler(async (req, res) => {
  const { amount, doctorName, slotLabel, appointmentDate, patientDetails, preferredPaymentMode = 'upi' } = req.body;
  requirePatientDetails(patientDetails);

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < MIN_CONSULTATION_FEE) {
    const error = new Error(`Consultation fee must be at least INR ${MIN_CONSULTATION_FEE} for Stripe payments`);
    error.statusCode = 400;
    throw error;
  }

  const session = await runStripe(() =>
    getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: patientDetails.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'inr',
            unit_amount: Math.round(numericAmount * 100),
            product_data: {
              name: `JK Hospital appointment with ${doctorName || 'Doctor'}`,
              description: `${appointmentDate} - ${slotLabel || 'Consultation'} - ${patientDetails.name}`
            }
          }
        }
      ],
      metadata: {
        mode: 'local-storage',
        doctorName: String(doctorName || ''),
        slotLabel: String(slotLabel || ''),
        appointmentDate: String(appointmentDate || ''),
        patientName: String(patientDetails.name || ''),
        preferredPaymentMode: String(preferredPaymentMode)
      },
      success_url: `${clientUrl()}/payment?local_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl()}/payment?cancelled=true`
    })
  );

  res.status(201).json({ url: session.url, sessionId: session.id });
});

export const confirmLocalCheckoutSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const session = await runStripe(() =>
    getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    })
  );

  if (session.metadata?.mode !== 'local-storage') {
    const error = new Error('This Stripe session is not a local appointment payment');
    error.statusCode = 403;
    throw error;
  }

  if (session.payment_status !== 'paid') {
    const error = new Error('Stripe payment is not complete yet');
    error.statusCode = 402;
    throw error;
  }

  res.json({
    verified: true,
    payment: {
      amount: session.amount_total / 100,
      currency: session.currency?.toUpperCase() || 'INR',
      method: 'stripe',
      status: 'success',
      transactionId: session.id,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      paidAt: new Date().toISOString()
    }
  });
});

export const confirmCheckoutSession = asyncHandler(async (req, res) => {
  const { sessionId, patientDetails } = req.body;
  requirePatientDetails(patientDetails);

  const existingPayment = await Payment.findOne({ stripeSessionId: sessionId });
  if (existingPayment?.appointment) {
    const appointment = await Appointment.findById(existingPayment.appointment).populate('doctor').populate('payment');
    return res.json({ appointment, invoiceReady: true });
  }

  const session = await runStripe(() =>
    getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    })
  );

  if (session.client_reference_id !== String(req.user._id) || session.metadata?.userId !== String(req.user._id)) {
    const error = new Error('This Stripe payment does not belong to the signed-in patient');
    error.statusCode = 403;
    throw error;
  }

  if (session.payment_status !== 'paid') {
    const error = new Error('Stripe payment is not complete yet');
    error.statusCode = 402;
    throw error;
  }

  const populated = await createConfirmedAppointment({
    user: req.user,
    doctorId: session.metadata.doctorId,
    slotId: session.metadata.slotId,
    appointmentDate: session.metadata.appointmentDate,
    patientDetails,
    paymentInput: {
      amount: session.amount_total / 100,
      method: 'stripe',
      transactionId: session.id,
      currency: session.currency?.toUpperCase() || 'INR',
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    }
  });

  res.status(201).json({ appointment: populated, invoiceReady: true });
});
