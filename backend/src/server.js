import './utils/networkFix.js';
import { createServer } from 'node:http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env, validateEnv } from './config/env.js';
import { initRealtime } from './modules/realtime/socket.js';
import { logger } from './utils/logger.js';
import { seedDoctors } from './services/seedService.js';

validateEnv();

const shutdown = async (server, signal) => {
  logger.info({ signal }, 'shutdown requested');
  server.close(async () => {
    logger.info('shutdown complete');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

await connectDB();

// Seed doctors into Supabase on startup
await seedDoctors();

const server = createServer(app);
initRealtime(server);

server.listen(env.port, async () => {
  logger.info({ port: env.port }, 'JK Hospital API running');
  try {
    const { probeStripe, probeRazorpay } = await import('./utils/paymentGatewayHealth.js');
    const [s, r] = await Promise.all([probeStripe(), probeRazorpay()]);
    logger.info({ stripe: s.reachable, razorpay: r.reachable }, 'payment gateway startup probe complete');
  } catch {
    /* optional startup probe */
  }
});

process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
process.on('SIGINT', () => shutdown(server, 'SIGINT'));
process.on('unhandledRejection', (error) => {
  logger.error({ error }, 'unhandled promise rejection');
  shutdown(server, 'unhandledRejection');
});
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'uncaught exception');
  process.exit(1);
});
