/**
 * Razorpay REST client via node:https (reliable DNS/IPv4 on Node 18+).
 */
import https from 'node:https';

export const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    const error = new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env');
    error.statusCode = 503;
    throw error;
  }
  if (process.env.RAZORPAY_ALLOW_TEST_MODE !== 'true' && keyId.startsWith('rzp_test_')) {
    const error = new Error(
      'Razorpay test mode is active. Set RAZORPAY_ALLOW_TEST_MODE=true in backend/.env for test keys.'
    );
    error.statusCode = 503;
    throw error;
  }
  return { keyId, keySecret };
};

/**
 * @param {string} path — e.g. `/orders`
 * @param {{ method?: string, body?: object }} [options]
 */
export const razorpayRequest = (path, { method = 'POST', body } = {}) => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.razorpay.com',
        port: 443,
        path: `/v1${path}`,
        method,
        family: 4,
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        },
        timeout: 30000
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let data;
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            reject(Object.assign(new Error('Invalid response from Razorpay'), { statusCode: 502 }));
            return;
          }
          if (res.statusCode && res.statusCode >= 400) {
            const error = new Error(data.error?.description || 'Razorpay request failed');
            error.statusCode = res.statusCode;
            reject(error);
            return;
          }
          resolve(data);
        });
      }
    );

    req.on('error', (error) => {
      const wrapped = new Error(error.message || 'Could not reach Razorpay');
      wrapped.statusCode = 503;
      wrapped.cause = error;
      reject(wrapped);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(Object.assign(new Error('Razorpay request timed out'), { statusCode: 504 }));
    });

    if (payload) req.write(payload);
    req.end();
  });
};

/**
 * Issue a refund for a captured Razorpay payment.
 * @param {string} paymentId — razorpay_payment_id
 * @param {number} amountInRupees — full or partial amount to refund
 */
export const refundRazorpayPayment = (paymentId, amountInRupees) =>
  razorpayRequest(`/payments/${paymentId}/refund`, {
    body: { amount: Math.round(Number(amountInRupees) * 100) }
  });
