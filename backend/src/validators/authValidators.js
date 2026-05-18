import { body } from 'express-validator';

export const signupRules = [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('phone').optional().trim().isLength({ min: 8 })
];

export const loginRules = [body('email').isEmail().normalizeEmail(), body('password').notEmpty()];

export const otpRules = [body('email').isEmail().normalizeEmail(), body('otp').isLength({ min: 6, max: 6 })];

