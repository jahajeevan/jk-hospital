import { v4 as uuid } from 'uuid';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import { sendAppointmentEmail, sendMail, sendStatusEmail } from '../services/emailService.js';
import { createInvoiceBuffer } from '../services/invoiceService.js';
import { allocateToken, normalizeAppointmentDate } from '../services/tokenService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HOSPITAL } from '../utils/constants.js';

const getSlotFee = (doctor, slotId) => {
  const slot = doctor.slots.id(slotId);
  return slot?.fee ?? doctor.fee ?? HOSPITAL.consultationFee;
};

export const createConfirmedAppointment = async ({ user, doctorId, slotId, appointmentDate, patientDetails, payment, paymentInput }) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const normalizedAppointmentDate = normalizeAppointmentDate(appointmentDate);
  const duplicate = await Appointment.findOne({
    patient: user._id,
    doctor: doctor._id,
    appointmentDate: normalizedAppointmentDate,
    slotId,
    status: { $nin: ['cancelled', 'rejected'] }
  });
  if (duplicate) {
    const error = new Error('Duplicate booking for this doctor, date, and slot is not allowed');
    error.statusCode = 409;
    throw error;
  }

  const token = await allocateToken(doctor, normalizedAppointmentDate, slotId);
  const paid = payment || await Payment.create({
    patient: user._id,
    amount: paymentInput?.amount || getSlotFee(doctor, slotId),
    method: paymentInput?.method || 'upi',
    upiId: HOSPITAL.upiId,
    transactionId: paymentInput?.transactionId || `JKH-${uuid().slice(0, 12).toUpperCase()}`,
    status: 'success',
    currency: paymentInput?.currency || 'INR',
    stripeSessionId: paymentInput?.stripeSessionId,
    stripePaymentIntentId: paymentInput?.stripePaymentIntentId
  });

  const appointment = await Appointment.create({
    patient: user._id,
    doctor: doctor._id,
    appointmentDate: normalizedAppointmentDate,
    slotId,
    slotLabel: token.slot.label,
    tokenNumber: token.tokenNumber,
    queuePosition: token.queuePosition,
    estimatedWaitMinutes: token.estimatedWaitMinutes,
    patientDetails: { ...patientDetails, email: user.email },
    payment: paid._id,
    invoiceNumber: `INV-${Date.now()}`
  });

  paid.appointment = appointment._id;
  await paid.save();

  const populated = await Appointment.findById(appointment._id).populate('doctor').populate('payment');
  const invoiceBuffer = await createInvoiceBuffer(populated, paid);
  await sendAppointmentEmail(user.email, populated);
  await sendMail({
    to: user.email,
    subject: 'JK Hospital Invoice',
    html: '<p>Your appointment invoice is attached.</p>',
    attachments: [{ filename: `${appointment.invoiceNumber}.pdf`, content: invoiceBuffer }]
  });

  await Notification.create({
    user: user._id,
    title: 'Appointment confirmed',
    message: `Token ${appointment.tokenNumber} confirmed with ${doctor.name}.`,
    type: 'appointment'
  });

  return populated;
};

export const createAppointment = asyncHandler(async (req, res) => {
  if (process.env.ALLOW_MANUAL_PAYMENT_PROOFS !== 'true') {
    const error = new Error('Online payment is required before booking this appointment');
    error.statusCode = 402;
    throw error;
  }

  const populated = await createConfirmedAppointment({
    user: req.user,
    doctorId: req.body.doctorId,
    slotId: req.body.slotId,
    appointmentDate: req.body.appointmentDate,
    patientDetails: req.body.patientDetails,
    paymentInput: {
      transactionId: req.body.transactionId || `JKH-${uuid().slice(0, 12).toUpperCase()}`
    }
  });

  res.status(201).json({ appointment: populated, invoiceReady: true });
});

export const myAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user._id })
    .populate('doctor')
    .populate('payment')
    .sort({ appointmentDate: -1, createdAt: -1 });
  res.json({ appointments });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id }).populate('doctor');
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }
  appointment.status = 'cancelled';
  appointment.cancellation = {
    reason: req.body.reason,
    emergencyExplanation: req.body.emergencyExplanation,
    cancelledAt: new Date()
  };
  await appointment.save();
  await sendStatusEmail(req.user.email, 'JK Hospital Appointment Cancelled', 'Your appointment was cancelled. You may submit a refund request from your dashboard.');
  res.json({ appointment });
});

export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  const doctor = await Doctor.findById(req.body.doctorId || appointment?.doctor);
  if (!appointment || !doctor) {
    const error = new Error('Appointment or doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const appointmentDate = normalizeAppointmentDate(req.body.appointmentDate);
  const token = await allocateToken(doctor, appointmentDate, req.body.slotId);
  appointment.doctor = doctor._id;
  appointment.appointmentDate = appointmentDate;
  appointment.slotId = req.body.slotId;
  appointment.slotLabel = token.slot.label;
  appointment.tokenNumber = token.tokenNumber;
  appointment.queuePosition = token.queuePosition;
  appointment.estimatedWaitMinutes = token.estimatedWaitMinutes;
  appointment.status = 'rescheduled';
  await appointment.save();
  res.json({ appointment });
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id })
    .populate('doctor')
    .populate('payment');
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  const buffer = await createInvoiceBuffer(appointment, appointment.payment);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${appointment.invoiceNumber}.pdf"`);
  res.send(buffer);
});
