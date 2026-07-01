import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import helmet from 'helmet';
import { env } from '../config/env.js';

const isAllowedOrigin = (origin) => !origin || env.corsOrigins.includes(origin);

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id']
});

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: env.isProduction
    ? {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'connect-src': ["'self'", ...env.corsOrigins],
          'img-src': ["'self'", 'data:', 'https:'],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"]
        }
      }
    : false
});

export const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many authentication attempts. Please wait and try again.' }
});

export const requestSizeLimit = express.json({
  limit: env.requestBodyLimit,
  // Stash the raw bytes so payment webhooks can verify gateway signatures,
  // which must be computed over the exact unparsed body.
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
});

export const securityMiddleware = [
  helmetMiddleware,
  corsMiddleware,
  cookieParser(),
  compression(),
  requestSizeLimit,
  express.urlencoded({ extended: true, limit: env.requestBodyLimit }),
  xss(),
  apiLimiter
];

