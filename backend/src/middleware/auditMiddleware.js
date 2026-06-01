import { supabase, toSnakeObj } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export const audit = (action, resource) => async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    
    supabase
      .from('audit_logs')
      .insert(toSnakeObj({
        actorId: req.user?._id,
        action,
        resource,
        resourceId: req.params.id,
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { method: req.method, path: req.originalUrl, statusCode: res.statusCode }
      }))
      .then(({ error }) => {
        if (error) {
          logger.warn({ error, requestId: req.requestId }, 'audit log write failed');
        }
      })
      .catch((error) => logger.warn({ error, requestId: req.requestId }, 'audit log write failed'));
  });
  next();
};
