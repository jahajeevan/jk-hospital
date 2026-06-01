# Production Deployment Checklist

## Pre-Deployment

- [ ] Confirm hospital name, address, phone, emergency number, email, and legal entity.
- [ ] Replace demo doctors, departments, fees, and slots.
- [ ] Configure production Supabase project.
- [ ] Configure production payment gateway keys.
- [ ] Configure production email/SMS credentials.
- [ ] Configure strong `JWT_SECRET`.
- [ ] Configure exact `CORS_ORIGINS`.
- [ ] Configure `CLIENT_URL` with HTTPS domain.
- [ ] Set `NODE_ENV=production`.
- [ ] Confirm Ollama `qwen3:4b` is installed on the AI host.
- [ ] Keep `OLLAMA_BASE_URL` private, preferably `http://127.0.0.1:11434` or private network.

## Security

- [ ] HTTPS enabled.
- [ ] Backend not publicly exposing debug stack traces.
- [ ] Supabase project keys are scoped and stored only in hosting environment variables.
- [ ] Ollama not publicly open.
- [ ] Server firewall enabled.
- [ ] Admin accounts use strong passwords.
- [ ] Staff roles tested.
- [ ] Rate limits enabled.
- [ ] Helmet/CORS/security middleware enabled.
- [ ] Upload limits tested.
- [ ] Secrets are not committed to Git.
- [ ] Production `.env` file permissions restricted.

## Data Protection

- [ ] Privacy policy reviewed by hospital/legal advisor.
- [ ] Patient consent text reviewed.
- [ ] AI disclaimer visible on every AI response.
- [ ] Patient data export/delete process documented.
- [ ] Audit log retention policy documented.
- [ ] Backup encryption enabled.
- [ ] Backup restore tested.

## Reliability

- [ ] Backend starts after reboot.
- [ ] Frontend serves after reboot.
- [ ] Supabase connectivity tested.
- [ ] Ollama offline behavior tested.
- [ ] Payment failure behavior tested.
- [ ] Payment success/token generation tested.
- [ ] Logs rotate safely.
- [ ] Disk usage alert configured.
- [ ] CPU/RAM alert configured.
- [ ] Uptime alert configured.

## AI Safety

- [ ] AI refuses diagnosis.
- [ ] AI refuses dosage instructions.
- [ ] AI routes emergency symptoms safely.
- [ ] AI report summary says to consult professionals.
- [ ] AI prescription explanation avoids changing dosage.
- [ ] AI logs do not expose unnecessary sensitive data.
- [ ] Hospital staff trained on AI limits.

## Handover

- [ ] Admin credentials transferred securely.
- [ ] Hosting ownership clarified.
- [ ] Database ownership clarified.
- [ ] Payment ownership clarified.
- [ ] Backup ownership clarified.
- [ ] Support SLA signed.
- [ ] Maintenance plan signed.
- [ ] Emergency contact escalation agreed.
- [ ] Final acceptance test signed by hospital.
