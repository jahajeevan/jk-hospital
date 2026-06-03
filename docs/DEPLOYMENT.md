# Deployment Guide

## Required Environment

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `JWT_SECRET` with at least 32 random characters
- `CLIENT_URL`
- `CORS_ORIGINS`
- Payment keys for Stripe and Razorpay when payment gateways are enabled
- `REDIS_URL` for queues, Socket.io adapter, reminders, and caching
- `OLLAMA_MODEL=gemma3:4b` when using the local AI provider

## Local Production Smoke Test

```sh
docker compose up --build
```

Open `http://localhost:8080` and verify:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /api/v1/docs`
- Signup/login/payment/booking flows

## Cloud Targets

- Vercel/Netlify: deploy `frontend`, set `VITE_API_URL=https://api.jahajeevan.me/api`.
- Vercel/Netlify: set `VITE_CLERK_PUBLISHABLE_KEY` to the live Clerk key for `clerk.jahajeevan.me`. A key for a misspelled Clerk domain will make the React app render the generic "workspace" error screen.
- Render/Railway/Fly/VPS: deploy `backend/Dockerfile`, set Supabase, Clerk, Razorpay, email, Redis, and AI environment variables.
- AWS/Azure/GCP: run API containers behind a load balancer, serve frontend via object storage/CDN, and use Supabase for the production database.

## Backup

Use Supabase scheduled backups/PITR where available. For manual exports, use Supabase dashboard backups or `pg_dump` from a secure runner with encrypted artifact storage.
