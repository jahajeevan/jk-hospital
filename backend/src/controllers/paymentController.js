import crypto from 'node:crypto';
import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { createConfirmedAppointment } from './appointmentController.js';
import { assertSlotBookable, normalizeAppointmentDate } from '../services/tokenService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { formatGatewayError } from '../utils/paymentGatewayHealth.js';
import { getRazorpayCredentials, razorpayRequest } from '../utils/razorpayClient.js';
import { getStripe } from '../utils/stripeClient.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const MIN_CONSULTATION_FEE = 50;

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

// Patient fields carried on the gateway order/session so a webhook can rebuild
// the appointment if the browser dies before the client confirm call. Gateway
// metadata values are length-limited, so symptoms are truncated.
const patientMetadata = (patientDetails = {}) => ({
  patientName: String(patientDetails.name || '').slice(0, 200),
  patientAge: String(patientDetails.age ?? ''),
  patientGender: String(patientDetails.gender || ''),
  patientPhone: String(patientDetails.phone || ''),
  patientSymptoms: String(patientDetails.symptoms || 'Consultation').slice(0, 480)
});

/**
 * Reconcile a captured payment into a confirmed appointment from gateway
 * metadata alone (no request body). Idempotent: createConfirmedAppointment
 * dedupes on transactionId, so calling this after the client already confirmed
 * simply returns the existing appointment. Returns null when the metadata does
 * not describe a server-account booking (e.g. the local-storage flow).
 */
const reconcileFromMetadata = async (meta = {}, paymentInput) => {
  if (!meta.userId || !meta.doctorId || !meta.slotId) return null;

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('id', meta.userId)
    .is('deleted_at', null)
    .limit(1);

  const user = toCamelObj(users?.[0]);
  if (!user) return null;

  return createConfirmedAppointment({
    user,
    doctorId: meta.doctorId,
    slotId: meta.slotId,
    appointmentDate: meta.appointmentDate,
    patientDetails: {
      name: meta.patientName,
      age: Number(meta.patientAge) || undefined,
      gender: meta.patientGender,
      phone: meta.patientPhone,
      symptoms: meta.patientSymptoms || 'Consultation',
      email: user.email
    },
    paymentInput
  });
};

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
  if (!/^[6-9]\d{9}$/.test(String(patientDetails.phone))) {
    const error = new Error('A valid 10-digit Indian mobile number is required for payment contact');
    error.statusCode = 400;
    throw error;
  }
  const age = Number(patientDetails.age);
  if (!Number.isFinite(age) || age < 1 || age > 120) {
    const error = new Error('A valid patient age from 1 to 120 is required');
    error.statusCode = 400;
    throw error;
  }
};

const getSlotFee = (doctor, slotId) => {
  const slot = doctor.slots?.find((s) => String(s._id || s.id) === String(slotId));
  if (!slot) {
    const error = new Error('Selected slot not found');
    error.statusCode = 404;
    throw error;
  }
  return Math.max(Number(slot.fee ?? doctor.fee ?? 500), MIN_CONSULTATION_FEE);
};

const resolveDoctorOrThrow = async (doctorId) => {
  if (!doctorId) {
    const error = new Error('doctorId is required');
    error.statusCode = 400;
    throw error;
  }
  const { data: doctors } = await supabase
    .from('doctors')
    .select('*, slots:doctor_slots(*)')
    .eq('id', doctorId)
    .is('deleted_at', null)
    .limit(1);

  const doctor = toCamelObj(doctors?.[0]);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }
  return doctor;
};

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { doctorId, slotId, doctorName, slotLabel, appointmentDate, patientDetails, preferredPaymentMode = 'upi' } = req.body;
  requirePatientDetails(patientDetails);

  const doctor = await resolveDoctorOrThrow(doctorId);
  const numericAmount = getSlotFee(doctor, slotId);

  const order = await runRazorpay(() =>
    razorpayRequest('/orders', {
      body: {
        amount: Math.round(numericAmount * 100),
        currency: 'INR',
        receipt: `JKH-${Date.now()}`,
        payment_capture: 1,
        notes: {
          // Carried through to the payment.captured webhook so a lost booking
          // can be reconciled server-side without the client confirm call.
          userId: String(req.user._id),
          doctorId: String(doctor._id),
          slotId: String(slotId),
          appointmentDate: String(appointmentDate || ''),
          doctorName: String(doctorName || ''),
          slotLabel: String(slotLabel || ''),
          patientEmail: String(patientDetails.email || ''),
          preferredPaymentMode: String(preferredPaymentMode),
          ...patientMetadata(patientDetails)
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking } = req.body;
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

  const paymentInput = {
    amount: Number(razorpayPayment.amount) / 100,
    currency: razorpayPayment.currency || 'INR',
    method: 'razorpay',
    status: 'success',
    transactionId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpayPaymentMethod: razorpayPayment.method,
    paidAt: new Date().toISOString()
  };

  if (booking?.doctorId && booking?.slotId && booking?.appointmentDate && booking?.patientDetails) {
    const appointment = await createConfirmedAppointment({
      user: req.user,
      doctorId: booking.doctorId,
      doctorEmail: booking.doctorEmail,
      doctorName: booking.doctorName,
      slotId: booking.slotId,
      slotLabel: booking.slotLabel,
      appointmentDate: booking.appointmentDate,
      patientDetails: booking.patientDetails,
      paymentInput
    });
    return res.status(201).json({ verified: true, payment: appointment.payment, appointment, invoiceReady: true });
  }

  res.json({
    verified: true,
    payment: paymentInput
  });
});

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { doctorId, slotId, appointmentDate, patientDetails, preferredPaymentMode = 'upi' } = req.body;
  requirePatientDetails(patientDetails);

  const { data: doctors } = await supabase
    .from('doctors')
    .select('*, slots:doctor_slots(*)')
    .eq('id', doctorId)
    .is('deleted_at', null)
    .limit(1);

  const doctor = toCamelObj(doctors?.[0]);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const { data: duplicates } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', req.user._id)
    .eq('doctor_id', doctor._id)
    .eq('appointment_date', normalizeAppointmentDate(appointmentDate).toISOString().slice(0, 10))
    .eq('slot_id', slotId)
    .not('status', 'in', '("cancelled","rejected")')
    .is('deleted_at', null)
    .limit(1);

  const existing = toCamelObj(duplicates?.[0]);
  if (existing) {
    const error = new Error('Duplicate booking for this doctor, date, and slot is not allowed');
    error.statusCode = 409;
    throw error;
  }

  const amount = getSlotFee(doctor, slotId);
  const targetSlot = doctor.slots?.find(s => String(s._id || s.id) === String(slotId));
  assertSlotBookable(targetSlot, appointmentDate);

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
        preferredPaymentMode: String(preferredPaymentMode),
        ...patientMetadata(patientDetails)
      },
      success_url: `${clientUrl()}/payment?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl()}/payment?cancelled=true`
    })
  );

  res.status(201).json({ url: session.url, sessionId: session.id });
});

export const createLocalCheckoutSession = asyncHandler(async (req, res) => {
  const { doctorId, slotId, doctorName, slotLabel, appointmentDate, patientDetails, preferredPaymentMode = 'upi' } = req.body;
  requirePatientDetails(patientDetails);

  const doctor = await resolveDoctorOrThrow(doctorId);
  const numericAmount = getSlotFee(doctor, slotId);

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
  const { sessionId, booking } = req.body;
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

  const paymentInput = {
    amount: session.amount_total / 100,
    currency: session.currency?.toUpperCase() || 'INR',
    method: 'stripe',
    status: 'success',
    transactionId: session.id,
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    paidAt: new Date().toISOString()
  };

  if (booking?.doctorId && booking?.slotId && booking?.appointmentDate && booking?.patientDetails) {
    const appointment = await createConfirmedAppointment({
      user: req.user,
      doctorId: booking.doctorId,
      doctorEmail: booking.doctorEmail,
      doctorName: booking.doctorName,
      slotId: booking.slotId,
      slotLabel: booking.slotLabel,
      appointmentDate: booking.appointmentDate,
      patientDetails: booking.patientDetails,
      paymentInput
    });
    return res.status(201).json({ verified: true, payment: appointment.payment, appointment, invoiceReady: true });
  }

  res.json({
    verified: true,
    payment: paymentInput
  });
});

export const confirmCheckoutSession = asyncHandler(async (req, res) => {
  const { sessionId, patientDetails } = req.body;
  requirePatientDetails(patientDetails);

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .limit(1);

  const existingPayment = toCamelObj(payments?.[0]);
  if (existingPayment?.appointment) {
    const { data: populatedData } = await supabase
      .from('appointments')
      .select('*, doctor:doctors(*), payment:payments(*)')
      .eq('id', existingPayment.appointment)
      .limit(1);

    const appointment = toCamelObj(populatedData?.[0]);
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

/**
 * Stripe webhook — the safety net for the "paid but browser closed before
 * confirm" case. Reconciliation is idempotent, so this coexists with the
 * client confirm call without creating duplicate appointments or payments.
 * Requires the raw request body (captured in middleware/security.js) to verify
 * the signature.
 */
export const stripeWebhook = asyncHandler(async (req, res) => {
  if (!env.stripeWebhookSecret) {
    // Acknowledge so Stripe stops retrying, but make the misconfiguration loud.
    logger.warn('Received Stripe webhook but STRIPE_WEBHOOK_SECRET is not configured — skipping.');
    return res.status(200).json({ received: true, skipped: 'no webhook secret configured' });
  }

  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    logger.warn({ err: err.message }, 'Stripe webhook signature verification failed');
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      // Errors here propagate to a 500 so Stripe retries with backoff; because
      // reconciliation is idempotent, retries are safe.
      await reconcileFromMetadata(session.metadata, {
        amount: session.amount_total / 100,
        currency: session.currency?.toUpperCase() || 'INR',
        method: 'stripe',
        status: 'success',
        transactionId: session.id,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        paidAt: new Date().toISOString()
      });
    }
  }

  res.json({ received: true });
});

/**
 * Razorpay webhook — same reconciliation safety net for the Razorpay flow.
 * Signature is an HMAC-SHA256 of the raw body keyed by the webhook secret.
 */
export const razorpayWebhook = asyncHandler(async (req, res) => {
  if (!env.razorpayWebhookSecret) {
    logger.warn('Received Razorpay webhook but RAZORPAY_WEBHOOK_SECRET is not configured — skipping.');
    return res.status(200).json({ received: true, skipped: 'no webhook secret configured' });
  }

  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(req.rawBody).digest('hex');
  const signatureBuf = Buffer.from(String(signature || ''));
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    logger.warn('Razorpay webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid Razorpay webhook signature' });
  }

  const event = req.body;
  if (event?.event === 'payment.captured') {
    const payment = event.payload?.payment?.entity || {};
    await reconcileFromMetadata(payment.notes, {
      amount: Number(payment.amount) / 100,
      currency: payment.currency || 'INR',
      method: 'razorpay',
      status: 'success',
      transactionId: payment.id,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      razorpayPaymentMethod: payment.method,
      paidAt: new Date().toISOString()
    });
  }

  res.json({ received: true });
});
