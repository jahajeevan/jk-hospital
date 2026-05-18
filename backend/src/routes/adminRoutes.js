import express from 'express';
import {
  allBookings,
  deleteDoctor,
  markDoctorLeave,
  overview,
  updateAppointmentStatus,
  upsertDoctor
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/overview', overview);
router.get('/bookings', allBookings);
router.post('/doctors', upsertDoctor);
router.put('/doctors/:id', upsertDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.patch('/doctors/:id/leave', markDoctorLeave);

export default router;

