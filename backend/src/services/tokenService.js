import { supabase } from '../config/supabase.js';

const normalizeDate = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = normalizeDate(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const parseSlotDateTime = (date, time = '00:00') => {
  const day = normalizeDate(date);
  const [hours = 0, minutes = 0] = String(time).split(':').map(Number);
  day.setHours(hours, minutes, 0, 0);
  return day;
};

export const getSlotBookingPolicy = (slot, date, now = new Date()) => {
  const day = normalizeDate(date);
  const today = normalizeDate(now);
  const availableFrom = slot?.availableFrom ? normalizeDate(slot.availableFrom) : null;
  const availableUntil = slot?.availableUntil ? endOfDay(slot.availableUntil) : null;
  const advanceBookingMinutes = Number(slot?.advanceBookingMinutes ?? 60);
  const slotStart = parseSlotDateTime(day, slot?.startTime);
  const latestSameDayBookingAt = new Date(slotStart.getTime() - advanceBookingMinutes * 60 * 1000);

  const reasons = [];
  if (day < today) reasons.push('Booking date cannot be in the past');
  if (availableFrom && day < availableFrom) reasons.push('This slot is not available yet');
  if (availableUntil && day > availableUntil) reasons.push('This slot is not available for the selected future date');
  if (day.getTime() === today.getTime() && now > latestSameDayBookingAt) {
    reasons.push(`Same-day tokens must be booked at least ${advanceBookingMinutes} minutes before the slot starts`);
  }

  return {
    isBookable: reasons.length === 0,
    reasons,
    availableFrom,
    availableUntil,
    advanceBookingMinutes,
    latestSameDayBookingAt,
    slotStart
  };
};

export const assertSlotBookable = (slot, date, now = new Date()) => {
  const policy = getSlotBookingPolicy(slot, date, now);
  if (!policy.isBookable) {
    const error = new Error(policy.reasons[0]);
    error.statusCode = 409;
    throw error;
  }
  return policy;
};

const findSlotById = (doctor, slotId) => {
  if (!doctor?.slots) return null;
  return doctor.slots.find((s) => String(s._id || s.id) === String(slotId));
};

export const getSlotAvailability = async (doctor, date, slotId) => {
  const slot = findSlotById(doctor, slotId);
  if (!slot || !slot.isActive || !doctor.isAvailable) {
    return { slot, totalTokens: slot?.tokenLimit || 0, bookedTokens: 0, remainingTokens: 0, isFull: true, isBookable: false };
  }

  const day = normalizeDate(date);
  const policy = getSlotBookingPolicy(slot, day);
  
  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_id', doctor._id)
    .eq('appointment_date', day.toISOString().slice(0, 10))
    .eq('slot_id', slotId)
    .not('status', 'in', '("cancelled","rejected")')
    .is('deleted_at', null);

  const bookedTokens = count || 0;
  const remainingTokens = Math.max(slot.tokenLimit - bookedTokens, 0);
  
  return {
    slot,
    totalTokens: slot.tokenLimit,
    bookedTokens,
    remainingTokens,
    isFull: remainingTokens <= 0 || !policy.isBookable,
    isBookable: policy.isBookable,
    bookingPolicy: {
      reasons: policy.reasons,
      availableFrom: policy.availableFrom,
      availableUntil: policy.availableUntil,
      advanceBookingMinutes: policy.advanceBookingMinutes,
      latestSameDayBookingAt: policy.latestSameDayBookingAt
    }
  };
};

export const allocateToken = async (doctor, date, slotId) => {
  const slot = findSlotById(doctor, slotId);
  assertSlotBookable(slot, date);
  const availability = await getSlotAvailability(doctor, date, slotId);
  if (availability.isFull) {
    const error = new Error('Selected slot is full or unavailable');
    error.statusCode = 409;
    throw error;
  }

  const tokenNumber = availability.bookedTokens + 1;
  return {
    tokenNumber,
    queuePosition: tokenNumber,
    estimatedWaitMinutes: Math.max(tokenNumber - 1, 0) * 8,
    slot: availability.slot
  };
};

export const normalizeAppointmentDate = normalizeDate;
