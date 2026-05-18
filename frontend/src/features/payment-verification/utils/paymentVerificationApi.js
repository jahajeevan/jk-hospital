/**
 * Payment verification API — Razorpay + Stripe Checkout (local-storage mode).
 */

import api, { formatApiError } from '../../../api/client.js';

/**
 * @typedef {Object} VerifiedPayment
 * @property {number} amount
 * @property {string} currency
 * @property {'razorpay' | 'stripe'} method
 * @property {'success'} status
 * @property {string} transactionId
 * @property {string} [razorpayOrderId]
 * @property {string} [razorpayPaymentId]
 * @property {string} [stripeSessionId]
 * @property {string} paidAt
 */

/**
 * @typedef {Object} PaymentProviderConfig
 * @property {boolean} razorpay
 * @property {boolean} stripe
 */

/**
 * Fetch which payment providers are configured on the server.
 * @returns {Promise<PaymentProviderConfig>}
 */
export const fetchPaymentConfig = async () => {
  const { data } = await api.get('/payments/config');
  return data;
};

/**
 * Create Razorpay order.
 */
export const createRazorpayOrder = async (payload) => {
  const { data } = await api.post('/payments/razorpay-order', payload);
  return data;
};

/**
 * Verify Razorpay payment after checkout handler.
 * @param {Record<string, unknown>} razorpayResponse
 * @param {number} amount
 * @returns {Promise<{ verified: boolean, payment: VerifiedPayment }>}
 */
export const verifyRazorpayPayment = async (razorpayResponse, amount) => {
  const { data } = await api.post('/payments/razorpay-order/verify', {
    ...razorpayResponse,
    amount
  });
  return data;
};

/**
 * Create Stripe Checkout session (local appointment flow).
 */
export const createStripeCheckoutSession = async (payload) => {
  const { data } = await api.post('/payments/local-checkout-session', payload);
  return data;
};

/**
 * Confirm Stripe session after redirect return.
 * @param {string} sessionId
 * @returns {Promise<{ verified: boolean, payment: VerifiedPayment }>}
 */
export const confirmStripeSession = async (sessionId) => {
  const { data } = await api.post('/payments/local-checkout-session/confirm', { sessionId });
  return data;
};

/**
 * Normalize API errors for UI display.
 * @param {unknown} error
 */
export const getVerificationErrorMessage = (error) => {
  if (error && typeof error === 'object' && 'friendlyMessage' in error) {
    return /** @type {{ friendlyMessage?: string }} */ (error).friendlyMessage;
  }
  return formatApiError(error);
};
