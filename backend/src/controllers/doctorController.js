import { supabase, toCamelObj } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getSlotAvailability } from '../services/tokenService.js';

export const listDoctors = asyncHandler(async (_req, res) => {
  const { data: doctorsData, error } = await supabase
    .from('doctors')
    .select('*, slots:doctor_slots(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    return res.json({ doctors: [] });
  }

  const doctors = toCamelObj(doctorsData) || [];
  res.json({ doctors });
});

export const getDoctor = asyncHandler(async (req, res) => {
  const { data: doctorData, error } = await supabase
    .from('doctors')
    .select('*, slots:doctor_slots(*)')
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .limit(1);

  const doctor = toCamelObj(doctorData?.[0]);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }
  res.json({ doctor });
});

export const doctorAvailability = asyncHandler(async (req, res) => {
  const { data: doctorData } = await supabase
    .from('doctors')
    .select('*, slots:doctor_slots(*)')
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .limit(1);

  const doctor = toCamelObj(doctorData?.[0]);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const slots = await Promise.all(
    (doctor.slots || []).map((slot) => getSlotAvailability(doctor, req.query.date || new Date(), slot._id))
  );
  res.json({ doctorId: doctor._id, date: req.query.date || new Date().toISOString().slice(0, 10), slots });
});
