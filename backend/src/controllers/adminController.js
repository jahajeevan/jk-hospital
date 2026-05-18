import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Payment from '../models/Payment.js';
import RefundRequest from '../models/RefundRequest.js';
import User from '../models/User.js';
import { sendStatusEmail } from '../services/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const overview = asyncHandler(async (_req, res) => {
  const [appointments, patients, refunds, revenue] = await Promise.all([
    Appointment.countDocuments(),
    User.countDocuments({ role: 'patient' }),
    RefundRequest.countDocuments({ status: 'pending' }),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);

  const doctorOccupancy = await Appointment.aggregate([
    { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
    { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
    { $unwind: '$doctor' },
    { $project: { name: '$doctor.name', count: 1 } }
  ]);

  const dailyBookings = await Appointment.aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $limit: 14 }
  ]);

  res.json({
    stats: { appointments, patients, pendingRefunds: refunds, revenue: revenue[0]?.total || 0 },
    doctorOccupancy,
    dailyBookings
  });
});

export const allBookings = asyncHandler(async (_req, res) => {
  const appointments = await Appointment.find().populate('doctor').populate('patient', 'name email phone').populate('payment').sort({ createdAt: -1 });
  res.json({ appointments });
});

export const upsertDoctor = asyncHandler(async (req, res) => {
  const doctor = req.params.id ? await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }) : await Doctor.create(req.body);
  res.status(req.params.id ? 200 : 201).json({ doctor });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  await Doctor.findByIdAndDelete(req.params.id);
  res.json({ message: 'Doctor deleted' });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).populate('patient');
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }
  await sendStatusEmail(appointment.patient.email, `JK Hospital Appointment ${appointment.status}`, `Your appointment status is now ${appointment.status}.`);
  res.json({ appointment });
});

export const markDoctorLeave = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  doctor.isAvailable = false;
  doctor.unavailableDates.push(new Date(req.body.date || Date.now()));
  await doctor.save();

  const affected = await Appointment.find({
    doctor: doctor._id,
    appointmentDate: new Date(req.body.date),
    status: { $in: ['confirmed', 'approved', 'rescheduled'] }
  }).populate('patient');

  await Promise.all(
    affected.map((appointment) =>
      sendStatusEmail(appointment.patient.email, 'Doctor Unavailable Notification', `${doctor.name} is unavailable for your selected appointment. Please reschedule from your dashboard.`)
    )
  );

  res.json({ doctor, affectedPatients: affected.length });
});

