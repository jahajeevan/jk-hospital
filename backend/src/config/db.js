import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  logger.info('Supabase database client initialized');
};
