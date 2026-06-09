import bcrypt from 'bcryptjs';
import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createOtp, otpExpiry } from '../utils/otp.js';
import { signToken } from '../utils/token.js';
import { sendOtpEmail } from '../services/emailService.js';
import { createRefreshToken, revokeRefreshToken, rotateRefreshToken } from '../services/sessionService.js';
import { env } from '../config/env.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'none' : 'lax',
  path: '/api'
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified
});

const isUserLocked = (user) => {
  return Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date());
};

const comparePassword = (candidate, hashedPassword) => {
  return bcrypt.compare(candidate, hashedPassword);
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const authResponse = async (req, res, user, statusCode = 200) => {
  const { token: refreshToken } = await createRefreshToken({ user, req });
  if (refreshToken) {
    res.cookie(env.refreshTokenCookieName, refreshToken, {
      ...cookieOptions,
      maxAge: env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000
    });
  }
  return res.status(statusCode).json({ token: signToken(user), user: publicUser(user) });
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  
  const { data: existingUsers } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .is('deleted_at', null)
    .limit(1);

  if (existingUsers?.length) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const otp = createOtp();
  const hashedPassword = await hashPassword(password);
  
  const { data: newUsers, error: createError } = await supabase
    .from('users')
    .insert(toSnakeObj({
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone,
      otpCode: otp,
      otpExpiresAt: otpExpiry(),
      passwordChangedAt: new Date()
    }))
    .select('*');

  if (createError) throw createError;
  const user = toCamelObj(newUsers?.[0]);
  
  await sendOtpEmail(email, otp, 'email verification');
  await authResponse(req, res, user, 201);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .is('deleted_at', null)
    .limit(1);

  const user = toCamelObj(users?.[0]);
  if (!user || user.otp?.code !== otp || new Date(user.otp?.expiresAt) < new Date()) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  const { data: updatedUsers, error: updateError } = await supabase
    .from('users')
    .update(toSnakeObj({
      isVerified: true,
      otpCode: null,
      otpExpiresAt: null
    }))
    .eq('id', user.id)
    .select('*');

  if (updateError) throw updateError;
  await authResponse(req, res, toCamelObj(updatedUsers?.[0]));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .is('deleted_at', null)
    .limit(1);

  const user = toCamelObj(users?.[0]);
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (isUserLocked(user)) {
    const error = new Error('Account temporarily locked after repeated failed login attempts');
    error.statusCode = 423;
    throw error;
  }

  if (!(await comparePassword(password, user.password))) {
    const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    const lockedUntil = failedLoginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    
    await supabase
      .from('users')
      .update(toSnakeObj({
        failedLoginAttempts,
        lockedUntil
      }))
      .eq('id', user.id);

    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const { data: updatedUsers, error: updateError } = await supabase
    .from('users')
    .update(toSnakeObj({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: req.ip
    }))
    .eq('id', user.id)
    .select('*');

  if (updateError) throw updateError;
  await authResponse(req, res, toCamelObj(updatedUsers?.[0]));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .is('deleted_at', null)
    .limit(1);

  const user = toCamelObj(users?.[0]);
  if (user) {
    const otp = createOtp();
    await supabase
      .from('users')
      .update(toSnakeObj({
        resetOtpCode: otp,
        resetOtpExpiresAt: otpExpiry()
      }))
      .eq('id', user.id);

    await sendOtpEmail(user.email, otp, 'password reset');
  }
  res.json({ exists: Boolean(user), message: user ? 'Password reset OTP sent.' : 'Email is not registered.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .is('deleted_at', null)
    .limit(1);

  const user = toCamelObj(users?.[0]);
  if (!user || user.resetOtp?.code !== otp || new Date(user.resetOtp?.expiresAt) < new Date()) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(password);
  const { error: updateError } = await supabase
    .from('users')
    .update(toSnakeObj({
      password: hashedPassword,
      resetOtpCode: null,
      resetOtpExpiresAt: null,
      passwordChangedAt: new Date()
    }))
    .eq('id', user.id);

  if (updateError) throw updateError;
  res.json({ message: 'Password reset successful' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const refresh = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.[env.refreshTokenCookieName] || req.body.refreshToken;
  const rotated = await rotateRefreshToken({ token: incoming, req });
  if (!rotated) {
    const error = new Error('Refresh token is invalid or expired');
    error.statusCode = 401;
    throw error;
  }

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('id', rotated.userId)
    .limit(1);

  const user = toCamelObj(users?.[0]);
  if (!user || !user.isActive || user.deletedAt) {
    const error = new Error('User not authorized');
    error.statusCode = 401;
    throw error;
  }

  res.cookie(env.refreshTokenCookieName, rotated.refreshToken, {
    ...cookieOptions,
    maxAge: env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000
  });
  res.json({ token: signToken(user), user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRefreshToken(req.cookies?.[env.refreshTokenCookieName] || req.body.refreshToken);
  res.clearCookie(env.refreshTokenCookieName, cookieOptions);
  res.json({ message: 'Logged out securely' });
});
