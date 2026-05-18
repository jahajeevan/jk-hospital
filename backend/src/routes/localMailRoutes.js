import express from 'express';
import rateLimit from 'express-rate-limit';
import { requestOtp, sendLocalAppointmentStatus, verifyOtp } from '../controllers/localMailController.js';

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please wait and try again.' }
});

router.post('/request-otp', otpLimiter, requestOtp);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/appointment-status', sendLocalAppointmentStatus);

export default router;
