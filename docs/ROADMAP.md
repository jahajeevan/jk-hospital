# Enterprise Roadmap

## Critical

- Add integration tests for auth, payments, booking duplicate prevention, and admin authorization.
- Move report uploads to Cloudinary/S3 with signed URLs and malware-scanning workflow.
- Add MongoDB transaction sessions around payment-to-appointment creation on replica-set deployments.

## Next

- Add medical records, prescriptions, patient timeline, and doctor notes modules.
- Add appointment reminders through BullMQ workers and SMS/email providers.
- Add Redis-backed API caching for doctor availability and dashboard analytics.
- Add Socket.io Redis adapter for multi-instance realtime fanout.

## Later

- Add TypeScript migration, domain events, OpenTelemetry traces, Sentry release tracking, and data retention policies.
- Add consent management, PHI export, access-review dashboards, and break-glass emergency access.

