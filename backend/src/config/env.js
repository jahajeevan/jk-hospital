import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../../.env') });

const parseList = (value, fallback = []) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .concat(fallback)
    .filter((item, index, all) => all.indexOf(item) === index);

const defaultCorsOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:8080'
];

const requiredInProduction = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET', 'CLERK_SECRET_KEY'];

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5001),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  corsOrigins: parseList(process.env.CORS_ORIGINS, defaultCorsOrigins),
  jwtSecret: process.env.JWT_SECRET,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  clerkAdminEmails: process.env.CLERK_ADMIN_EMAILS || 'admin@jkhospital.local',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30),
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME || 'jkh_refresh',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 250),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '2mb',
  trustProxy: process.env.TRUST_PROXY === 'true',
  redisUrl: process.env.REDIS_URL,
  sentryDsn: process.env.SENTRY_DSN,
  aiProvider: process.env.AI_PROVIDER || 'ollama',
  ollamaModel: process.env.OLLAMA_MODEL || 'gemma3:4b',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 25000),
  ollamaRetries: Number(process.env.OLLAMA_RETRIES || 1),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  apiVersion: 'v1'
};

export const validateEnv = () => {
  const missing = requiredInProduction.filter((key) => env.isProduction && !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    const message = 'JWT_SECRET should be at least 32 characters for production-grade signing.';
    if (env.isProduction) throw new Error(message);
    console.warn(message);
  }
};
