import express from 'express';
import { doctorAvailability, getDoctor, listDoctors } from '../controllers/doctorController.js';

const router = express.Router();

router.get('/', listDoctors);
router.get('/:id', getDoctor);
router.get('/:id/availability', doctorAvailability);

export default router;

