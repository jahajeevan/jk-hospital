import { asyncHandler } from '../utils/asyncHandler.js';
import * as aiService from '../services/ai/aiService.js';

const minLength = (value, length, message) => {
  if (!String(value || '').trim() || String(value || '').trim().length < length) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

export const getAiConfig = asyncHandler(async (_req, res) => {
  res.json(aiService.getAiStatus());
});

export const chat = asyncHandler(async (req, res) => {
  minLength(req.body?.message, 2, 'Enter a message for the AI assistant.');
  const result = await aiService.createChatResponse({
    message: req.body.message,
    sessionId: req.body.sessionId || req.requestId
  });
  res.json(result);
});

export const symptomRoute = asyncHandler(async (req, res) => {
  minLength(req.body?.symptoms, 3, 'Describe symptoms before requesting a department suggestion.');
  res.json({ result: await aiService.routeSymptoms(req.body.symptoms) });
});

export const appointmentAssist = asyncHandler(async (req, res) => {
  minLength(req.body?.message, 3, 'Describe the appointment you want to book.');
  const todayIso = new Date().toISOString().slice(0, 10);
  res.json({ result: await aiService.extractAppointment({ message: req.body.message, todayIso }) });
});

export const reportSummary = asyncHandler(async (req, res) => {
  minLength(req.body?.reportText, 20, 'Paste more report text before requesting a summary.');
  res.json(await aiService.summarizeReport(req.body.reportText));
});

export const prescriptionExplain = asyncHandler(async (req, res) => {
  minLength(req.body?.prescriptionText, 8, 'Paste prescription text before requesting an explanation.');
  res.json(await aiService.explainPrescription(req.body.prescriptionText));
});

export const faq = asyncHandler(async (req, res) => {
  minLength(req.body?.question, 3, 'Ask a hospital FAQ question.');
  res.json(await aiService.answerFaq(req.body.question));
});

export const doctorNote = asyncHandler(async (req, res) => {
  minLength(req.body?.note, 5, 'Enter rough doctor notes to format.');
  res.json(await aiService.formatDoctorNote(req.body.note));
});

export const emergencyTriage = asyncHandler(async (req, res) => {
  minLength(req.body?.symptoms, 3, 'Describe symptoms before triage.');
  res.json({ result: await aiService.triageSymptoms(req.body.symptoms) });
});

export const createVisitPrep = asyncHandler(async (req, res) => {
  minLength(req.body?.patient?.symptoms, 8, 'Describe symptoms in a little more detail before using AI visit prep.');
  res.json({ prep: await aiService.createVisitPrep(req.body) });
});
