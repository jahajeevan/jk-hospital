import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createOtp, otpExpiry } from '../utils/otp.js';
import { signToken } from '../utils/token.js';
import { sendOtpEmail } from '../services/emailService.js';

const authResponse = (user) => ({
  token: signToken(user),
  user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }
});

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const exists = await User.findOne({ email });
  if (exists) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const otp = createOtp();
  const user = await User.create({ name, email, password, phone, otp: { code: otp, expiresAt: otpExpiry() } });
  await sendOtpEmail(email, otp, 'email verification');
  res.status(201).json(authResponse(user));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || user.otp?.code !== req.body.otp || user.otp.expiresAt < new Date()) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  user.isVerified = true;
  user.otp = undefined;
  await user.save();
  res.json(authResponse(user));
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }
  res.json(authResponse(user));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const otp = createOtp();
    user.resetOtp = { code: otp, expiresAt: otpExpiry() };
    await user.save();
    await sendOtpEmail(user.email, otp, 'password reset');
  }
  res.json({ exists: Boolean(user), message: user ? 'Password reset OTP sent.' : 'Email is not registered.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || user.resetOtp?.code !== req.body.otp || user.resetOtp.expiresAt < new Date()) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }
  user.password = req.body.password;
  user.resetOtp = undefined;
  await user.save();
  res.json({ message: 'Password reset successful' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
