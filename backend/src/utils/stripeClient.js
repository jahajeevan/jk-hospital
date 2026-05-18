/**
 * Shared Stripe client — Node HTTPS agent with IPv4.
 */
import https from 'node:https';
import Stripe from 'stripe';

let stripe;

export const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    const error = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in backend/.env');
    error.statusCode = 503;
    throw error;
  }

  if (!stripe) {
    const agent = new https.Agent({ keepAlive: true, family: 4 });
    stripe = new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
      maxNetworkRetries: 2,
      timeout: 30000,
      httpClient: Stripe.createNodeHttpClient(agent)
    });
  }

  return stripe;
};
