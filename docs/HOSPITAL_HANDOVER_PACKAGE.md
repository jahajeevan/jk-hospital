# Hospital Handover Package

Use this document before selling or handing over the JK Hospital platform to a real hospital.

## 1. Ownership Checklist

Confirm in writing who owns and controls:

- Domain name and DNS login
- Hosting/VPS/cloud account
- MongoDB database account
- Payment gateway account
- Email/SMS provider account
- Ollama server or AI host
- GitHub/source-code repository
- Backup storage
- Admin user accounts
- SSL certificates
- Monitoring/alerting account

Do not keep critical production ownership only under your personal accounts unless the hospital contract says you are providing managed hosting.

## 2. Required Production Setup

Minimum production infrastructure:

- HTTPS reverse proxy, such as Nginx or Caddy
- Node.js backend running with PM2, Docker, or systemd
- Static frontend behind Nginx/CDN
- MongoDB Atlas or hardened self-hosted MongoDB
- Private Ollama server, not exposed publicly
- Automated encrypted backups
- Monitoring and uptime alerts
- Error logging
- Server firewall
- Separate production `.env`

## 3. Handover Deliverables

Give the hospital:

- Production URL
- Admin login creation process
- Staff user guide
- Patient support guide
- Backup and restore procedure
- Incident response procedure
- Maintenance contact and support window
- Known limitations list
- Privacy policy and AI disclaimer text
- Payment settlement process
- Server access policy

## 4. Support Boundary

Define these before launch:

- Free support period after delivery
- Monthly maintenance cost
- Emergency response time
- Who fixes server outages
- Who handles payment gateway disputes
- Who handles patient data requests
- Who updates doctor/department data
- Who reviews AI safety complaints

Recommended: sell the website plus a monthly maintenance contract. Hospitals need operational support after launch.

## 5. Go-Live Approval

Before go-live, obtain written sign-off from the hospital for:

- Doctor profiles and fees
- Department list
- Appointment slot rules
- Refund rules
- Payment gateway live-mode test
- Emergency contact details
- Privacy policy
- AI disclaimer and safety limits
- Admin users
- Backup schedule

## 6. Known Risk Areas

These must be reviewed before production use:

- Payment success but token creation failure
- MongoDB connection failure
- Ollama offline or slow
- Incorrect hospital contact information
- Admin accidentally changing slot limits
- Unauthorized staff access to patient data
- Missing backup restore test
- Browser/device compatibility gaps
- No formal legal/privacy review

## 7. Final Acceptance Test

Run this flow with hospital staff:

1. Patient signup
2. Patient login
3. Doctor selection
4. Slot selection
5. Payment success
6. Token generation
7. Invoice download
8. Patient dashboard review
9. AI chatbot safety response
10. AI report summary
11. Admin doctor update
12. Admin appointment review
13. Refund request
14. Backup restore dry run

Do not hand over until this full flow passes on the production domain.
