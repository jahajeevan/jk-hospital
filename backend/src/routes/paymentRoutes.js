import express from 'express';
import {
  confirmCheckoutSession,
  confirmLocalCheckoutSession,
  createRazorpayOrder,
  createCheckoutSession,
  createLocalCheckoutSession,
  getPaymentConfig,
  razorpayWebhook,
  stripeWebhook,
  verifyRazorpayOrder
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/config', getPaymentConfig);

// Gateway webhooks — authenticated by signature verification inside the
// handler, not by user session. Must stay unauthenticated so Stripe/Razorpay
// servers can reach them.
router.post('/webhooks/stripe', stripeWebhook);
router.post('/webhooks/razorpay', razorpayWebhook);

router.post('/local-checkout-session', protect, createLocalCheckoutSession);
router.post('/local-checkout-session/confirm', protect, confirmLocalCheckoutSession);
router.post('/razorpay-order', protect, createRazorpayOrder);
router.post('/razorpay-order/verify', protect, verifyRazorpayOrder);
router.post('/checkout-session', protect, createCheckoutSession);
router.post('/checkout-session/confirm', protect, confirmCheckoutSession);

export default router;
