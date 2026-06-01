import { body } from 'express-validator';

export const signupRules = [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 10 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
  body('phone').optional().trim().isLength({ min: 8 })
];

export const loginRules = [body('email').isEmail().normalizeEmail(), body('password').notEmpty()];

export const otpRules = [body('email').isEmail().normalizeEmail(), body('otp').isLength({ min: 6, max: 6 })];

export const resetPasswordRules = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('password')
    .isLength({ min: 10 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage('Password must include uppercase, lowercase, number, and symbol')
];
