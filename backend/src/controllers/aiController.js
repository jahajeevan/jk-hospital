import { asyncHandler } from '../utils/asyncHandler.js';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

const cleanText = (value = '') => String(value).trim().slice(0, 1200);

const safeArray = (value) =>
  Array.isArray(value)
    ? value.map((item) => cleanText(item)).filter(Boolean).slice(0, 6)
    : [];

const fallbackPrep = (text) => ({
  urgency: 'routine',
  summary: cleanText(text) || 'Your symptoms were captured for the doctor to review.',
  suggestedDepartment: 'General consultation',
  preparation: ['Carry prior prescriptions, test reports, and current medication details.'],
  questionsForDoctor: ['When should I follow up?', 'What warning signs should I watch for?'],
  redFlags: ['If symptoms become severe, sudden, or breathing/chest-pain related, seek emergency care immediately.'],
  disclaimer: 'This AI summary is only for visit preparation and is not a diagnosis.'
});

const parseGeminiJson = (text) => {
  const trimmed = cleanText(text).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    return {
      urgency: ['routine', 'soon', 'urgent'].includes(parsed.urgency) ? parsed.urgency : 'routine',
      summary: cleanText(parsed.summary),
      suggestedDepartment: cleanText(parsed.suggestedDepartment) || 'General consultation',
      preparation: safeArray(parsed.preparation),
      questionsForDoctor: safeArray(parsed.questionsForDoctor),
      redFlags: safeArray(parsed.redFlags),
      disclaimer: 'This AI summary is only for visit preparation and is not a diagnosis.'
    };
  } catch {
    return fallbackPrep(text);
  }
};

const buildPrompt = ({ patient = {}, doctor = {}, slot = {}, appointmentDate }) => `
You are JK Hospital's patient visit preparation assistant.

Return only valid JSON with this exact shape:
{
  "urgency": "routine" | "soon" | "urgent",
  "summary": "2 short patient-friendly sentences. No diagnosis.",
  "suggestedDepartment": "short specialty label",
  "preparation": ["3-5 practical items to bring or do before visit"],
  "questionsForDoctor": ["3-5 questions the patient can ask"],
  "redFlags": ["2-4 emergency warning signs"]
}

Rules:
- Do not diagnose, prescribe medicine, or claim certainty.
- Use calm healthcare language suitable for India.
- If symptoms suggest chest pain, breathing difficulty, severe bleeding, stroke signs, fainting, severe allergic reaction, pregnancy emergency, or very high fever in a child, mark urgency as "urgent".
- Otherwise use "soon" for symptoms that should be checked within 24-48 hours and "routine" for stable non-severe symptoms.
- Keep all items concise.

Patient:
- Age: ${cleanText(patient.age)}
- Gender: ${cleanText(patient.gender)}
- Symptoms/reason: ${cleanText(patient.symptoms)}

Booked doctor:
- Name: ${cleanText(doctor.name)}
- Specialty: ${cleanText(doctor.specialty)}

Appointment:
- Date: ${cleanText(appointmentDate)}
- Slot: ${cleanText(slot.label)}
`;

export const getAiConfig = asyncHandler(async (_req, res) => {
  res.json({
    enabled: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL
  });
});

export const createVisitPrep = asyncHandler(async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('Gemini AI is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend.');
    error.statusCode = 503;
    throw error;
  }

  const symptoms = cleanText(req.body?.patient?.symptoms);
  if (symptoms.length < 8) {
    const error = new Error('Describe symptoms in a little more detail before using AI visit prep.');
    error.statusCode = 400;
    throw error;
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(req.body) }] }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: 'application/json'
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const rawMessage = payload?.error?.message || 'Gemini could not generate visit prep right now.';
      const message = /api key|permission|credential/i.test(rawMessage)
        ? 'Gemini API key is invalid or restricted. Copy a fresh key into backend/.env, make sure Gemini API is allowed, then restart the backend.'
        : rawMessage;
      const error = new Error(message);
      error.statusCode = response.status >= 500 ? 503 : response.status;
      throw error;
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
    res.json({ prep: parseGeminiJson(text) });
  } finally {
    clearTimeout(timeout);
  }
});
