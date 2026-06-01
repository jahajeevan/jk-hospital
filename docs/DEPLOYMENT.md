# Deployment Guide

## Required Environment

- `MONGODB_URI`
- `JWT_SECRET` with at least 32 random characters
- `CLIENT_URL`
- `CORS_ORIGINS`
- Payment keys for Stripe and Razorpay when payment gateways are enabled
- `REDIS_URL` for queues, Socket.io adapter, reminders, and caching

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

- Vercel: deploy `frontend`, set `VITE_API_URL` to the backend URL.
- Render/Railway: deploy `backend/Dockerfile`, attach MongoDB Atlas and Redis.
- AWS/Azure/GCP: run API containers behind a load balancer, serve frontend via object storage/CDN, and run MongoDB Atlas or managed-compatible MongoDB.

## Backup

Run `scripts/mongodb-backup.sh` from a secure runner with `MONGODB_URI` and encrypted artifact storage.

