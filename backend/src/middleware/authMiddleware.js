import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { clerkClient, getAuth } from '@clerk/express';
import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hasPermission } from '../config/permissions.js';
import { env } from '../config/env.js';

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const adminEmails = new Set(
  String(process.env.CLERK_ADMIN_EMAILS || 'admin@jkhospital.local')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
);

const getPrimaryEmail = (clerkUser) =>
  clerkUser.emailAddresses?.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
  clerkUser.emailAddresses?.[0]?.emailAddress ||
  '';

const roleFromClerkUser = (clerkUser, email) => {
  const metadataRole = clerkUser.publicMetadata?.role || clerkUser.privateMetadata?.role;
  if (['admin', 'doctor', 'receptionist', 'pharmacist', 'staff', 'patient'].includes(metadataRole)) return metadataRole;
  return adminEmails.has(normalizeEmail(email)) ? 'admin' : 'patient';
};

const syncClerkUser = async (clerkUserId) => {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = normalizeEmail(getPrimaryEmail(clerkUser));
  if (!email) {
    const error = new Error('Clerk user does not have a verified email address');
    error.statusCode = 401;
    throw error;
  }

  const role = roleFromClerkUser(clerkUser, email);
  const hospitalProfile = clerkUser.unsafeMetadata?.hospitalProfile || {};
  const metadataName = hospitalProfile.fullName || [hospitalProfile.firstName, hospitalProfile.lastName].filter(Boolean).join(' ');
  const name = metadataName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.fullName || email.split('@')[0];
  const phone = hospitalProfile.phone || clerkUser.phoneNumbers?.find((item) => item.id === clerkUser.primaryPhoneNumberId)?.phoneNumber || clerkUser.phoneNumbers?.[0]?.phoneNumber || '';

  const { data: users, error: findError } = await supabase
    .from('users')
    .select('*')
    .or(`clerk_id.eq.${clerkUserId},email.eq.${email}`)
    .is('deleted_at', null)
    .limit(1);

  let user = toCamelObj(users?.[0]) || null;
  if (!user) {
    const { data: newUsers, error: createError } = await supabase
      .from('users')
      .insert(toSnakeObj({
        clerkId: clerkUserId,
        name,
        email,
        phone,
        role,
        isVerified: true,
        password: crypto.randomBytes(32).toString('hex')
      }))
      .select('*');
    if (createError) throw createError;
    return toCamelObj(newUsers?.[0]);
  }

  const { data: updatedUsers, error: updateError } = await supabase
    .from('users')
    .update(toSnakeObj({
      clerkId: clerkUserId,
      name,
      email,
      phone: phone || user.phone,
      role,
      isVerified: true,
      lastLoginAt: new Date()
    }))
    .eq('id', user.id)
    .select('*');
  if (updateError) throw updateError;
  return toCamelObj(updatedUsers?.[0]);
};

export const protect = asyncHandler(async (req, _res, next) => {
  let auth = null;
  try {
    auth = env.clerkSecretKey ? getAuth(req) : null;
  } catch {
    auth = null;
  }
  if (auth?.userId) {
    const user = await syncClerkUser(auth.userId);
    if (!user || !user.isActive || user.deletedAt) {
      const error = new Error('User not authorized');
      error.statusCode = 401;
      throw error;
    }
    req.user = user;
    req.auth = auth;
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], env.jwtSecret);
  } catch {
    const error = new Error('Please login again');
    error.statusCode = 401;
    throw error;
  }
  
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.id)
    .is('deleted_at', null)
    .limit(1);

  const user = toCamelObj(users?.[0]) || null;
  if (!user || !user.isActive || user.deletedAt) {
    const error = new Error('User not authorized');
    error.statusCode = 401;
    throw error;
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    const error = new Error('Insufficient permissions');
    error.statusCode = 403;
    return next(error);
  }
  next();
};

export const requirePermission = (...permissions) => (req, _res, next) => {
  const missing = permissions.filter((permission) => !hasPermission(req.user.role, permission));
  if (missing.length) {
    const error = new Error('Insufficient permissions');
    error.statusCode = 403;
    return next(error);
  }
  next();
};

// Convenience middleware for common use cases
export const requireUser = protect;

export const requireAdmin = (req, res, next) => {
  protect(req, res, (err) => {
    if (err) return next(err);
    authorize('admin')(req, res, next);
  });
};
