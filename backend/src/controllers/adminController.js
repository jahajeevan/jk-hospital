import bcrypt from 'bcryptjs';
import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { sendStatusEmail } from '../services/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const pickDefined = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));

const doctorDbInput = (input = {}) => pickDefined({
  name: input.name,
  specialty: input.specialty || input.specialization || input.department || 'General Medicine',
  bio: input.bio,
  fee: input.fee,
  avatar: input.avatar,
  isAvailable: input.isAvailable,
  unavailableDates: input.unavailableDates
});

const extendedDoctorDbInput = (input = {}) => pickDefined({
  ...doctorDbInput(input),
  department: input.department || input.specialty || input.specialization,
  specialization: input.specialization || input.specialty || input.department,
  qualification: input.qualification,
  experience: input.experience
});

const isMissingColumnError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`;
  return error?.code === '42703' || error?.code === 'PGRST204' || /column .* does not exist/i.test(message);
};

const writeDoctor = async ({ id, body, insert = false }) => {
  const write = async (payload) => {
    const query = insert
      ? supabase.from('doctors').insert(toSnakeObj(payload))
      : supabase.from('doctors').update(toSnakeObj(payload)).eq('id', id);
    return query.select('*');
  };

  const extended = extendedDoctorDbInput(body);
  let result = await write(extended);
  if (result.error && isMissingColumnError(result.error)) {
    result = await write(doctorDbInput(body));
  }
  return result;
};

const slotDbInput = (input = {}, doctorId) => pickDefined({
  doctorId,
  label: input.label,
  startTime: input.startTime,
  endTime: input.endTime,
  tokenLimit: input.tokenLimit,
  fee: input.fee,
  isActive: input.isActive,
  availableFrom: input.availableFrom || null,
  availableUntil: input.availableUntil || null,
  advanceBookingMinutes: input.advanceBookingMinutes
});

export const overview = asyncHandler(async (_req, res) => {
  const [
    { count: appointments },
    { count: patients },
    { count: refunds },
    { data: paymentsData }
  ] = await Promise.all([
    supabase.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient').is('deleted_at', null),
    supabase.from('refund_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('payments').select('amount, transaction_id').eq('status', 'success').is('deleted_at', null)
  ]);

  let consultationRevenue = 0;
  let pharmacyRevenue = 0;
  for (const p of paymentsData || []) {
    if (p.transaction_id?.startsWith('PHARM-')) {
      pharmacyRevenue += Number(p.amount || 0);
    } else {
      consultationRevenue += Number(p.amount || 0);
    }
  }
  const revenue = consultationRevenue + pharmacyRevenue;

  // doctorOccupancy
  const { data: apts } = await supabase
    .from('appointments')
    .select('doctor_id, doctor:doctors(name)')
    .not('status', 'in', '("cancelled","rejected")')
    .is('deleted_at', null);

  const occupancyMap = {};
  for (const apt of apts || []) {
    const docName = apt.doctor?.name || 'Unknown';
    occupancyMap[docName] = (occupancyMap[docName] || 0) + 1;
  }
  const doctorOccupancy = Object.entries(occupancyMap).map(([name, count]) => ({ name, count }));

  // dailyBookings
  const { data: createdApts } = await supabase
    .from('appointments')
    .select('created_at')
    .is('deleted_at', null);

  const dailyMap = {};
  for (const apt of createdApts || []) {
    const dateStr = new Date(apt.created_at).toISOString().slice(0, 10);
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
  }
  const dailyBookings = Object.entries(dailyMap)
    .map(([_id, count]) => ({ _id, count }))
    .sort((a, b) => a._id.localeCompare(b._id))
    .slice(0, 14);

  res.json({
    stats: {
      appointments: appointments || 0,
      patients: patients || 0,
      pendingRefunds: refunds || 0,
      revenue,
      consultationRevenue,
      pharmacyRevenue
    },
    doctorOccupancy,
    dailyBookings
  });
});

export const allBookings = asyncHandler(async (_req, res) => {
  const { data: appointmentsData } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(*), patient:users(*), payment:payments(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  res.json({ appointments: toCamelObj(appointmentsData) || [] });
});

export const upsertDoctor = asyncHandler(async (req, res) => {
  const slots = req.body.slots || [];
  const { email, password } = req.body;
  const bodyCopy = doctorDbInput(req.body);

  let doctor;
  if (req.params.id) {
    // UPDATE existing doctor
    const { data: docList, error: docErr } = await writeDoctor({ id: req.params.id, body: req.body });
    if (docErr) throw docErr;
    doctor = toCamelObj(docList?.[0]);
  } else {
    // CREATE new doctor + user account
    const { data: docList, error: docErr } = await writeDoctor({ body: req.body, insert: true });
    if (docErr) throw docErr;
    doctor = toCamelObj(docList?.[0]);

    // Create doctor user account for login
    if (email && password) {
      const hashedPassword = await hashPassword(password);
      const { error: userErr } = await supabase
        .from('users')
        .insert(toSnakeObj({
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          name: bodyCopy.name,
          role: 'doctor',
          isVerified: true,
          passwordChangedAt: new Date()
        }));

      if (userErr && userErr.code !== '23505') { // 23505 = unique constraint (email exists)
        throw userErr;
      }
    }
  }

  // Slot create/update/delete is handled by dedicated endpoints so profile edits cannot damage slot rows.
  if (!req.params.id && slots.length && doctor?.id) {
    const slotsToInsert = slots.map((s) => {
      const mapped = toSnakeObj(slotDbInput(s, doctor.id));
      if (s.id || s._id) mapped.id = s.id || s._id;
      return mapped;
    });
    const { error: slotsErr } = await supabase
      .from('doctor_slots')
      .upsert(slotsToInsert, { onConflict: 'id' });

    if (slotsErr) {
      console.error('DOCTOR SLOT ERROR:', slotsErr);
      console.error('SLOTS BEING INSERTED:', slotsToInsert);
      throw slotsErr;
    }
  }

  // Fetch full populated doctor with slots
  const { data: fullDoc } = await supabase
    .from('doctors')
    .select('*, slots:doctor_slots(*)')
    .eq('id', doctor.id)
    .limit(1);

  res.status(req.params.id ? 200 : 201).json({ doctor: toCamelObj(fullDoc?.[0]) });
});

export const createDoctorSlot = asyncHandler(async (req, res) => {
  const { data: doctors } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .limit(1);
  if (!doctors?.[0]) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const slotInput = slotDbInput(req.body, req.params.id);
  const { data: slots, error } = await supabase
    .from('doctor_slots')
    .insert(toSnakeObj(slotInput))
    .select('*');
  if (error) throw error;

  res.status(201).json({ slot: toCamelObj(slots?.[0]) });
});

export const updateDoctorSlot = asyncHandler(async (req, res) => {
  const slotInput = slotDbInput(req.body, req.params.id);
  delete slotInput.doctorId;

  const { data: slots, error } = await supabase
    .from('doctor_slots')
    .update(toSnakeObj(slotInput))
    .eq('id', req.params.slotId)
    .eq('doctor_id', req.params.id)
    .select('*');
  if (error) throw error;
  if (!slots?.[0]) {
    const notFound = new Error('Slot not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  res.json({ slot: toCamelObj(slots[0]) });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  // Delete doctor slots
  await supabase.from('doctor_slots').delete().eq('doctor_id', req.params.id);

  // Delete doctor
  const { error } = await supabase.from('doctors').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Doctor and associated data deleted' });
});

export const deleteSlot = asyncHandler(async (req, res) => {
  const { slotId } = req.params;
  const { error } = await supabase.from('doctor_slots').delete().eq('id', slotId);
  if (error) throw error;
  res.json({ message: 'Slot deleted' });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { data: apts, error: updateError } = await supabase
    .from('appointments')
    .update(toSnakeObj({ status: req.body.status }))
    .eq('id', req.params.id)
    .select('*, patient:users(*)');

  if (updateError) throw updateError;
  const appointment = toCamelObj(apts?.[0]);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  await sendStatusEmail(appointment.patient.email, `JK Hospital Appointment ${appointment.status}`, `Your appointment status is now ${appointment.status}.`);
  res.json({ appointment });
});

export const markDoctorLeave = asyncHandler(async (req, res) => {
  const { data: doctors } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .limit(1);

  const doctor = toCamelObj(doctors?.[0]);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const leaveDate = new Date(req.body.date || Date.now());
  const unavailableDates = doctor.unavailableDates || [];
  const dateStr = leaveDate.toISOString().slice(0, 10);
  if (!unavailableDates.includes(dateStr)) {
    unavailableDates.push(dateStr);
  }

  const { data: docList, error: updateErr } = await supabase
    .from('doctors')
    .update(toSnakeObj({
      isAvailable: false,
      unavailableDates
    }))
    .eq('id', doctor.id)
    .select('*');

  if (updateErr) throw updateErr;

  const { data: affectedApts } = await supabase
    .from('appointments')
    .select('*, patient:users(*)')
    .eq('doctor_id', doctor.id)
    .eq('appointment_date', dateStr)
    .in('status', ['confirmed', 'approved', 'rescheduled'])
    .is('deleted_at', null);

  const affected = toCamelObj(affectedApts) || [];

  await Promise.all(
    affected.map((appointment) =>
      sendStatusEmail(appointment.patient.email, 'Doctor Unavailable Notification', `${doctor.name} is unavailable for your selected appointment. Please reschedule from your dashboard.`)
    )
  );

  res.json({ doctor: toCamelObj(docList?.[0]), affectedPatients: affected.length });
});
