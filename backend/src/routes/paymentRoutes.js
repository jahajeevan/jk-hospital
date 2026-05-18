import express from 'express';
import {
  confirmCheckoutSession,
  confirmLocalCheckoutSession,
  createRazorpayOrder,
  createCheckoutSession,
  createLocalCheckoutSession,
  getPaymentConfig,
  verifyRazorpayOrder
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/config', getPaymentConfig);
router.post('/local-checkout-session', createLocalCheckoutSession);
router.post('/local-checkout-session/confirm', confirmLocalCheckoutSession);
router.post('/razorpay-order', createRazorpayOrder);
router.post('/razorpay-order/verify', verifyRazorpayOrder);
router.post('/checkout-session', protect, createCheckoutSession);
router.post('/checkout-session/confirm', protect, confirmCheckoutSession);

export default router;
