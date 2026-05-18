# JK Hospital

Premium hospital appointment, token queue, payment, invoice, refund, and admin management platform.

## Project Structure

- `backend`: Node.js, Express, MongoDB, Mongoose, JWT, Nodemailer, MVC REST API.
- `frontend`: React, Vite, Tailwind CSS, Framer Motion, React Router, Axios, Context API.

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Configure environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Update `backend/.env` with MongoDB Atlas, JWT, and Gmail SMTP values. Credentials must stay in `.env`.

4. Seed sample data:

```bash
npm run seed
```

5. Start both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5001/api`

## Run Anytime From Terminal

Open Terminal and run:

```bash
cd "/Users/jahajeevan/JK Hospital"
npm run dev
```

Keep that terminal window open while using the website. Stop it with `Ctrl+C`.

If you see `EADDRINUSE` or `port 5001`, it means the backend is already running. Use:

```bash
npm run stop
npm run dev
```

Or in one command:

```bash
npm run restart
```

For frontend only:

```bash
npm run dev --prefix frontend
```

For backend mail/API only:

```bash
npm run dev --prefix backend
```

## Current Local-First Mode (Encrypted)

MongoDB is **not required** for now. All patient accounts, doctors, slots, bookings, and refunds are stored in **AES-GCM encrypted browser storage** on this device.

- OTP is generated on the server and verified through `/api/local-mail/request-otp` and `/api/local-mail/verify-otp` (not in client code).
- Passwords are hashed with PBKDF2 before storage.
- Admin panel requires login as `admin@jkhospital.local` **and** a staff password (set on first unlock, min 10 characters).

Admin dashboard: `http://localhost:5173/admin`

## Default Seed Users (local encrypted store)

Configure in `frontend/.env` or use defaults:

- Admin: `admin@jkhospital.local` / `Admin@12345`
- Patient: `patient@jkhospital.local` / `Patient@12345`

## Required Backend Environment

```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
EMAIL_USER=your.gmail.address@gmail.com
EMAIL_PASS=your_gmail_app_password
UPI_ID=jahajeevan@fam
CONSULTATION_FEE=500
STRIPE_SECRET_KEY=sk_test_replace_me
RAZORPAY_KEY_ID=rzp_live_or_test_key
RAZORPAY_KEY_SECRET=razorpay_secret
RAZORPAY_ALLOW_TEST_MODE=false
ALLOW_MANUAL_PAYMENT_PROOFS=false
```

## Notes

- Gmail SMTP is configured through environment variables only.
- Razorpay Checkout is used for appointment payments. Use `rzp_live_...` keys in `backend/.env` when users should really pay; `rzp_test_...` keys are rejected unless `RAZORPAY_ALLOW_TEST_MODE=true` is set for development testing.
- The sample frontend can run against the API and includes graceful demo data for visual review before MongoDB is configured.
- Invoice PDFs are generated on the backend with PDFKit and on the frontend with jsPDF for download convenience.
