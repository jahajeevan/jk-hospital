import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || (env.isProduction ? 'info' : 'debug'),
  base: { service: 'jk-hospital-api', environment: env.nodeEnv },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'otp',
      '*.password',
      '*.otp',
      '*.token',
      '*.refreshToken',
      '*.keySecret',
      '*.stripeSecretKey'
    ],
    censor: '[REDACTED]'
  }
});
