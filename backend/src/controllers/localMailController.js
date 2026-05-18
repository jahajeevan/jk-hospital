import { asyncHandler } from '../utils/asyncHandler.js';
import { issueOtp, verifyStoredOtp } from '../services/otpStore.js';
import { sendOtpEmail, sendStatusEmail } from '../services/emailService.js';

export const requestOtp = asyncHandler(async (req, res) => {
  const { email, purpose = 'verification' } = req.body;
  if (!email) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  const otp = issueOtp(email, purpose);
  await sendOtpEmail(email, otp, purpose);
  res.json({ message: 'OTP sent', expiresInMinutes: 10 });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, purpose = 'verification' } = req.body;
  if (!email || !otp) {
    const error = new Error('Email and OTP are required');
    error.statusCode = 400;
    throw error;
  }

  verifyStoredOtp(email, otp, purpose);
  res.json({ verified: true });
});

export const sendLocalAppointmentStatus = asyncHandler(async (req, res) => {
  const subject = `JK Hospital appointment ${req.body.status}`;
  const message = `Hello ${req.body.patientName || 'Patient'}, your appointment token ${req.body.tokenNumber} with ${req.body.doctorName} is ${req.body.status}. ${req.body.adminNote || ''}`;
  await sendStatusEmail(req.body.email, subject, message);
  res.json({ message: 'Status email sent' });
});
