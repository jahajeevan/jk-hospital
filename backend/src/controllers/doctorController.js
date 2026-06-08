import { supabase, toCamelObj } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getSlotAvailability } from '../services/tokenService.js';

// Fallback doctors data (same as seeded doctors)
// These are used when Supabase is unavailable
const FALLBACK_DOCTORS = [
  {
    id: 'doc-viji-001',
    name: 'Dr. Viji',
    specialty: 'Cardiology',
    department: 'Cardiology',
    experience: 15,
    qualification: 'MBBS, MD',
    bio: 'Heart disease specialist with 15 years of experience',
    fee: 500,
    is_available: true,
    avatar: null,
    email: 'viji@jkhospital.com',
    phone: '9876543210'
  },
  {
    id: 'doc-jahan-001',
    name: 'Dr. Jahan',
    specialty: 'Neurology',
    department: 'Neurology',
    experience: 12,
    qualification: 'MBBS, MD',
    bio: 'Brain and nervous system specialist with 12 years of experience',
    fee: 500,
    is_available: true,
    avatar: null,
    email: 'jahan@jkhospital.com',
    phone: '9876543211'
  },
  {
    id: 'doc-sugu-001',
    name: 'Dr. Sugu',
    specialty: 'Dermatology',
    department: 'Dermatology',
    experience: 10,
    qualification: 'MBBS, MD',
    bio: 'Skin specialist with 10 years of experience',
    fee: 500,
    is_available: true,
    avatar: null,
    email: 'sugu@jkhospital.com',
    phone: '9876543212'
  }
];

export const listDoctors = asyncHandler(async (_req, res) => {
  try {
    const { data: doctorsData, error } = await supabase
      .from('doctors')
      .select('*, slots:doctor_slots(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error || !doctorsData || doctorsData.length === 0) {
      // Return fallback doctors if DB fails or is empty
      return res.json({ doctors: FALLBACK_DOCTORS });
    }

    const doctors = toCamelObj(doctorsData) || [];
    res.json({ doctors });
  } catch (err) {
    // If Supabase fails, return fallback doctors
    res.json({ doctors: FALLBACK_DOCTORS });
  }
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
