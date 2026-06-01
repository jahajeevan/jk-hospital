import { appointmentExtractionPrompt } from './prompts/appointmentPrompt.js';
import { AI_DISCLAIMER, withHospitalSafety } from './prompts/hospitalSystemPrompt.js';
import { prescriptionPrompt, reportSummaryPrompt } from './prompts/reportPrompt.js';
import { symptomDepartmentPrompt, triagePrompt } from './prompts/triagePrompt.js';
import { getSessionMessages, rememberExchange } from './memory/sessionMemory.js';
import { getAiProvider, listAiProviders } from './providers/index.js';

const MAX_INPUT = 6000;

const cleanText = (value = '', max = MAX_INPUT) => String(value || '').trim().slice(0, max);

const ensureDisclaimer = (text) => {
  const cleaned = cleanText(text, 7000);
  return cleaned.includes(AI_DISCLAIMER) ? cleaned : `${cleaned}\n\n${AI_DISCLAIMER}`;
};

const stripJsonFence = (text) =>
  cleanText(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

const parseJson = (text, fallback) => {
  try {
    return JSON.parse(stripJsonFence(text));
  } catch {
    const match = cleanText(text).match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]);
    } catch {
      return fallback;
    }
  }
};

const generate = async (prompt, options) => getAiProvider().generate({ prompt, options });

const offlineNotice =
  'Local AI is temporarily unavailable, so this answer is based on configured hospital information.';

const hospitalFaqFallback = (question = '') => {
  const text = cleanText(question, 500).toLowerCase();
  if (/emergency|ambulance|urgent|accident|chest pain|breath/.test(text)) {
    return ensureDisclaimer(
      `${offlineNotice}\n\nFor emergencies, contact JK Hospital at 7845265507 or seek immediate medical attention. If symptoms include chest pain, breathing difficulty, fainting, severe bleeding, stroke-like symptoms, or severe allergic reaction, do not wait for an online response.`
    );
  }
  if (/famous|popular|special|known|best/.test(text)) {
    return ensureDisclaimer(
      `${offlineNotice}\n\nJK Hospital is presented on this platform as a modern patient-care hospital focused on appointment tokens, doctor consultations, digital payments, patient records, and smart AI-assisted visit preparation. For the hospital's official specialties, awards, or most popular departments, please confirm with the hospital administration before publishing claims.`
    );
  }
  if (/timing|hours|open|visiting/.test(text)) {
    return ensureDisclaimer(
      `${offlineNotice}\n\nPlease confirm current visiting hours and OP timings with the hospital desk. The platform supports doctor-wise slots, so timings can differ by department and doctor.`
    );
  }
  if (/insurance|cashless|claim/.test(text)) {
    return ensureDisclaimer(
      `${offlineNotice}\n\nInsurance and cashless support depends on the hospital's active insurer tie-ups. Please contact the billing or admission desk for current policy support.`
    );
  }
  if (/admission|admit|room|bed/.test(text)) {
    return ensureDisclaimer(
      `${offlineNotice}\n\nFor admission, room, or bed availability, contact the hospital reception or admission desk. Staff should confirm availability, documents, and estimated charges directly.`
    );
  }
  return ensureDisclaimer(
    `${offlineNotice}\n\nJK Hospital can help with appointments, doctor slots, digital tokens, payments, invoices, patient records, and emergency contact guidance. Please contact the hospital desk for official details that are not configured in the platform.`
  );
};

export const getAiStatus = () => ({
  enabled: true,
  disclaimer: AI_DISCLAIMER,
  providers: listAiProviders()
});

export const createChatResponse = async ({ message, sessionId }) => {
  const history = getSessionMessages(sessionId)
    .map((item) => `${item.role}: ${item.content}`)
    .join('\n');
  const prompt = withHospitalSafety(`
Answer the patient's hospital or health-information question.
Use the conversation history only for context.

Conversation history:
${history || 'No previous messages.'}

User message:
${cleanText(message)}
`);
  const response = ensureDisclaimer(await generate(prompt, { maxTokens: 900 }));
  rememberExchange(sessionId, message, response);
  return { message: response, disclaimer: AI_DISCLAIMER, provider: getAiProvider().name, model: getAiProvider().model };
};

export const routeSymptoms = async (symptoms) => {
  const raw = await generate(symptomDepartmentPrompt(cleanText(symptoms)), { maxTokens: 500 });
  const parsed = parseJson(raw, {
    department: 'General Medicine',
    urgency: 'routine',
    reason: cleanText(raw, 500) || 'A general consultation is safest when symptoms are unclear.',
    redFlags: ['Seek emergency care for chest pain, breathing difficulty, fainting, severe bleeding, or sudden weakness.']
  });
  return { ...parsed, disclaimer: AI_DISCLAIMER };
};

export const extractAppointment = async ({ message, todayIso }) => {
  const raw = await generate(appointmentExtractionPrompt(cleanText(message), todayIso), { maxTokens: 600 });
  const parsed = parseJson(raw, {
    specialization: '',
    dateText: '',
    date: '',
    timePreference: 'anytime',
    urgency: 'routine',
    symptoms: cleanText(message, 300),
    patientMessage: 'I captured your request. Please review the appointment details before booking.'
  });
  return { ...parsed, disclaimer: AI_DISCLAIMER };
};

export const summarizeReport = async (reportText) => ({
  summary: ensureDisclaimer(await generate(reportSummaryPrompt(cleanText(reportText)), { maxTokens: 1000 })),
  disclaimer: AI_DISCLAIMER
});

export const explainPrescription = async (prescriptionText) => ({
  explanation: ensureDisclaimer(await generate(prescriptionPrompt(cleanText(prescriptionText)), { maxTokens: 900 })),
  disclaimer: AI_DISCLAIMER
});

export const answerFaq = async (question) => ({
  answer: await (async () => {
    try {
      return ensureDisclaimer(
        await generate(
          withHospitalSafety(`
Answer this JK Hospital FAQ using concise operational guidance. If a fact is not known, say the hospital desk can confirm it.
Do not claim that the hospital is famous, best, award-winning, or popular for a specialty unless that fact is explicitly provided in the hospital context.
If asked what the hospital is famous or popular for, explain the platform-supported services: appointment tokens, doctor consultations, digital payments, patient records, emergency contact guidance, and AI-assisted visit preparation. Tell the user to confirm official specialties or reputation claims with hospital administration.

FAQ:
${cleanText(question)}
`),
          { maxTokens: 700 }
        )
      );
    } catch {
      return hospitalFaqFallback(question);
    }
  })(),
  disclaimer: AI_DISCLAIMER
});

export const formatDoctorNote = async (note) => ({
  formattedNote: ensureDisclaimer(
    await generate(
      withHospitalSafety(`
Convert the rough doctor note into a professional clinical note format.
Preserve meaning. Do not invent findings, diagnosis, medication, or dosage.

Rough note:
${cleanText(note)}
`),
      { maxTokens: 800 }
    )
  ),
  disclaimer: AI_DISCLAIMER
});

export const triageSymptoms = async (symptoms) => {
  const raw = await generate(triagePrompt(cleanText(symptoms)), { maxTokens: 700 });
  const parsed = parseJson(raw, {
    severity: 'medium',
    recommendedDepartment: 'Emergency Medicine',
    reason: cleanText(raw, 500) || 'Symptoms need clinician review.',
    immediateAction: 'Contact JK Hospital or seek urgent medical care if symptoms are severe or worsening.',
    redFlags: ['Chest pain', 'Breathing difficulty', 'Severe bleeding', 'Fainting', 'Stroke-like symptoms']
  });
  return { ...parsed, disclaimer: AI_DISCLAIMER };
};

export const createVisitPrep = async (payload) => {
  const patient = payload?.patient || {};
  const doctor = payload?.doctor || {};
  const slot = payload?.slot || {};
  const response = await generate(
    withHospitalSafety(`
Create safe visit preparation for an appointment. Return only valid JSON:
{
  "urgency": "routine | soon | urgent",
  "summary": "2 short patient-friendly sentences. No diagnosis.",
  "suggestedDepartment": "short specialty label",
  "preparation": ["3-5 practical items"],
  "questionsForDoctor": ["3-5 questions"],
  "redFlags": ["2-4 emergency warning signs"]
}

Patient age: ${cleanText(patient.age, 20)}
Patient gender: ${cleanText(patient.gender, 30)}
Symptoms/reason: ${cleanText(patient.symptoms)}
Doctor: ${cleanText(doctor.name, 80)}
Specialty: ${cleanText(doctor.specialty, 80)}
Appointment date: ${cleanText(payload?.appointmentDate, 40)}
Slot: ${cleanText(slot.label, 80)}
`),
    { maxTokens: 800 }
  );

  const parsed = parseJson(response, {
    urgency: 'routine',
    summary: cleanText(patient.symptoms, 300) || 'Your symptoms were captured for the doctor to review.',
    suggestedDepartment: cleanText(doctor.specialty, 80) || 'General consultation',
    preparation: ['Carry prior prescriptions, test reports, and current medication details.'],
    questionsForDoctor: ['When should I follow up?', 'What warning signs should I watch for?'],
    redFlags: ['Seek emergency care if symptoms become severe, sudden, chest-pain related, or breathing related.']
  });

  return { ...parsed, disclaimer: AI_DISCLAIMER };
};
