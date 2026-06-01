# JK Hospital Smart AI Platform

## Local AI Setup

Backend AI defaults to local Ollama:

```bash
ollama pull qwen3:4b
ollama serve
npm run dev
```

Required backend environment:

```env
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen3:4b
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TIMEOUT_MS=25000
OLLAMA_RETRIES=1
JWT_SECRET=replace_with_a_32_plus_character_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
```

Provider switching is handled by `AI_PROVIDER`. `ollama` is active now; `gemini` is scaffolded for future hosted provider fallback.

## Backend Architecture

AI modules live under `backend/src/services/ai`:

- `providers/ollamaProvider.js`: local Ollama `/api/generate` integration with timeout, retry, and response validation.
- `providers/geminiProvider.js`: future provider adapter.
- `providers/index.js`: provider selection from environment.
- `aiService.js`: safety normalization, JSON parsing, and feature orchestration.
- `prompts/*`: hospital safety prompt, appointment extraction, report/prescription explanation, and triage prompts.
- `memory/sessionMemory.js`: small in-memory chat history per session.

## API Routes

All AI routes are mounted under `/api/ai` and `/api/v1/ai`.

- `GET /config`: active provider/model metadata.
- `POST /chat`: patient assistant chat. Body: `{ "message": "...", "sessionId": "optional" }`
- `POST /symptom-route`: department recommendation. Body: `{ "symptoms": "..." }`
- `POST /appointment-assist`: natural-language booking extraction. Body: `{ "message": "Book dermatologist tomorrow evening" }`
- `POST /report-summary`: patient-friendly report summary. Body: `{ "reportText": "..." }`
- `POST /prescription-explain`: medicine purpose and precautions. Body: `{ "prescriptionText": "..." }`
- `POST /faq`: hospital FAQ. Body: `{ "question": "..." }`
- `POST /doctor-note`: professional note formatting. Body: `{ "note": "..." }`
- `POST /triage`: emergency severity guidance. Body: `{ "symptoms": "..." }`
- `POST /visit-prep`: appointment visit preparation. Existing booking integration uses this route.

Every AI feature is constrained by the mandatory disclaimer and medical safety prompt.

## Frontend Features

- `/ai`: Smart Hospital AI console with chatbot, symptom routing, triage, report summarizer, prescription explanation, FAQ, and doctor note formatter.
- `/book`: AI appointment assistant that extracts specialty, date, time preference, urgency, and symptoms, then pre-fills the booking flow where possible.
- Existing AI visit prep now uses the local provider architecture instead of hard-coded Gemini logic.

## Testing

```bash
npm run test --prefix backend
npm run build --prefix frontend
```

Manual AI smoke tests:

```bash
curl -X POST http://localhost:5001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I have chest pain, what should I do?","sessionId":"smoke-test"}'

curl -X POST http://localhost:5001/api/ai/appointment-assist \
  -H "Content-Type: application/json" \
  -d '{"message":"Book dermatologist tomorrow evening"}'
```

## Deployment Guidance

- For VPS or cloud deployment, keep `AI_PROVIDER=ollama` and point `OLLAMA_BASE_URL` to a private hosted Ollama server.
- Restrict CORS using `CORS_ORIGINS`.
- Use a strong `JWT_SECRET`, production Supabase project, HTTPS reverse proxy, process manager, and the existing Docker/PM2 assets.
- Do not expose Ollama directly to the public internet; place it behind the backend or a private network.
