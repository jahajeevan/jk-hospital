# JK Hospital

A full-stack hospital appointment and token-management platform for booking, payments, invoices, refunds, and staff administration.

**Live site:** https://jk-hospital-six.vercel.app

## Technology

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, React Router, and Axios
- **Backend:** Node.js, Express, MongoDB/Mongoose, JWT, Nodemailer, and REST APIs

## Run locally

1. Install dependencies:

```bash
npm run install:all
```

2. Configure environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Set local credentials in the two `.env` files. Never commit these files.

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

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:5001/api`.

## Quality checks

```bash
npm test
npm run audit
```

## Security note

This repository is shared for portfolio and technical reference. Use fresh credentials and secure production configuration before deploying any fork.
