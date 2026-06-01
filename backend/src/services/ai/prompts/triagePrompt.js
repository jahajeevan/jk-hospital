import { withHospitalSafety } from './hospitalSystemPrompt.js';

export const triagePrompt = (symptoms) =>
  withHospitalSafety(`
Assess emergency severity from the described symptoms without diagnosing.
Return only valid JSON:
{
  "severity": "low | medium | high | emergency",
  "recommendedDepartment": "department name",
  "reason": "short non-diagnostic reason",
  "immediateAction": "safe next step",
  "redFlags": ["warning signs"]
}

Use emergency for chest pain, breathing difficulty, stroke signs, severe bleeding, loss of consciousness, severe allergic reaction, severe trauma, pregnancy emergency, or suicidal intent.

Symptoms:
${symptoms}
`);

export const symptomDepartmentPrompt = (symptoms) =>
  withHospitalSafety(`
Classify the likely hospital department for these symptoms. Do not diagnose.
Return only valid JSON:
{
  "department": "department name",
  "urgency": "routine | soon | urgent",
  "reason": "short non-diagnostic explanation",
  "redFlags": ["when to seek emergency care"]
}

Symptoms:
${symptoms}
`);
