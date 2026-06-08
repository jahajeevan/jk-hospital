import { v4 as uuid } from 'uuid';
import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { sendAppointmentEmail, sendMail, sendStatusEmail } from '../services/emailService.js';
import { createInvoiceBuffer } from '../services/invoiceService.js';
import { allocateToken, normalizeAppointmentDate } from '../services/tokenService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HOSPITAL } from '../utils/constants.js';

const getSlotFee = (doctor, slotId) => {
  const slot = doctor.slots?.find((s) => String(s._id || s.id) === String(slotId));
  return slot?.fee ?? doctor.fee ?? HOSPITAL.consultationFee;
};

export const createConfirmedAppointment = async ({ user, doctorId, slotId, appointmentDate, patientDetails, payment, paymentInput }) => {
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

  const normalizedAppointmentDate = normalizeAppointmentDate(appointmentDate);
  
  const { data: duplicates } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', user._id)
    .eq('doctor_id', doctor._id)
    .eq('appointment_date', normalizedAppointmentDate.toISOString().slice(0, 10))
    .eq('slot_id', slotId)
    .not('status', 'in', '("cancelled","rejected")')
    .is('deleted_at', null)
    .limit(1);

  const duplicate = toCamelObj(duplicates?.[0]);
  if (duplicate) {
    const error = new Error('Duplicate booking for this doctor, date, and slot is not allowed');
    error.statusCode = 409;
    throw error;
  }

  const token = await allocateToken(doctor, normalizedAppointmentDate, slotId);
  
  let paid = payment;
  if (!paid) {
    const { data: newPayments, error: paymentError } = await supabase
      .from('payments')
      .insert(toSnakeObj({
        patientId: user._id,
        amount: paymentInput?.amount || getSlotFee(doctor, slotId),
        method: paymentInput?.method || 'upi',
        upiId: HOSPITAL.upiId,
        transactionId: paymentInput?.transactionId || `JKH-${uuid().slice(0, 12).toUpperCase()}`,
        status: 'success',
        currency: paymentInput?.currency || 'INR',
        stripeSessionId: paymentInput?.stripeSessionId,
        stripePaymentIntentId: paymentInput?.stripePaymentIntentId
      }))
      .select('*');

    if (paymentError) throw paymentError;
    paid = toCamelObj(newPayments?.[0]);
  }

  const { data: newAppointments, error: appointmentError } = await supabase
    .from('appointments')
    .insert(toSnakeObj({
      patientId: user._id,
      doctorId: doctor._id,
      appointmentDate: normalizedAppointmentDate.toISOString().slice(0, 10),
      slotId,
      slotLabel: token.slot.label,
      tokenNumber: token.tokenNumber,
      queuePosition: token.queuePosition,
      estimatedWaitMinutes: token.estimatedWaitMinutes,
      patientDetails: { ...patientDetails, email: user.email },
      paymentId: paid._id,
      invoiceNumber: `INV-${Date.now()}`
    }))
    .select('*');

  if (appointmentError) throw appointmentError;
  const appointment = toCamelObj(newAppointments?.[0]);

  // Backlink appointment to payment
  await supabase
    .from('payments')
    .update({ appointment_id: appointment._id })
    .eq('id', paid._id);

  // Fetch populated appointment
  const { data: populatedData } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(*), payment:payments(*)')
    .eq('id', appointment._id)
    .limit(1);

  const populated = toCamelObj(populatedData?.[0]);
  const invoiceBuffer = await createInvoiceBuffer(populated, paid);
  
  await sendAppointmentEmail(user.email, populated);
  await sendMail({
    to: user.email,
    subject: 'JK Hospital Invoice',
    html: '<p>Your appointment invoice is attached.</p>',
    attachments: [{ filename: `${appointment.invoiceNumber}.pdf`, content: invoiceBuffer }]
  });

  await supabase
    .from('notifications')
    .insert(toSnakeObj({
      user: user._id,
      title: 'Appointment confirmed',
      message: `Token ${appointment.tokenNumber} confirmed with ${doctor.name}.`,
      type: 'appointment'
    }));

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
  const { data: myAptsData } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(*), payment:payments(*)')
    .eq('patient_id', req.user._id)
    .is('deleted_at', null)
    .order('appointment_date', { ascending: false })
    .order('created_at', { ascending: false });

  const appointments = toCamelObj(myAptsData) || [];
  res.json({ appointments });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { data: apts } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(*)')
    .eq('id', req.params.id)
    .eq('patient_id', req.user._id)
    .limit(1);

  let appointment = toCamelObj(apts?.[0]);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  const { data: updatedApts, error: updateError } = await supabase
    .from('appointments')
    .update(toSnakeObj({
      status: 'cancelled',
      cancellation: {
        reason: req.body.reason,
        emergencyExplanation: req.body.emergencyExplanation,
        cancelledAt: new Date()
      }
    }))
    .eq('id', appointment._id)
    .select('*, doctor:doctors(*)');

  if (updateError) throw updateError;
  appointment = toCamelObj(updatedApts?.[0]);

  await sendStatusEmail(req.user.email, 'JK Hospital Appointment Cancelled', 'Your appointment was cancelled. You may submit a refund request from your dashboard.');
  res.json({ appointment });
});

export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { data: apts } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', req.params.id)
    .eq('patient_id', req.user._id)
    .limit(1);
    
  let appointment = toCamelObj(apts?.[0]);
  const doctorId = req.body.doctorId || appointment?.doctor;
  
  const { data: doctors } = await supabase
    .from('doctors')
    .select('*, slots:doctor_slots(*)')
    .eq('id', doctorId)
    .is('deleted_at', null)
    .limit(1);

  const doctor = toCamelObj(doctors?.[0]);
  if (!appointment || !doctor) {
    const error = new Error('Appointment or doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const appointmentDate = normalizeAppointmentDate(req.body.appointmentDate);
  const token = await allocateToken(doctor, appointmentDate, req.body.slotId);

  const { data: updatedApts, error: updateError } = await supabase
    .from('appointments')
    .update(toSnakeObj({
      doctorId: doctor._id,
      appointmentDate: appointmentDate.toISOString().slice(0, 10),
      slotId: req.body.slotId,
      slotLabel: token.slot.label,
      tokenNumber: token.tokenNumber,
      queuePosition: token.queuePosition,
      estimatedWaitMinutes: token.estimatedWaitMinutes,
      status: 'rescheduled'
    }))
    .eq('id', appointment._id)
    .select('*');

  if (updateError) throw updateError;
  res.json({ appointment: toCamelObj(updatedApts?.[0]) });
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const { data: apts } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(*), payment:payments(*)')
    .eq('id', req.params.id)
    .eq('patient_id', req.user._id)
    .limit(1);

  const appointment = toCamelObj(apts?.[0]);
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

const mapMockDoctorId = async (mockId) => {
  if (!mockId) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(mockId)) return mockId;
  
  let name = '';
  if (mockId === 'doc-vijay') name = 'Dr. Vijayakumar';
  else if (mockId === 'doc-jaha') name = 'Dr. Jahajeevan';
  else if (mockId === 'doc-suguna') name = 'Dr. Suguna';
  
  if (name) {
    const { data } = await supabase.from('doctors').select('id').eq('name', name).limit(1);
    if (data?.[0]?.id) return data[0].id;
  }
  
  const { data } = await supabase.from('doctors').select('id').limit(1);
  return data?.[0]?.id || mockId;
};

const mapMockSlotId = async (doctorId, mockSlotId) => {
  if (!mockSlotId) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(mockSlotId)) return mockSlotId;
  
  const { data } = await supabase.from('doctor_slots').select('id').eq('doctor_id', doctorId).limit(1);
  return data?.[0]?.id || mockSlotId;
};

export const syncAppointment = asyncHandler(async (req, res) => {
  const localApt = req.body;
  if (!localApt?._id) {
    const error = new Error('Invalid appointment data for sync');
    error.statusCode = 400;
    throw error;
  }

  const transactionId = localApt.payment?.transactionId || localApt.payment?.transaction_id || `TXN-${localApt._id}`;

  const { data: existingApts } = await supabase
    .from('appointments')
    .select('*, payment:payments(*)')
    .eq('patient_id', req.user._id)
    .is('deleted_at', null);

  const match = existingApts?.find((apt) => 
    apt.id === localApt._id || 
    apt.payment?.transaction_id === transactionId
  );

  if (match) {
    let updatedApt = match;
    const statusChanged = localApt.status && localApt.status !== match.status;
    if (statusChanged) {
      const { data: updatedApts, error: updateError } = await supabase
        .from('appointments')
        .update(toSnakeObj({ status: localApt.status }))
        .eq('id', match.id)
        .select('*');
      if (updateError) throw updateError;
      updatedApt = updatedApts[0];
    }

    if (localApt.pharmacyBill) {
      const billId = localApt.pharmacyBill._id || localApt.pharmacyBill.billNumber;
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', match.id)
        .eq('transaction_id', `PHARM-${billId}`);

      if (!existingPayments || existingPayments.length === 0) {
        await supabase.from('payments').insert(toSnakeObj({
          patientId: req.user._id,
          appointmentId: match.id,
          amount: localApt.pharmacyBill.totalAmount,
          method: 'upi',
          transactionId: `PHARM-${billId}`,
          status: 'success',
          currency: 'INR'
        }));
      }
    }

    return res.json({ success: true, appointment: toCamelObj(updatedApt), msg: 'Already synced and updated' });
  }

  const doctorId = localApt.doctor?._id || localApt.doctorId;
  const slotId = localApt.slotId || localApt.slot?._id;

  const mappedDoctorId = await mapMockDoctorId(doctorId);
  const mappedSlotId = await mapMockSlotId(mappedDoctorId, slotId);

  const { data: newPayments, error: paymentError } = await supabase
    .from('payments')
    .insert(toSnakeObj({
      patientId: req.user._id,
      amount: localApt.payment?.amount || 500,
      method: localApt.payment?.method || 'stripe',
      transactionId,
      status: 'success',
      currency: localApt.payment?.currency || 'INR',
      stripeSessionId: localApt.payment?.stripeSessionId || localApt.payment?.stripe_session_id,
      razorpayOrderId: localApt.payment?.razorpayOrderId || localApt.payment?.razorpay_order_id,
      razorpayPaymentId: localApt.payment?.razorpayPaymentId || localApt.payment?.razorpay_payment_id
    }))
    .select('*');

  if (paymentError) throw paymentError;
  const paid = newPayments?.[0];

  const { data: newAppointments, error: appointmentError } = await supabase
    .from('appointments')
    .insert(toSnakeObj({
      patientId: req.user._id,
      doctorId: mappedDoctorId,
      slotId: mappedSlotId,
      slotLabel: localApt.slotLabel || localApt.slot?.label || 'Consultation slot',
      appointmentDate: localApt.appointmentDate || localApt.date,
      tokenNumber: localApt.tokenNumber || 1,
      queuePosition: localApt.queuePosition || 1,
      estimatedWaitMinutes: localApt.estimatedWaitMinutes || 0,
      patientName: localApt.patientDetails?.name || localApt.patientName,
      patientAge: Number(localApt.patientDetails?.age || localApt.patient?.age || 30),
      patientGender: localApt.patientDetails?.gender || localApt.patient?.gender || 'Male',
      patientPhone: localApt.patientDetails?.phone || localApt.patient?.phone,
      patientEmail: localApt.patientDetails?.email || localApt.patientEmail || req.user.email,
      symptoms: localApt.patientDetails?.symptoms || localApt.patient?.symptoms || 'Consultation',
      status: localApt.status || 'confirmed',
      paymentId: paid.id,
      invoiceNumber: localApt.invoiceNumber || `INV-${Date.now()}`
    }))
    .select('*');

  if (appointmentError) {
    await supabase.from('payments').delete().eq('id', paid.id);
    throw appointmentError;
  }

  const newApt = newAppointments[0];
  await supabase
    .from('payments')
    .update({ appointment_id: newApt.id })
    .eq('id', paid.id);

  if (localApt.pharmacyBill) {
    const billId = localApt.pharmacyBill._id || localApt.pharmacyBill.billNumber;
    await supabase.from('payments').insert(toSnakeObj({
      patientId: req.user._id,
      appointmentId: newApt.id,
      amount: localApt.pharmacyBill.totalAmount,
      method: 'upi',
      transactionId: `PHARM-${billId}`,
      status: 'success',
      currency: 'INR'
    }));
  }

  res.status(201).json({ success: true, appointment: toCamelObj(newApt) });
});

