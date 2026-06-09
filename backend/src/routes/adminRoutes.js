import express from 'express';
import {
  allBookings,
  createDoctorSlot,
  deleteDoctor,
  deleteSlot,
  markDoctorLeave,
  overview,
  updateAppointmentStatus,
  updateDoctorSlot,
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
router.post('/doctors/:id/slots', requirePermission(PERMISSIONS.DOCTORS_MANAGE), createDoctorSlot);
router.patch('/doctors/:id/slots/:slotId', requirePermission(PERMISSIONS.DOCTORS_MANAGE), updateDoctorSlot);
router.delete('/doctors/:id', requirePermission(PERMISSIONS.DOCTORS_MANAGE), deleteDoctor);
router.delete('/slots/:slotId', requirePermission(PERMISSIONS.DOCTORS_MANAGE), deleteSlot);
router.patch('/appointments/:id/status', requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE), updateAppointmentStatus);
router.patch('/doctors/:id/leave', requirePermission(PERMISSIONS.DOCTORS_MANAGE), markDoctorLeave);

export default router;
