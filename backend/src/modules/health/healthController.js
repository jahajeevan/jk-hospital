import { supabase } from '../../config/supabase.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';

export const liveness = (_req, res) => sendSuccess(res, { status: 'ok', service: 'JK Hospital API' });

export const readiness = async (_req, res) => {
  const { error } = await supabase.from('doctors').select('id').limit(1);
  const dbReady = !error;
  const statusCode = dbReady ? 200 : 503;
  
  return sendSuccess(
    res,
    {
      status: dbReady ? 'ready' : 'degraded',
      checks: {
        supabase: dbReady ? 'connected' : 'disconnected',
        redis: env.redisUrl ? 'configured' : 'not_configured'
      }
    },
    statusCode
  );
};
