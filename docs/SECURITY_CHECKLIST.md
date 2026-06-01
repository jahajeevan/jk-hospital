# Security Checklist

- Enforce HTTPS and secure cookies in production.
- Rotate `JWT_SECRET`, payment keys, SMTP credentials, and API keys through a secret manager.
- Keep `/api/v1/docs` behind network/IP controls in production if the API is private.
- Enable MongoDB Atlas backups, audit logs, alerting, and least-privilege users.
- Add WAF rules for abusive IPs and payment endpoints.
- Use signed upload URLs, MIME validation, file size limits, and malware scanning before exposing reports.
- Review npm audit findings every release and patch high/critical vulnerabilities before deployment.
- Log PHI access through `AuditLog`; do not log symptoms, reports, OTPs, passwords, or payment secrets.

