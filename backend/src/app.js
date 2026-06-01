import express from 'express';
import { clerkMiddleware } from '@clerk/express';
import { fileURLToPath } from 'node:url';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import refundRoutes from './routes/refundRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import localMailRoutes from './routes/localMailRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { requestContext } from './middleware/requestContext.js';
import { authLimiter, securityMiddleware } from './middleware/security.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import healthRoutes from './modules/health/healthRoutes.js';

const app = express();
const openApiDocument = YAML.load(fileURLToPath(new URL('./docs/openapi.yaml', import.meta.url)));

if (env.trustProxy) app.set('trust proxy', 1);

app.disable('x-powered-by');
if (env.clerkSecretKey) {
  app.use(clerkMiddleware());
} else {
  logger.warn('CLERK_SECRET_KEY is not set; Clerk API auth is disabled until configured.');
}
app.use(requestContext);
app.use(
  pinoHttp({
    logger,
    customProps: (req, res) => ({ requestId: req.requestId || res.locals.requestId }),
    autoLogging: { ignore: (req) => req.url.includes('/health/live') }
  })
);
app.use(securityMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hospital: 'JK Hospital', emergency: '7845265507', requestId: res.locals.requestId });
});

const mountApiRoutes = (prefix) => {
  app.use(`${prefix}/health`, healthRoutes);
  app.use(`${prefix}/docs`, swaggerUi.serveFiles(openApiDocument), swaggerUi.setup(openApiDocument));
  app.use(`${prefix}/auth`, authLimiter, authRoutes);
  app.use(`${prefix}/doctors`, doctorRoutes);
  app.use(`${prefix}/appointments`, appointmentRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/refunds`, refundRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/local-mail`, localMailRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
};

mountApiRoutes('/api');
mountApiRoutes(`/api/${env.apiVersion}`);

app.use(notFound);
app.use(errorHandler);

export default app;
