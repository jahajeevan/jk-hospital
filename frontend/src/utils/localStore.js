/**
 * Constants and utility functions previously in localStore.js
 * Simplified implementations for the refactored app
 */

// Department list
export const DEPARTMENTS = [
  'General Medicine',
  'Orthopedics',
  'Cardiology',
  'Dermatology',
  'ENT',
  'Pediatrics',
  'Gynecology',
  'Psychiatry'
];

// Slot availability options
export const getWalkInSlotOptions = (doctor, date) => {
  if (!doctor || !doctor.slots) return [];
  
  const todayStr = localIsoDate();
  const isToday = date === todayStr;
  
  return doctor.slots
    .filter(slot => {
      if (!isToday && slot.date && datePart(slot.date) !== date) return false;
      return slot.isActive !== false;
    })
    .map((slot) => {
      const onlineInfo = getSlotAvailability(doctor, slot._id || slot.id, date);
      const walkInLimit = Number(slot.walkInTokenLimit ?? 50);
      const booked = Number(slot.walkInBookedTokens || 0);
      const remaining = Math.max(walkInLimit - booked, 0);
      const reasons = [...(onlineInfo.reasons || [])];
      if (remaining <= 0) reasons.push('Walk-in tokens full');
      return {
        slot,
        remaining,
        booked,
        isBookable: reasons.length === 0,
        reasons
      };
    });
};

// Mark patient as arrived (placeholder)
export const markPatientArrived = (bookingId) => {
  console.log('Mark patient arrived:', bookingId);
  return { bookingId, arrivedAt: new Date().toISOString() };
};

// Create walk-in booking
export const createWalkInBooking = (walkInData) => {
  const now = new Date();
  return {
    _id: `booking_${Date.now()}`,
    patientName: walkInData.patientName,
    patientEmail: `${walkInData.mobile}@walk-in.local`,
    patientPhone: walkInData.mobile,
    doctor: { _id: walkInData.doctorId },
    doctorId: walkInData.doctorId,
    slotId: walkInData.slotId,
    slotLabel: `Walk-in ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
    status: 'arrived',
    isWalkIn: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
};

// Update appointment workflow
export const updateAppointmentWorkflow = (bookingId, status, metadata = {}) => {
  return {
    bookingId,
    status,
    ...metadata,
    updatedAt: new Date().toISOString()
  };
};

// Save prescription for booking
export const savePrescriptionForBooking = (prescriptionData) => {
  return {
    ...prescriptionData,
    _id: prescriptionData._id || `prescription_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
};

// Save pharmacy bill for booking
export const savePharmacyBillForBooking = (billData) => {
  const totalAmount = billData.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  return {
    ...billData,
    _id: billData._id || `bill_${Date.now()}`,
    totalAmount,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
};

// Get inventory alerts
export const getInventoryAlerts = () => {
  return [];
};

const localIsoDate = (value = new Date()) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const parseDateOnly = (value) => {
  const [year, month, day] = String(value || localIsoDate()).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

const parseSlotStart = (date, time = '00:00') => {
  const slotStart = parseDateOnly(date);
  const [hours = 0, minutes = 0] = String(time || '00:00').split(':').map(Number);
  slotStart.setHours(hours, minutes, 0, 0);
  return slotStart;
};

const datePart = (value) => String(value || '').slice(0, 10);

export const getSlotAvailability = (doctor, slotId, date, now = new Date()) => {
  const slot = (doctor?.slots || []).find((item) => String(item._id || item.id) === String(slotId));
  if (!slot) {
    return {
      slot: null,
      isBookable: false,
      isFull: true,
      booked: 0,
      remaining: 0,
      estimatedWaitMinutes: 0,
      reasons: ['Select an available OP slot']
    };
  }

  const selectedDate = datePart(date || localIsoDate(now));
  const today = localIsoDate(now);
  const tokenLimit = Number(slot.tokenLimit || 0);
  const booked = Number(slot.bookedTokens || 0);
  const remaining = Math.max(tokenLimit - booked, 0);
  const advanceBookingMinutes = Number(slot.advanceBookingMinutes ?? 60);
  const slotStart = parseSlotStart(selectedDate, slot.startTime);
  const latestSameDayBookingAt = new Date(slotStart.getTime() - advanceBookingMinutes * 60 * 1000);
  const reasons = [];

  if (doctor?.isAvailable === false) reasons.push('Selected doctor is currently on leave');
  if (slot.isActive === false) reasons.push('This OP slot is inactive');
  if (slot.date && datePart(slot.date) !== selectedDate) reasons.push('This slot is not active for the selected date');
  if (selectedDate < today) reasons.push('Appointment date cannot be in the past');
  if (slot.availableFrom && selectedDate < datePart(slot.availableFrom)) reasons.push('This slot is not available yet');
  if (slot.availableUntil && selectedDate > datePart(slot.availableUntil)) reasons.push('This slot is not available for the selected future date');
  if (selectedDate === today && now > latestSameDayBookingAt) {
    reasons.push(`Same-day tokens must be booked at least ${advanceBookingMinutes} minutes before the slot starts. Please choose another slot or book the next available date.`);
  }
  if (remaining <= 0) reasons.push('Selected slot is full');

  return {
    slot,
    isBookable: reasons.length === 0,
    isFull: remaining <= 0,
    booked,
    remaining,
    estimatedWaitMinutes: Math.max(booked, 0) * 8,
    reasons,
    latestSameDayBookingAt
  };
};
