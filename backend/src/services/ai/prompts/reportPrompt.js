import { withHospitalSafety } from './hospitalSystemPrompt.js';

export const reportSummaryPrompt = (reportText) =>
  withHospitalSafety(`
Simplify the medical report text for a patient.
Return a clear explanation with:
- Plain-English summary
- Important terms explained
- Values or findings the patient should discuss with a doctor
- Calm next steps

Do not diagnose or recommend treatment.

Report text:
${reportText}
`);

export const prescriptionPrompt = (prescriptionText) =>
  withHospitalSafety(`
Explain this prescription in patient-friendly language:
- What each medicine is generally used for
- General precautions or common discussion points
- What to ask the doctor/pharmacist

Do not suggest or change dosage, frequency, duration, or combinations.

Prescription:
${prescriptionText}
`);
