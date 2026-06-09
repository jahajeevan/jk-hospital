import { DEPARTMENTS } from './localStore.js';

const specialtyDepartmentMap = {
  cardiologist: 'Cardiology',
  cardiology: 'Cardiology',
  dermatologist: 'Dermatology',
  dermatology: 'Dermatology',
  ent: 'ENT',
  'ear nose throat': 'ENT',
  pediatrician: 'Pediatrics',
  paediatrician: 'Pediatrics',
  pediatrics: 'Pediatrics',
  paediatrics: 'Pediatrics',
  orthopedics: 'Orthopedics',
  orthopedic: 'Orthopedics',
  orthopaedics: 'Orthopedics',
  gynecology: 'Gynecology',
  gynaecology: 'Gynecology',
  gynecologist: 'Gynecology',
  psychiatrist: 'Psychiatry',
  psychiatry: 'Psychiatry',
  neurologist: 'General Medicine',
  neurology: 'General Medicine',
  'general medicine': 'General Medicine'
};

const canonicalDepartment = (value) => {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const exact = DEPARTMENTS.find((department) => department.toLowerCase() === clean.toLowerCase());
  if (exact) return exact;
  return specialtyDepartmentMap[clean.toLowerCase()] || '';
};

export const getDoctorDepartment = (doctor = {}) => {
  return (
    canonicalDepartment(doctor.specialty) ||
    canonicalDepartment(doctor.specialization) ||
    canonicalDepartment(doctor.department) ||
    doctor.department ||
    doctor.specialty ||
    'General Medicine'
  );
};

export const normalizeDoctor = (doctor = {}) => {
  const specialty = doctor.specialty || doctor.specialization || doctor.department || 'General Medicine';
  const department = getDoctorDepartment({ ...doctor, specialty });
  const slots = Array.isArray(doctor.slots)
    ? doctor.slots.map((slot) => ({
        ...slot,
        _id: slot._id || slot.id,
        id: slot.id || slot._id,
        tokenLimit: Number(slot.tokenLimit ?? 0),
        bookedTokens: Number(slot.bookedTokens ?? 0),
        walkInTokenLimit: Number(slot.walkInTokenLimit ?? 0),
        walkInBookedTokens: Number(slot.walkInBookedTokens ?? 0),
        advanceBookingMinutes: Number(slot.advanceBookingMinutes ?? 60),
        fee: slot.fee ?? doctor.fee,
        isActive: slot.isActive !== false
      }))
    : [];

  return {
    ...doctor,
    _id: doctor._id || doctor.id,
    id: doctor.id || doctor._id,
    specialty,
    specialization: doctor.specialization || specialty,
    department,
    qualification: doctor.qualification || 'MBBS, MD',
    experience: doctor.experience || '',
    slots
  };
};

export const normalizeDoctors = (doctors = []) =>
  (Array.isArray(doctors) ? doctors : []).map(normalizeDoctor);
