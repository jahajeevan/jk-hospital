import express from 'express';
import { requireUser } from '../middleware/auth.js';
import medicalRecordsController from '../controllers/medicalRecordsController.js';

const router = express.Router();

// Get user's medical records
router.get('/mine', requireUser, medicalRecordsController.getUserMedicalRecords);

// Create medical record
router.post('/', requireUser, medicalRecordsController.createMedicalRecord);

// Get specific medical record
router.get('/:id', requireUser, medicalRecordsController.getMedicalRecord);

// Update medical record
router.patch('/:id', requireUser, medicalRecordsController.updateMedicalRecord);

// Delete medical record
router.delete('/:id', requireUser, medicalRecordsController.deleteMedicalRecord);

// Document management
router.post('/:id/documents', requireUser, medicalRecordsController.uploadDocument);
router.get('/:id/documents', requireUser, medicalRecordsController.getDocuments);
router.delete('/:id/documents/:documentId', requireUser, medicalRecordsController.deleteDocument);

export default router;
