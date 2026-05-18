import express from 'express';
import { createVisitPrep, getAiConfig } from '../controllers/aiController.js';

const router = express.Router();

router.get('/config', getAiConfig);
router.post('/visit-prep', createVisitPrep);

export default router;
