# Incident Response Plan

Use this when the hospital reports downtime, data issues, payment problems, or AI safety concerns.

## Severity Levels

## P0: Critical

Examples:

- Website fully down
- Backend fully down
- Database inaccessible
- Payment success but tokens not created
- Patient data exposed
- Admin login compromised

Target response: immediate.

## P1: High

Examples:

- AI unavailable
- Appointment booking failing for many users
- Invoice generation failing
- Admin panel unavailable
- Refund flow broken

Target response: same business day or as per SLA.

## P2: Medium

Examples:

- UI layout issue
- Single doctor/slot misconfigured
- Slow AI response
- Non-critical email issue

Target response: planned maintenance window.

## First 15 Minutes

1. Confirm the affected URL and exact time.
2. Check backend health endpoint.
3. Check frontend availability.
4. Check MongoDB status.
5. Check server CPU, RAM, disk.
6. Check payment gateway dashboard if payment-related.
7. Check Ollama status if AI-related.
8. Preserve logs before restarting services.

## Commands

```bash
curl https://hospital.example.com/api/health
curl https://hospital.example.com/api/v1/health/live
curl http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:4b","prompt":"Reply OK only","stream":false}'
pm2 status
pm2 logs
df -h
free -m
```

## Payment Incident

If payment succeeded but appointment/token failed:

1. Do not ask the patient to pay again immediately.
2. Capture payment ID, patient phone/email, timestamp, amount.
3. Check payment gateway dashboard.
4. Check appointment records.
5. Manually reconcile token or refund based on hospital policy.
6. Record the resolution in admin notes.

## AI Safety Incident

If AI produces unsafe medical advice:

1. Screenshot/save the response.
2. Disable AI route temporarily if needed.
3. Review prompt and safety guardrails.
4. Inform hospital staff that AI is informational only.
5. Patch prompts/service behavior.
6. Log final fix and timestamp.

## Data Incident

If patient data may be exposed:

1. Stop the leak first.
2. Preserve logs.
3. Rotate secrets if credentials are involved.
4. Identify affected data and users.
5. Inform hospital owner/administrator.
6. Follow applicable legal and regulatory reporting requirements.
7. Document root cause and preventive fix.

## Post-Incident Report

Every P0/P1 incident should produce:

- Incident title
- Start time
- Detection time
- Resolution time
- Impact
- Root cause
- Actions taken
- Data affected
- Prevention steps
- Owner responsible
