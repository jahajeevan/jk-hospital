import { withHospitalSafety } from './hospitalSystemPrompt.js';

export const appointmentExtractionPrompt = (message, todayIso) =>
  withHospitalSafety(`
Extract appointment intent from the patient's natural-language request.
Return only valid JSON:
{
  "specialization": "department or specialty, empty string if unknown",
  "dateText": "natural date text",
  "date": "YYYY-MM-DD if clear, otherwise empty string",
  "timePreference": "morning | afternoon | evening | night | anytime",
  "urgency": "routine | soon | urgent",
  "symptoms": "brief symptom/reason text",
  "patientMessage": "one short safe clarification or confirmation"
}

Today is ${todayIso}. Interpret tomorrow/next week relative to this date.
Do not diagnose. If emergency symptoms appear, set urgency to urgent.

Request:
${message}
`);
