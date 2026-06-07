import { doctors as baseDoctors } from '../data/demoData.js';
import { normalizeFee } from './paymentRules.js';
import { migratePlainKey, secureGet, secureSet } from './secureStore.js';

const DOCTORS_KEY = 'jk_local_doctors';
const BOOKINGS_KEY = 'jk_local_bookings';
const MEDICAL_RECORDS_KEY = 'jk_medical_records';
const INVENTORY_KEY = 'jk_pharmacy_inventory';
const AUDIT_LOG_KEY = 'jk_audit_logs';
const NOTIFICATIONS_KEY = 'jk_notifications';
const VERSION_KEY = 'jk_local_version';
const STORE_VERSION = '6';

export const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Neurology',
  'ENT',
  'Gynecology'
];

let doctorsCache = null;
let bookingsCache = null;
let hydrated = false;

const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const todayLocal = () => {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
};
const isSlotEndedForDate = (slot, date, now = new Date()) => {
  if (date !== todayLocal() || !slot?.endTime) return false;
  const [hours, minutes] = slot.endTime.split(':').map(Number);
  const end = new Date(now);
  end.setHours(hours || 0, minutes || 0, 0, 0);
  return now > end;
};
const seededDoctorProfiles = {
  'doc-vijay': { name: 'Dr Ravi Kumar', email: 'ravi@jkhospital.com', specialization: 'Orthopedics', department: 'Orthopedics' },
  'doc-jaha': { name: 'Dr Priya Sharma', email: 'priya@jkhospital.com', specialization: 'Pediatrics', department: 'Pediatrics' },
  'doc-suguna': { name: 'Dr Arjun Menon', email: 'arjun@jkhospital.com', specialization: 'General Medicine', department: 'General Medicine' }
};
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
  walkInTokenLimit: Math.max(Number(slot.walkInTokenLimit ?? 50), 0),
  walkInBookedTokens: Math.min(Math.max(Number(slot.walkInBookedTokens ?? 0), 0), Math.max(Number(slot.walkInTokenLimit ?? 50), 0)),
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
  name: seededDoctorProfiles[doctor._id]?.name || doctor.name || 'Unnamed doctor',
  email: doctor.email || seededDoctorProfiles[doctor._id]?.email || '',
  specialty: doctor.specialty || doctor.specialization || 'General Physician',
  specialization: seededDoctorProfiles[doctor._id]?.specialization || doctor.specialization || doctor.specialty || 'General Physician',
  qualification: doctor.qualification || 'MBBS',
  department: seededDoctorProfiles[doctor._id]?.department || (DEPARTMENTS.includes(doctor.department) ? doctor.department : 'General Medicine'),
  experience: doctor.experience || '5 years',
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

const getJson = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const setJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('jk-local-sync'));
};

export const writeAuditLog = ({ role = 'system', action, actor = 'JK Hospital', bookingId = '', details = '' }) => {
  const entry = { _id: makeId('AUD'), role, action, actor, bookingId, details, timestamp: new Date().toISOString() };
  setJson(AUDIT_LOG_KEY, [entry, ...getLocalAuditLogs()].slice(0, 250));
  return entry;
};

export const getLocalAuditLogs = () => getJson(AUDIT_LOG_KEY);

export const addLocalNotification = ({ email = '', role = 'all', title, message, type = 'info' }) => {
  const entry = { _id: makeId('NTF'), email: normalizeEmail(email), role, title, message, type, read: false, createdAt: new Date().toISOString() };
  setJson(NOTIFICATIONS_KEY, [entry, ...getLocalNotifications()].slice(0, 250));
  return entry;
};

export const getLocalNotifications = ({ email = '', role = '' } = {}) =>
  getJson(NOTIFICATIONS_KEY).filter((item) => {
    const emailMatch = !email || !item.email || item.email === normalizeEmail(email);
    const roleMatch = !role || item.role === 'all' || item.role === role;
    return emailMatch && roleMatch;
  });

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
    walkInBookedTokens: 0
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
    patientEmail: user?.email || patient.email,
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
    patientDetails: { ...patient, email: user?.email || patient.email },
    payment,
    invoiceNumber: `INV-${Date.now()}`,
    createdAt: new Date().toISOString(),
    timeline: [
      { label: `${payment.method === 'razorpay' ? 'Razorpay' : 'Stripe'} payment verified`, at: new Date().toISOString(), tone: 'green' },
      { label: 'Appointment auto-confirmed', at: new Date().toISOString(), tone: 'green' }
    ]
  };

  saveLocalBookings([booking, ...getLocalBookings()]);
  addLocalNotification({
    email: user?.email,
    title: 'Appointment booked',
    message: `Token #${tokenNumber} booked with ${liveDoctor.name} for ${liveSlot.label}.`,
    type: 'success'
  });
  writeAuditLog({ role: 'patient', actor: user?.email, action: 'Appointment booked', bookingId: booking._id, details: `${liveDoctor.name} · token ${tokenNumber}` });
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
  writeAuditLog({ role: 'admin', action: `Appointment ${status}`, bookingId: id, details: adminNote });
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
  addLocalNotification({ email: booking?.patientEmail, title: 'Appointment cancelled', message: 'Your appointment was cancelled by patient request.', type: 'warning' });
  writeAuditLog({ role: 'patient', actor: booking?.patientEmail, action: 'Cancelled appointment', bookingId: id });
  return updated;
};

const workflowStatusLabels = {
  arrived: 'Patient arrived',
  in_progress: 'Consultation started',
  prescription_generated: 'Prescription generated',
  pharmacy_pending: 'Pharmacy bill pending',
  paid: 'Payment received',
  completed: 'Visit completed',
  no_show: 'No show',
  cancelled_by_hospital: 'Cancelled by hospital'
};

export const updateAppointmentWorkflow = (id, status, { role = 'staff', actor = 'JK Hospital staff', note = '', extra = {} } = {}) => {
  const bookings = getLocalBookings().map((booking) => {
    if (booking._id !== id) return booking;
    return {
      ...booking,
      ...extra,
      status,
      timeline: [
        ...(booking.timeline || []),
        { label: workflowStatusLabels[status] || `Status changed to ${status}`, at: new Date().toISOString(), tone: status === 'completed' ? 'green' : 'blue' }
      ]
    };
  });
  saveLocalBookings(bookings);
  const booking = bookings.find((item) => item._id === id);
  addLocalNotification({
    email: booking?.patientEmail,
    title: workflowStatusLabels[status] || 'Appointment updated',
    message: `${booking?.doctor?.name || 'Doctor'} · token #${booking?.tokenNumber || 'pending'}${note ? ` · ${note}` : ''}`,
    type: status === 'completed' || status === 'paid' ? 'success' : 'info'
  });
  writeAuditLog({ role, actor, action: workflowStatusLabels[status] || `Status ${status}`, bookingId: id, details: note });
  return booking;
};

export const markPatientArrived = (id, receptionistName = 'Receptionist') =>
  updateAppointmentWorkflow(id, 'arrived', {
    role: 'receptionist',
    actor: receptionistName,
    extra: { arrivalTime: new Date().toISOString(), receptionistId: receptionistName }
  });

export const getWalkInSlotAvailability = (doctor, slotId, date = todayLocal(), now = new Date()) => {
  const slot = doctor?.slots?.find((item) => item._id === slotId);
  if (!slot || slot.isActive === false || !doctor?.isAvailable) {
    return { slot, booked: 0, remaining: 0, isFull: true, isOver: false, isBookable: false, reasons: ['Slot is unavailable'] };
  }
  if (slot.date && slot.date !== date) {
    return { slot, booked: 0, remaining: 0, isFull: true, isOver: false, isBookable: false, reasons: ['Slot is not active on this date'] };
  }
  if (slot.availableFrom && date < slot.availableFrom) {
    return { slot, booked: 0, remaining: 0, isFull: true, isOver: false, isBookable: false, reasons: ['Slot is not open for this date'] };
  }
  if (slot.availableUntil && date > slot.availableUntil) {
    return { slot, booked: 0, remaining: 0, isFull: true, isOver: false, isBookable: false, reasons: ['Slot is closed for this date'] };
  }
  const booked = Math.max(Number(slot.walkInBookedTokens || 0), 0);
  const limit = Math.max(Number(slot.walkInTokenLimit ?? 50), 0);
  const remaining = Math.max(limit - booked, 0);
  const isFull = remaining <= 0;
  const isOver = isSlotEndedForDate(slot, date, now);
  const reasons = [
    ...(isFull ? ['Walk-in tokens are full'] : []),
    ...(isOver ? ['Slot time is over'] : [])
  ];
  return { slot, booked, remaining, isFull, isOver, isBookable: !isFull && !isOver, reasons };
};

export const getWalkInSlotOptions = (doctor, date = todayLocal()) =>
  (doctor?.slots || [])
    .filter((slot) => slot.isActive !== false && (!slot.date || slot.date === date))
    .map((slot) => getWalkInSlotAvailability(doctor, slot._id, date));

export const createWalkInBooking = ({ patientName, mobile, doctorId, department, date = todayLocal(), slotId, receptionistName = 'Receptionist' }) => {
  const doctor = getLocalDoctors().find((item) => item._id === doctorId && item.department === department);
  if (!doctor) throw new Error('Select a doctor in the chosen department');
  const availability = getWalkInSlotAvailability(doctor, slotId, date);
  if (!availability.slot) throw new Error('Select a walk-in slot');
  if (!availability.isBookable) throw new Error(availability.reasons.join(', ') || 'This walk-in slot is not available');
  const activeSlot = availability.slot;
  const doctors = getLocalDoctors();
  const doctorIndex = doctors.findIndex((item) => item._id === doctor._id);
  const slotIndex = doctors[doctorIndex]?.slots.findIndex((item) => item._id === activeSlot._id);
  const tokenNumber = (activeSlot.walkInBookedTokens || 0) + 1;
  if (slotIndex >= 0) {
    doctors[doctorIndex].slots[slotIndex].walkInBookedTokens = tokenNumber;
    saveLocalDoctors(doctors);
  }
  const appointmentDate = new Date(`${date}T${activeSlot.startTime || '00:00'}:00`).toISOString();
  const booking = {
    _id: `WALK-${Date.now()}`,
    patientId: `WALK-${String(Date.now()).slice(-6)}`,
    patientEmail: '',
    patientName,
    doctor,
    slotId: activeSlot._id,
    slotLabel: activeSlot.label,
    appointmentDate,
    tokenNumber,
    requestedPosition: tokenNumber,
    queuePosition: tokenNumber,
    estimatedWaitMinutes: Math.max(tokenNumber - 1, 0) * 8,
    status: 'arrived',
    patientDetails: { name: patientName, phone: mobile, department },
    payment: { amount: normalizeFee(activeSlot.fee, doctor.fee), method: 'walk-in', status: 'pending' },
    invoiceNumber: `WALK-INV-${Date.now()}`,
    createdAt: new Date().toISOString(),
    arrivalTime: new Date().toISOString(),
    receptionistId: receptionistName,
    timeline: [{ label: 'Walk-in registered and marked arrived', at: new Date().toISOString(), tone: 'blue' }]
  };
  saveLocalBookings([booking, ...getLocalBookings()]);
  writeAuditLog({ role: 'receptionist', actor: receptionistName, action: 'Created walk-in appointment', bookingId: booking._id, details: `${patientName} · ${doctor.name}` });
  return booking;
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

export const saveLocalMedicalRecord = ({ email, type, title, sourceText, aiSummary, ...extra }) => {
  const records = getLocalMedicalRecords();
  const entry = {
    _id: `REC-${Date.now()}`,
    email: normalizeEmail(email),
    type: type || 'report',
    title: title || 'AI medical summary',
    sourceText,
    aiSummary,
    ...extra,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([entry, ...records]));
  window.dispatchEvent(new Event('jk-local-sync'));
  return entry;
};

const seedInventory = () => [
  { _id: 'med-paracetamol', name: 'Paracetamol 500mg', batchNumber: 'JK-PARA-26A', expiryDate: '2027-04-30', purchasePrice: 1.2, sellingPrice: 3, currentStock: 180, minimumStockLevel: 50 },
  { _id: 'med-amoxicillin', name: 'Amoxicillin 500mg', batchNumber: 'JK-AMOX-26B', expiryDate: '2026-12-31', purchasePrice: 6, sellingPrice: 12, currentStock: 80, minimumStockLevel: 30 },
  { _id: 'med-cetirizine', name: 'Cetirizine 10mg', batchNumber: 'JK-CET-26A', expiryDate: '2027-02-28', purchasePrice: 1, sellingPrice: 4, currentStock: 120, minimumStockLevel: 40 }
];

export const getLocalInventory = () => {
  const current = getJson(INVENTORY_KEY, null);
  if (current) return current;
  setJson(INVENTORY_KEY, seedInventory());
  return getJson(INVENTORY_KEY);
};

export const saveLocalMedicine = (medicine) => {
  const nextMedicine = {
    _id: medicine._id || makeId('MED'),
    name: medicine.name || 'Medicine',
    batchNumber: medicine.batchNumber || '',
    expiryDate: medicine.expiryDate || '',
    purchasePrice: Number(medicine.purchasePrice || 0),
    sellingPrice: Number(medicine.sellingPrice || 0),
    currentStock: Math.max(Number(medicine.currentStock || 0), 0),
    minimumStockLevel: Math.max(Number(medicine.minimumStockLevel || 0), 0)
  };
  const inventory = getLocalInventory();
  const exists = inventory.some((item) => item._id === nextMedicine._id);
  setJson(INVENTORY_KEY, exists ? inventory.map((item) => (item._id === nextMedicine._id ? nextMedicine : item)) : [nextMedicine, ...inventory]);
  return nextMedicine;
};

export const removeLocalMedicine = (id) => {
  setJson(INVENTORY_KEY, getLocalInventory().filter((item) => item._id !== id));
};

const inventoryAlerts = (inventory = getLocalInventory()) =>
  inventory.filter((item) => {
    const expiresSoon = item.expiryDate && new Date(item.expiryDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60;
    return item.currentStock <= item.minimumStockLevel || expiresSoon;
  });

export const getInventoryAlerts = () => inventoryAlerts();

export const savePrescriptionForBooking = ({ bookingId, doctorName = 'Doctor', symptoms, diagnosis, medicines = [], advice = '', followUpRequired = false, followUpDate = '', followUpNotes = '', remarks = '' }) => {
  const prescription = {
    _id: makeId('RX'),
    symptoms,
    diagnosis,
    medicines: medicines.filter((item) => item.name?.trim()),
    advice,
    followUpRequired,
    followUpDate,
    followUpNotes,
    remarks,
    doctorName,
    generatedAt: new Date().toISOString()
  };
  const booking = updateAppointmentWorkflow(bookingId, 'prescription_generated', {
    role: 'doctor',
    actor: doctorName,
    note: diagnosis,
    extra: { prescription, consultationEndTime: new Date().toISOString() }
  });
  addLocalNotification({ email: booking?.patientEmail, title: 'Prescription generated', message: `${doctorName} saved your prescription.`, type: 'success' });
  return booking;
};

export const savePharmacyBillForBooking = ({ bookingId, pharmacistName = 'Pharmacist', items = [], paymentMethod = 'Cash' }) => {
  const inventory = getLocalInventory();
  const billItems = items
    .filter((item) => item.name?.trim() && Number(item.quantity) > 0)
    .map((item) => {
      const quantity = Number(item.quantity);
      const total = Number(item.totalCost ?? (quantity * Number(item.unitPrice || 0)));
      return {
        medicineId: item.medicineId || '',
        name: item.name,
        quantity,
        unitPrice: quantity > 0 ? total / quantity : total,
        total
      };
    });
  const totalAmount = billItems.reduce((sum, item) => sum + item.total, 0);
  const nextInventory = inventory.map((medicine) => {
    const sold = billItems.filter((item) => item.medicineId === medicine._id).reduce((sum, item) => sum + item.quantity, 0);
    return sold ? { ...medicine, currentStock: Math.max(medicine.currentStock - sold, 0) } : medicine;
  });
  setJson(INVENTORY_KEY, nextInventory);
  inventoryAlerts(nextInventory).forEach((medicine) =>
    addLocalNotification({
      role: 'pharmacist',
      title: medicine.currentStock <= medicine.minimumStockLevel ? 'Low stock alert' : 'Expiry alert',
      message: `${medicine.name} needs attention.`,
      type: 'warning'
    })
  );
  const pharmacyBill = {
    _id: makeId('BILL'),
    billNumber: `BILL-${Date.now()}`,
    billDate: new Date().toISOString(),
    items: billItems,
    totalAmount,
    paymentMethod,
    paymentTime: new Date().toISOString(),
    pharmacistName
  };
  const booking = updateAppointmentWorkflow(bookingId, 'completed', {
    role: 'pharmacist',
    actor: pharmacistName,
    note: `Paid by ${paymentMethod}`,
    extra: {
      pharmacyBill,
      payment: { ...(getLocalBookings().find((item) => item._id === bookingId)?.payment || {}), amount: totalAmount, method: paymentMethod, status: 'paid', paidAt: new Date().toISOString() }
    }
  });
  const recordText = [
    `Doctor: ${booking?.doctor?.name || ''}`,
    `Symptoms: ${booking?.prescription?.symptoms || ''}`,
    `Prescription: ${(booking?.prescription?.medicines || []).map((item) => `${item.name} · M:${item.morning || '-'} A:${item.afternoon || '-'} N:${item.night || '-'} · ${item.days || '-'} days`).join(', ')}`,
    `Medicines dispensed: ${billItems.map((item) => `${item.name} x${item.quantity} = INR ${item.total}`).join(', ')}`,
    `Bill amount: INR ${totalAmount}`,
    `Payment: ${paymentMethod}`
  ].join('\n');
  saveLocalMedicalRecord({
    email: booking?.patientEmail,
    type: 'visit-summary',
    title: `Prescription and bill · token #${booking?.tokenNumber || ''}`,
    sourceText: recordText,
    aiSummary: recordText,
    pdfReady: true,
    prescription: booking?.prescription,
    pharmacyBill,
    appointment: {
      tokenNumber: booking?.tokenNumber,
      appointmentDate: booking?.appointmentDate,
      doctor: booking?.doctor,
      patientDetails: booking?.patientDetails,
      patientName: booking?.patientName
    }
  });
  addLocalNotification({ email: booking?.patientEmail, title: 'Payment completed', message: `Bill ${pharmacyBill.billNumber} paid. Visit record saved.`, type: 'success' });
  return booking;
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
    isFull: remaining <= 0,
    isBookable: policy.isBookable,
    reasons: policy.reasons,
    bookingPolicy: policy,
    fee: normalizeFee(slot.fee, doctor.fee),
    estimatedWaitMinutes: Math.max(booked, 0) * 8
  };
};
