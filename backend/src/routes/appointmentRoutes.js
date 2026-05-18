import express from 'express';
import {
  cancelAppointment,
  createAppointment,
  downloadInvoice,
  myAppointments,
  rescheduleAppointment
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { bookingRules } from '../validators/appointmentValidators.js';

const router = express.Router();

router.use(protect);
router.get('/mine', myAppointments);
router.post('/', bookingRules, validate, createAppointment);
router.patch('/:id/cancel', cancelAppointment);
router.patch('/:id/reschedule', rescheduleAppointment);
router.get('/:id/invoice', downloadInvoice);

export default router;

