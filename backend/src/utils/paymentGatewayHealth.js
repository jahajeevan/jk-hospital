/**
 * Probe Stripe / Razorpay reachability (configured + network).
 */

import { getRazorpayCredentials, razorpayRequest } from './razorpayClient.js';
import { getStripe } from './stripeClient.js';

const probeTimeoutMs = 8000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gateway probe timed out')), ms);
    })
  ]);

export const probeStripe = async () => {
  try {
    getStripe();
  } catch (error) {
    return { configured: false, reachable: false, error: error.message };
  }
  try {
    await withTimeout(getStripe().balance.retrieve(), probeTimeoutMs);
    return { configured: true, reachable: true };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      error: error.message || 'Cannot reach Stripe'
    };
  }
};

export const probeRazorpay = async () => {
  try {
    getRazorpayCredentials();
  } catch (error) {
    return { configured: false, reachable: false, error: error.message };
  }
  try {
    await withTimeout(razorpayRequest('/orders?count=1', { method: 'GET' }), probeTimeoutMs);
    return { configured: true, reachable: true };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      error: error.message || 'Cannot reach Razorpay'
    };
  }
};

/**
 * @param {Error} error
 * @param {'stripe' | 'razorpay'} provider
 */
export const formatGatewayError = (error, provider) => {
  const name = provider === 'stripe' ? 'Stripe' : 'Razorpay';
  const msg = error?.message || '';

  if (msg.includes('connection to Stripe') || error?.type === 'StripeConnectionError') {
    return `Cannot connect to ${name}. Check your internet, VPN/firewall, and that api.stripe.com is reachable.`;
  }
  if (msg === 'fetch failed' || error?.cause?.code === 'ENOTFOUND') {
    return `Cannot connect to ${name} (network/DNS). Check internet and that api.razorpay.com is reachable.`;
  }
  if (error?.statusCode === 401 || msg.toLowerCase().includes('authentication')) {
    return `${name} API keys are invalid. Update keys in backend/.env and restart the server.`;
  }
  return msg || `${name} request failed`;
};
