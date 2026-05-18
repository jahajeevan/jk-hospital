import './utils/networkFix.js';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { connectDB } from './config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5001;

await connectDB();

app.listen(PORT, async () => {
  console.log(`JK Hospital API running on port ${PORT}`);
  try {
    const { probeStripe, probeRazorpay } = await import('./utils/paymentGatewayHealth.js');
    const [s, r] = await Promise.all([probeStripe(), probeRazorpay()]);
    console.log(`Payments: Stripe ${s.reachable ? 'OK' : 'unreachable'} | Razorpay ${r.reachable ? 'OK' : 'unreachable'}`);
  } catch {
    /* optional startup probe */
  }
});
