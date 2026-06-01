import { Queue } from 'bullmq';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const connection = env.redisUrl ? { url: env.redisUrl } : undefined;

export const queues = {
  notifications: connection ? new Queue('notifications', { connection }) : null,
  payments: connection ? new Queue('payments', { connection }) : null
};

export const addJob = async (queueName, name, data, options = {}) => {
  const queue = queues[queueName];
  if (!queue) {
    logger.debug({ queueName, name }, 'queue skipped because REDIS_URL is not configured');
    return null;
  }
  return queue.add(name, data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, ...options });
};

