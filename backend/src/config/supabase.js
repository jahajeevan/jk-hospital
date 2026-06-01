import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

if (!env.supabaseUrl || !env.supabaseKey) {
  logger.warn('SUPABASE_URL or SUPABASE_KEY is not set. API will fail database operations until configured.');
}

export const supabase = createClient(
  env.supabaseUrl || 'https://placeholder-url.supabase.co',
  env.supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Helper functions for mapping snake_case db keys to camelCase models and vice-versa
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamel = (str) => str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));

export const toCamelObj = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelObj);
  
  const n = {};
  for (const k of Object.keys(obj)) {
    if (k === 'metadata' || k === 'devices' || k === 'slots') {
      n[k] = toCamelObj(obj[k]);
    } else {
      const camelKey = snakeToCamel(k);
      n[camelKey] = toCamelObj(obj[k]);
    }
  }
  // Mongoose models often expose an _id which maps to SQL id
  if (n.id && !n._id) {
    n._id = n.id;
  }
  // Subdocument compatibility mappings
  if (n.otpCode || n.otpExpiresAt) {
    n.otp = { code: n.otpCode, expiresAt: n.otpExpiresAt };
  }
  if (n.resetOtpCode || n.resetOtpExpiresAt) {
    n.resetOtp = { code: n.resetOtpCode, expiresAt: n.resetOtpExpiresAt };
  }
  if (n.patientName || n.patientAge || n.patientGender || n.patientPhone || n.patientEmail || n.symptoms) {
    n.patientDetails = {
      name: n.patientName,
      age: n.patientAge,
      gender: n.patientGender,
      phone: n.patientPhone,
      email: n.patientEmail,
      symptoms: n.symptoms
    };
  }
  if (n.cancellationReason || n.cancellationExplanation || n.cancelledAt) {
    n.cancellation = {
      reason: n.cancellationReason,
      emergencyExplanation: n.cancellationExplanation,
      cancelledAt: n.cancelledAt
    };
  }
  return n;
};

export const toSnakeObj = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeObj);
  
  const n = {};
  for (const k of Object.keys(obj)) {
    // If the key is _id, convert to id
    const key = k === '_id' ? 'id' : k;
    
    // Explicitly flat map camelCase subdocuments to flat snake_case columns
    if (key === 'otp' && typeof obj[k] === 'object' && obj[k] !== null) {
      n.otp_code = obj[k].code;
      n.otp_expires_at = obj[k].expiresAt;
    } else if (key === 'resetOtp' && typeof obj[k] === 'object' && obj[k] !== null) {
      n.reset_otp_code = obj[k].code;
      n.reset_otp_expires_at = obj[k].expiresAt;
    } else if (key === 'patientDetails' && typeof obj[k] === 'object' && obj[k] !== null) {
      n.patient_name = obj[k].name;
      n.patient_age = obj[k].age;
      n.patient_gender = obj[k].gender;
      n.patient_phone = obj[k].phone;
      n.patient_email = obj[k].email;
      n.symptoms = obj[k].symptoms;
    } else if (key === 'cancellation' && typeof obj[k] === 'object' && obj[k] !== null) {
      n.cancellation_reason = obj[k].reason;
      n.cancellation_explanation = obj[k].emergencyExplanation;
      n.cancelled_at = obj[k].cancelledAt;
    } else if (key === 'metadata' || key === 'devices' || key === 'slots') {
      n[key] = toSnakeObj(obj[key]);
    } else {
      const snakeKey = camelToSnake(key);
      n[snakeKey] = toSnakeObj(obj[key]);
    }
  }
  return n;
};
