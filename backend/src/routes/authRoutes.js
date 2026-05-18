import express from 'express';
import { forgotPassword, login, me, resetPassword, signup, verifyEmail } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { loginRules, otpRules, signupRules } from '../validators/authValidators.js';

const router = express.Router();

router.post('/signup', signupRules, validate, signup);
router.post('/verify-email', otpRules, validate, verifyEmail);
router.post('/login', loginRules, validate, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, me);

export default router;

