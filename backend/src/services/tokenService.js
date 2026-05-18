import Appointment from '../models/Appointment.js';

const normalizeDate = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const getSlotAvailability = async (doctor, date, slotId) => {
  const slot = doctor.slots.id(slotId);
  if (!slot || !slot.isActive || !doctor.isAvailable) {
    return { slot, totalTokens: slot?.tokenLimit || 0, bookedTokens: 0, remainingTokens: 0, isFull: true };
  }

  const day = normalizeDate(date);
  const bookedTokens = await Appointment.countDocuments({
    doctor: doctor._id,
    appointmentDate: day,
    slotId,
    status: { $nin: ['cancelled', 'rejected'] }
  });

  const remainingTokens = Math.max(slot.tokenLimit - bookedTokens, 0);
  return {
    slot,
    totalTokens: slot.tokenLimit,
    bookedTokens,
    remainingTokens,
    isFull: remainingTokens <= 0
  };
};

export const allocateToken = async (doctor, date, slotId) => {
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

