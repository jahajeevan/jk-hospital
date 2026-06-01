# JK Hospital Enterprise Architecture

## Runtime

- Frontend: React + Vite with route-level lazy loading, reusable UI primitives, error boundary, theme provider, and centralized API client.
- Backend: Express API with versioned routes at `/api/v1`, legacy-compatible `/api` routes, controller/service/repository-ready structure, JWT auth, refresh-token rotation, RBAC permissions, structured logs, request IDs, and centralized error handling.
- Database: MongoDB + Mongoose with targeted indexes, timestamps, soft-delete fields, and transaction-ready models.
- Realtime: Socket.io architecture for live notifications, appointment updates, queue updates, admin updates, and payment-status events.
- Async jobs: BullMQ/Redis architecture for notifications, reminders, payment recovery, report processing, and future AI workflows.

## Feature Boundaries

- Auth: signup, verification, login, lockout, refresh, logout, session tracking, RBAC.
- Appointments: slot allocation, token queue, cancellation, rescheduling, invoice generation.
- Slot policy: booking defaults to the current date, future tokens are allowed only inside each doctor slot's admin-configured availability window, and same-day bookings respect a configurable advance cutoff that defaults to 60 minutes.
- Payments: Stripe, Razorpay, local/manual proof guard, idempotent confirmation path.
- Admin: operational overview, bookings, doctor management, status updates.
- Healthcare extensions: medical records, prescriptions, reports, reminders, analytics, and AI assistant should be added as separate modules under `src/modules`.

## Scale Readiness

- Backend remains stateless; sessions are represented by refresh-token records and optional Redis-backed queues.
- Use MongoDB Atlas replica sets for transactions, PITR backups, metrics, and read scaling.
- Use CDN for frontend assets and signed URLs for report/media delivery.
