import { doctors as baseDoctors } from '../data/demoData.js';
import { normalizeFee } from './paymentRules.js';
import { migratePlainKey, secureGet, secureSet } from './secureStore.js';

const DOCTORS_KEY = 'jk_local_doctors';
const BOOKINGS_KEY = 'jk_local_bookings';
const MEDICAL_RECORDS_KEY = 'jk_medical_records';
const VERSION_KEY = 'jk_local_version';
const STORE_VERSION = '6';

let doctorsCache = null;
let bookingsCache = null;
let hydrated = false;

const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const isPlaceholderDoctor = (doctor) =>
  doctor?.name === 'Dr. New Doctor' ||
  doctor?.bio === 'Add a short doctor profile for patients.';

const normalizeSlot = (slot, doctorFee) => ({
  ...slot,
  _id: slot._id || makeId('slot'),
  label: slot.label || 'Consultation slot',
  startTime: slot.startTime || '09:00',
  endTime: slot.endTime || '10:00',
  tokenLimit: Math.max(Number(slot.tokenLimit ?? 10), 0),
  bookedTokens: Math.min(Math.max(Number(slot.bookedTokens ?? 0), 0), Math.max(Number(slot.tokenLimit ?? 10), 0)),
  fee: normalizeFee(slot.fee, doctorFee),
  isActive: slot.isActive ?? true,
  date: slot.date || '',
  availableFrom: slot.availableFrom || '',
  availableUntil: slot.availableUntil || '',
  advanceBookingMinutes: Math.max(Number(slot.advanceBookingMinutes ?? 60), 0)
});

const normalizeDoctor = (doctor) => ({
  ...doctor,
  _id: doctor._id || makeId('doc'),
  name: doctor.name || 'Unnamed doctor',
  specialty: doctor.specialty || 'General Physician',
  bio: doctor.bio || 'Patient-focused healthcare professional.',
  avatar: doctor.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
  fee: normalizeFee(doctor.fee),
  isAvailable: doctor.isAvailable ?? true,
  slots: (doctor.slots?.length ? doctor.slots : []).map((slot) => normalizeSlot(slot, doctor.fee))
});

const seedDoctors = () => clone(baseDoctors).map(normalizeDoctor);

export const hydrateLocalStore = async () => {
  if (hydrated) return;
  await migratePlainKey(DOCTORS_KEY);
  await migratePlainKey(BOOKINGS_KEY);

  if (localStorage.getItem(VERSION_KEY) !== STORE_VERSION) {
    await secureRemoveKeys();
    localStorage.setItem(VERSION_KEY, STORE_VERSION);
  }

  doctorsCache = ((await secureGet(DOCTORS_KEY))?.map(normalizeDoctor) || seedDoctors()).filter((doctor) => !isPlaceholderDoctor(doctor));
  bookingsCache = (await secureGet(BOOKINGS_KEY)) || [];
  await persistDoctors();
  await persistBookings();
  hydrated = true;
};

const secureRemoveKeys = async () => {
  localStorage.removeItem(DOCTORS_KEY);
  localStorage.removeItem(BOOKINGS_KEY);
};

const persistDoctors = async () => {
  await secureSet(DOCTORS_KEY, doctorsCache);
  window.dispatchEvent(new Event('jk-local-sync'));
};

const persistBookings = async () => {
  await secureSet(BOOKINGS_KEY, bookingsCache);
  window.dispatchEvent(new Event('jk-local-sync'));
};

export const getLocalDoctors = () => {
  if (!doctorsCache) doctorsCache = seedDoctors();
  return doctorsCache;
};

export const saveLocalDoctors = (doctors) => {
  doctorsCache = doctors.map(normalizeDoctor).filter((doctor) => !isPlaceholderDoctor(doctor));
  void persistDoctors();
};

export const getLocalBookings = () => bookingsCache || [];

export const getLocalBookingsForUser = (email) =>
  getLocalBookings().filter((item) => normalizeEmail(item.patientEmail || item.patientDetails?.email) === normalizeEmail(email));

export const saveLocalBookings = (bookings) => {
  bookingsCache = bookings;
  void persistBookings();
};

export const findBookingByTransaction = (transactionId) =>
  getLocalBookings().find((item) => item.payment?.transactionId === transactionId);

export const saveLocalDoctor = (doctorInput) => {
  const doctor = normalizeDoctor(doctorInput);
  const doctors = getLocalDoctors();
  const exists = doctors.some((item) => item._id === doctor._id);
  const nextDoctors = exists ? doctors.map((item) => (item._id === doctor._id ? doctor : item)) : [doctor, ...doctors];
  saveLocalDoctors(nextDoctors);
  return doctor;
};

export const createLocalDoctor = (doctorInput) =>
  saveLocalDoctor({
    _id: makeId('doc'),
    slots: [],
    ...doctorInput
  });

export const removeLocalDoctor = (doctorId) => {
  const nextDoctors = getLocalDoctors().filter((doctor) => doctor._id !== doctorId);
  saveLocalDoctors(nextDoctors);
  return nextDoctors;
};

export const saveLocalSlot = (doctorId, slotInput) => {
  const doctors = getLocalDoctors();
  const nextDoctors = doctors.map((doctor) => {
    if (doctor._id !== doctorId) return doctor;
    const slot = normalizeSlot(slotInput, doctor.fee);
    const exists = doctor.slots.some((item) => item._id === slot._id);
    return {
      ...doctor,
      slots: exists ? doctor.slots.map((item) => (item._id === slot._id ? slot : item)) : [...doctor.slots, slot]
    };
  });
  saveLocalDoctors(nextDoctors);
  return nextDoctors.find((doctor) => doctor._id === doctorId);
};

export const createLocalSlot = (doctorId, slotInput) =>
  saveLocalSlot(doctorId, {
    _id: makeId('slot'),
    ...slotInput,
    bookedTokens: 0,
  });

const normalizeBookingDate = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = normalizeBookingDate(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const slotDateTime = (date, time = '00:00') => {
  const value = normalizeBookingDate(date);
  const [hours = 0, minutes = 0] = String(time).split(':').map(Number);
  value.setHours(hours, minutes, 0, 0);
  return value;
};

export const getSlotBookingPolicy = (slot, date, now = new Date()) => {
  const day = normalizeBookingDate(date);
  const today = normalizeBookingDate(now);
  const availableFrom = slot?.availableFrom ? normalizeBookingDate(slot.availableFrom) : null;
  const availableUntil = slot?.availableUntil ? endOfDay(slot.availableUntil) : null;
  const advanceBookingMinutes = Math.max(Number(slot?.advanceBookingMinutes ?? 60), 0);
  const latestSameDayBookingAt = new Date(slotDateTime(day, slot?.startTime).getTime() - advanceBookingMinutes * 60 * 1000);
  const reasons = [];

  if (day < today) reasons.push('Booking date cannot be in the past');
  if (availableFrom && day < availableFrom) reasons.push('This slot is not available yet');
  if (availableUntil && day > availableUntil) reasons.push('This slot is not available for this future date');
  if (day.getTime() === today.getTime() && now > latestSameDayBookingAt) {
    reasons.push(`Book at least ${advanceBookingMinutes} minutes before this slot starts`);
  }

  return {
    isBookable: reasons.length === 0,
    reasons,
    availableFrom,
    availableUntil,
    advanceBookingMinutes,
    latestSameDayBookingAt
  };
};

export const createVerifiedLocalBooking = ({ doctor, slot, date, patient, user, payment }) => {
  if (payment?.status !== 'success' || (!payment?.stripeSessionId && !payment?.razorpayPaymentId)) {
    throw new Error('Verified online payment is required');
  }
  if (findBookingByTransaction(payment.transactionId)) {
    return findBookingByTransaction(payment.transactionId);
  }

  const doctors = getLocalDoctors();
  const doctorIndex = doctors.findIndex((item) => item._id === doctor._id);
  const slotIndex = doctors[doctorIndex]?.slots.findIndex((item) => item._id === slot._id);
  const liveDoctor = doctors[doctorIndex];
  const liveSlot = liveDoctor?.slots[slotIndex];
  if (!liveDoctor || !liveSlot) throw new Error('Slot not found');
  const policy = getSlotBookingPolicy(liveSlot, date);
  if (!policy.isBookable) throw new Error(policy.reasons[0]);

  const bookedTokens = liveSlot.bookedTokens || 0;
  const remaining = Math.max(liveSlot.tokenLimit - bookedTokens, 0);
  if (remaining <= 0) throw new Error('Selected slot is full');

  const tokenNumber = bookedTokens + 1;
  doctors[doctorIndex].slots[slotIndex].bookedTokens = tokenNumber;
  saveLocalDoctors(doctors);

  const booking = {
    _id: `APT-${Date.now()}`,
    patientId: `PAT-${String(Date.now()).slice(-6)}`,
    patientEmail: user?.email,
    patientName: patient.name || user?.name,
    doctor: liveDoctor,
    slotId: slot._id,
    slotLabel: liveSlot.label,
    appointmentDate: date,
    tokenNumber,
    requestedPosition: tokenNumber,
    queuePosition: tokenNumber,
    estimatedWaitMinutes: Math.max(tokenNumber - 1, 0) * 8,
    status: 'approved',
    adminNote: `${payment.method === 'razorpay' ? 'Razorpay' : 'Stripe'} payment verified automatically`,
    patientDetails: { ...patient, email: user?.email },
    payment,
    invoiceNumber: `INV-${Date.now()}`,
    createdAt: new Date().toISOString(),
    timeline: [
      { label: `${payment.method === 'razorpay' ? 'Razorpay' : 'Stripe'} payment verified`, at: new Date().toISOString(), tone: 'green' },
      { label: 'Appointment auto-confirmed', at: new Date().toISOString(), tone: 'green' }
    ]
  };

  saveLocalBookings([booking, ...getLocalBookings()]);
  return booking;
};

export const updateLocalBookingStatus = (id, status, adminNote = '') => {
  let acceptedTokenNumber = null;
  const target = getLocalBookings().find((booking) => booking._id === id);
  if (target?.status === 'approved' && status !== 'approved') {
    const doctors = getLocalDoctors();
    const doctorIndex = doctors.findIndex((doctor) => doctor._id === target?.doctor?._id);
    const slotIndex = doctors[doctorIndex]?.slots.findIndex((slot) => slot._id === target?.slotId);
    if (doctorIndex >= 0 && slotIndex >= 0) {
      doctors[doctorIndex].slots[slotIndex].bookedTokens = Math.max((doctors[doctorIndex].slots[slotIndex].bookedTokens || 1) - 1, 0);
      saveLocalDoctors(doctors);
    }
  }
  if (status === 'approved') {
    if (target?.status === 'approved') {
      acceptedTokenNumber = target.tokenNumber;
    } else {
      const doctors = getLocalDoctors();
      const doctorIndex = doctors.findIndex((doctor) => doctor._id === target?.doctor?._id);
      const slotIndex = doctors[doctorIndex]?.slots.findIndex((slot) => slot._id === target?.slotId);
      if (doctorIndex >= 0 && slotIndex >= 0) {
        acceptedTokenNumber = (doctors[doctorIndex].slots[slotIndex].bookedTokens || 0) + 1;
        doctors[doctorIndex].slots[slotIndex].bookedTokens = acceptedTokenNumber;
        saveLocalDoctors(doctors);
      }
    }
  }
  const bookings = getLocalBookings().map((booking) =>
    booking._id === id
      ? {
          ...booking,
          status,
          tokenNumber: acceptedTokenNumber || booking.tokenNumber,
          queuePosition: acceptedTokenNumber || booking.queuePosition,
          estimatedWaitMinutes: acceptedTokenNumber ? Math.max(acceptedTokenNumber - 1, 0) * 8 : booking.estimatedWaitMinutes,
          adminNote,
          payment: { ...booking.payment, status: status === 'approved' ? 'verified' : 'declined' },
          timeline: [
            ...(booking.timeline || []),
            { label: `Appointment ${status}`, at: new Date().toISOString(), tone: status === 'approved' ? 'green' : 'rose' }
          ]
        }
      : booking
  );
  saveLocalBookings(bookings);
  return bookings.find((booking) => booking._id === id);
};

export const cancelLocalBooking = (id) => {
  const bookings = getLocalBookings();
  const booking = bookings.find((item) => item._id === id);
  if (booking?.status === 'approved') {
    const doctors = getLocalDoctors();
    const doctorIndex = doctors.findIndex((item) => item._id === booking.doctor._id);
    const slotIndex = doctors[doctorIndex]?.slots.findIndex((item) => item._id === booking.slotId);
    if (doctorIndex >= 0 && slotIndex >= 0) {
      doctors[doctorIndex].slots[slotIndex].bookedTokens = Math.max((doctors[doctorIndex].slots[slotIndex].bookedTokens || 1) - 1, 0);
      saveLocalDoctors(doctors);
    }
  }
  const updated = bookings.map((item) => (item._id === id ? { ...item, status: 'cancelled', adminNote: 'Cancelled by patient' } : item));
  saveLocalBookings(updated);
  return updated;
};

export const getLocalRefunds = () => JSON.parse(localStorage.getItem('jk_refunds') || '[]');

export const getLocalRefundsForUser = (email) =>
  getLocalRefunds().filter((item) => normalizeEmail(item.email) === normalizeEmail(email));

export const saveLocalRefund = ({ email, appointmentId, reason, emergencyExplanation }) => {
  const refunds = getLocalRefunds();
  const entry = {
    _id: `REF-${Date.now()}`,
    email: normalizeEmail(email),
    appointmentId,
    reason,
    emergencyExplanation,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('jk_refunds', JSON.stringify([entry, ...refunds]));
  window.dispatchEvent(new Event('jk-local-sync'));
  return entry;
};

export const updateLocalRefundStatus = (id, status, adminNote = '') => {
  const refunds = getLocalRefunds().map((item) =>
    item._id === id ? { ...item, status, adminNote, updatedAt: new Date().toISOString() } : item
  );
  localStorage.setItem('jk_refunds', JSON.stringify(refunds));
  window.dispatchEvent(new Event('jk-local-sync'));
  return refunds.find((item) => item._id === id);
};

export const getLocalMedicalRecords = () => JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY) || '[]');

export const getLocalMedicalRecordsForUser = (email) =>
  getLocalMedicalRecords().filter((item) => normalizeEmail(item.email) === normalizeEmail(email));

export const saveLocalMedicalRecord = ({ email, type, title, sourceText, aiSummary }) => {
  const records = getLocalMedicalRecords();
  const entry = {
    _id: `REC-${Date.now()}`,
    email: normalizeEmail(email),
    type: type || 'report',
    title: title || 'AI medical summary',
    sourceText,
    aiSummary,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([entry, ...records]));
  window.dispatchEvent(new Event('jk-local-sync'));
  return entry;
};

export const getSlotAvailability = (doctor, slotId, date) => {
  const slot = doctor?.slots?.find((item) => item._id === slotId);
  if (!slot || slot.isActive === false || !doctor?.isAvailable) {
    return { slot, booked: 0, remaining: 0, isFull: true, isBookable: false, fee: doctor?.fee || 500, reasons: ['Slot is unavailable'] };
  }
  if (slot.date && slot.date !== date) {
    return { slot, booked: 0, remaining: 0, isFull: true, isBookable: false, fee: slot.fee ?? doctor.fee, reasons: ['Slot is not active on this date'] };
  }
  const policy = getSlotBookingPolicy(slot, date);
  const booked = slot.bookedTokens || 0;
  const remaining = Math.max((slot.tokenLimit || 0) - booked, 0);
  return {
    slot,
    booked,
    remaining,
    isFull: remaining <= 0 || !policy.isBookable,
    isBookable: policy.isBookable,
    reasons: policy.reasons,
    bookingPolicy: policy,
    fee: normalizeFee(slot.fee, doctor.fee),
    estimatedWaitMinutes: Math.max(booked, 0) * 8
  };
};
