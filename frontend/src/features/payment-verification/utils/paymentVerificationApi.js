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
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    const error = new Error('Payment server returned an invalid response. The site may be pointing at the wrong API URL.');
    error.code = 'ERR_BAD_PAYMENT_CONFIG';
    throw error;
  }
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
export const verifyRazorpayPayment = async (razorpayResponse, amount, booking) => {
  const { data } = await api.post('/payments/razorpay-order/verify', {
    ...razorpayResponse,
    amount,
    booking: booking ? {
      doctorId: booking.doctor?._id || booking.doctor?.id,
      doctorEmail: booking.doctor?.email,
      doctorName: booking.doctor?.name,
      slotId: booking.slot?._id || booking.slot?.id,
      slotLabel: booking.slot?.label,
      appointmentDate: booking.date,
      patientDetails: booking.patient
    } : undefined
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
export const confirmStripeSession = async (sessionId, booking) => {
  const { data } = await api.post('/payments/local-checkout-session/confirm', {
    sessionId,
    booking: booking ? {
      doctorId: booking.doctor?._id || booking.doctor?.id,
      doctorEmail: booking.doctor?.email,
      doctorName: booking.doctor?.name,
      slotId: booking.slot?._id || booking.slot?.id,
      slotLabel: booking.slot?.label,
      appointmentDate: booking.date,
      patientDetails: booking.patient
    } : undefined
  });
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
