import Doctor from '../models/Doctor.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getSlotAvailability } from '../services/tokenService.js';

export const listDoctors = asyncHandler(async (_req, res) => {
  if (Doctor.db.readyState !== 1) {
    return res.json({ doctors: [] });
  }
  const doctors = await Doctor.find().sort({ createdAt: 1 });
  res.json({ doctors });
});

export const getDoctor = asyncHandler(async (req, res) => {
  if (Doctor.db.readyState !== 1) {
    const error = new Error('Doctor database is not configured');
    error.statusCode = 503;
    throw error;
  }
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }
  res.json({ doctor });
});

export const doctorAvailability = asyncHandler(async (req, res) => {
  if (Doctor.db.readyState !== 1) {
    const error = new Error('Doctor database is not configured');
    error.statusCode = 503;
    throw error;
  }
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const slots = await Promise.all(
    doctor.slots.map((slot) => getSlotAvailability(doctor, req.query.date || new Date(), slot._id))
  );
  res.json({ doctorId: doctor._id, date: req.query.date, slots });
});
