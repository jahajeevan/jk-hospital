# JK Hospital Project Summary

## What We Built

JK Hospital is a responsive hospital token booking and patient portal website. Patients can sign in, book OP tokens, choose doctors and slots, pay online, view appointments, download invoices, request refunds, and use an AI assistant for visit preparation and medical record summaries. Admin/staff users can manage doctors, appointments, slots, payments, refunds, and operational data.

## Frontend

- React for the user interface.
- Vite for fast development and production builds.
- React Router for page routing.
- Tailwind CSS plus custom CSS for responsive design, glass UI, cards, grids, and mobile layouts.
- Framer Motion for page transitions and UI animations.
- Lucide React for icons.
- Recharts for admin analytics charts.
- React Hot Toast for success/error notifications.
- jsPDF and html2canvas for invoice/PDF generation.

## Authentication

- Clerk for sign in, sign up, Google login, session handling, and user profile management.
- Role-based access for patient and admin/staff areas.
- Profile completion checks for required patient information.

## Backend

- Node.js with Express for API routes.
- Supabase integration for persistent data storage.
- REST APIs for authentication sync, appointments, doctors, payments, refunds, local mail, and AI features.
- Security middleware for headers, rate limiting, and request validation.

## Payments

- Razorpay payment flow for online payment verification.
- Local payment verification utilities for checkout, status display, success/failure feedback, audio/haptics, and token confirmation.
- Stripe/local checkout support code is also present for payment flow flexibility.

## AI Features

- Local AI assistant powered by Ollama with Gemma 3.
- AI routes for hospital FAQ, symptom routing, emergency triage, report summaries, prescription explanations, doctor-note formatting, and appointment autofill.
- AI safety policy and medical disclaimer are documented.

## Data And Storage

- Supabase is used by the backend for server-side records.
- Browser local/session storage is used for demo/local patient bookings, pending payment state, AI chat session data, and local medical records.
- Secure storage utilities are used for sensitive local data handling.

## Main Pages

- Landing page.
- Login, signup, and admin login.
- Doctors page.
- Services page.
- Contact page.
- Smart AI assistant page.
- Appointment booking flow.
- Payment checkout and success page.
- Patient dashboard.
- Profile completion/profile page.
- Admin dashboard.

## Mobile Work

- Mobile-first responsive layout.
- Fixed hamburger drawer with background scroll lock.
- Compact patient dashboard layout.
- Mobile card layouts for dense admin booking data.
- Overflow protection for emails, URLs, transaction IDs, appointment metadata, AI messages, and long dynamic content.
- Verified no horizontal scroll at common phone widths.

## Deployment

- Frontend is deployed on Vercel.
- Production domain: `jahajeevan.me`.
- GitHub is used for version control and deployment trigger.
