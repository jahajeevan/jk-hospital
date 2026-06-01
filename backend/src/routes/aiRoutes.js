import express from 'express';
import {
  appointmentAssist,
  chat,
  createVisitPrep,
  doctorNote,
  emergencyTriage,
  faq,
  getAiConfig,
  prescriptionExplain,
  reportSummary,
  symptomRoute
} from '../controllers/aiController.js';

const router = express.Router();

router.get('/config', getAiConfig);
router.post('/chat', chat);
router.post('/symptom-route', symptomRoute);
router.post('/appointment-assist', appointmentAssist);
router.post('/report-summary', reportSummary);
router.post('/prescription-explain', prescriptionExplain);
router.post('/faq', faq);
router.post('/doctor-note', doctorNote);
router.post('/triage', emergencyTriage);
router.post('/visit-prep', createVisitPrep);

export default router;
