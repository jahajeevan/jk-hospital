import express from 'express';
import {
  allBookings,
  deleteDoctor,
  markDoctorLeave,
  overview,
  updateAppointmentStatus,
  upsertDoctor
} from '../controllers/adminController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/permissions.js';

const router = express.Router();

router.use(protect);
router.use(requirePermission(PERMISSIONS.APPOINTMENTS_READ_ALL));
router.get('/overview', overview);
router.get('/bookings', allBookings);
router.post('/doctors', requirePermission(PERMISSIONS.DOCTORS_MANAGE), upsertDoctor);
router.put('/doctors/:id', requirePermission(PERMISSIONS.DOCTORS_MANAGE), upsertDoctor);
router.delete('/doctors/:id', requirePermission(PERMISSIONS.DOCTORS_MANAGE), deleteDoctor);
router.patch('/appointments/:id/status', requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE), updateAppointmentStatus);
router.patch('/doctors/:id/leave', requirePermission(PERMISSIONS.DOCTORS_MANAGE), markDoctorLeave);

export default router;
