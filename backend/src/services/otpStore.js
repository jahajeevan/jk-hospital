import crypto from 'node:crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_EMAIL = 5;

const otpRecords = new Map();
const requestLog = new Map();

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (email, otp) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || 'jk-otp-pepper').update(`${normalizeEmail(email)}:${otp}`).digest('hex');

const canRequest = (email) => {
  const key = normalizeEmail(email);
  const now = Date.now();
  const entries = (requestLog.get(key) || []).filter((time) => now - time < REQUEST_WINDOW_MS);
  requestLog.set(key, entries);
  return entries.length < MAX_REQUESTS_PER_EMAIL;
};

const trackRequest = (email) => {
  const key = normalizeEmail(email);
  const entries = requestLog.get(key) || [];
  entries.push(Date.now());
  requestLog.set(key, entries);
};

export const issueOtp = (email, purpose = 'verification') => {
  const key = normalizeEmail(email);
  if (!key) {
    const error = new Error('Valid email is required');
    error.statusCode = 400;
    throw error;
  }
  if (!canRequest(key)) {
    const error = new Error('Too many OTP requests. Try again in 15 minutes.');
    error.statusCode = 429;
    throw error;
  }

  const otp = createOtp();
  trackRequest(key);
  otpRecords.set(`${key}:${purpose}`, {
    hash: hashOtp(key, otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0
  });

  return otp;
};

export const verifyStoredOtp = (email, otp, purpose = 'verification') => {
  const key = normalizeEmail(email);
  const record = otpRecords.get(`${key}:${purpose}`);
  if (!record) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }
  if (record.expiresAt < Date.now()) {
    otpRecords.delete(`${key}:${purpose}`);
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  record.attempts += 1;
  if (record.attempts > MAX_ATTEMPTS) {
    otpRecords.delete(`${key}:${purpose}`);
    const error = new Error('Too many invalid OTP attempts');
    error.statusCode = 429;
    throw error;
  }

  const valid = record.hash === hashOtp(key, otp);
  if (!valid) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  otpRecords.delete(`${key}:${purpose}`);
  return true;
};
