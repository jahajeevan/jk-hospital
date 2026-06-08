import express from 'express';
import { requireUser } from '../middleware/authMiddleware.js';
import prescriptionController from '../controllers/prescriptionController.js';

const router = express.Router();

// Get user's prescriptions
router.get('/mine', requireUser, prescriptionController.getUserPrescriptions);

// Create prescription
router.post('/', requireUser, prescriptionController.createPrescription);

// Get specific prescription
router.get('/:id', requireUser, prescriptionController.getPrescription);

// Update prescription
router.patch('/:id', requireUser, prescriptionController.updatePrescription);

// Delete prescription
router.delete('/:id', requireUser, prescriptionController.deletePrescription);

// Update medicines in prescription
router.patch('/:id/medicines', requireUser, prescriptionController.updatePrescriptionMedicines);

// Get prescription by appointment (nested route)
router.get('/appointment/:appointmentId', requireUser, prescriptionController.getAppointmentPrescription);

export default router;
