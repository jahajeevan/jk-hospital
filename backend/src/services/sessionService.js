import crypto from 'node:crypto';
import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { env } from '../config/env.js';

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const createRefreshToken = async ({ user, req, familyId = crypto.randomUUID() }) => {
  const token = crypto.randomBytes(48).toString('hex');
  const deviceId = req.headers['x-device-id'] || crypto.randomUUID();
  
  const { data: records, error } = await supabase
    .from('refresh_tokens')
    .insert(toSnakeObj({
      user: user._id,
      tokenHash: hashToken(token),
      familyId,
      deviceId,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      expiresAt: daysFromNow(env.refreshTokenExpiresDays)
    }))
    .select('*');
    
  if (error) throw error;
  return { token, record: toCamelObj(records?.[0]) };
};

export const rotateRefreshToken = async ({ token, req }) => {
  const tokenHash = hashToken(token);
  const { data: records } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .limit(1);
    
  const existing = toCamelObj(records?.[0]);
  if (!existing || existing.revokedAt || new Date(existing.expiresAt) < new Date()) return null;

  const next = await createRefreshToken({ user: { _id: existing.user }, req, familyId: existing.familyId });
  
  const { error: updateError } = await supabase
    .from('refresh_tokens')
    .update(toSnakeObj({
      revokedAt: new Date(),
      replacedBy: hashToken(next.token)
    }))
    .eq('id', existing.id);
    
  if (updateError) throw updateError;
  return { userId: existing.user, refreshToken: next.token };
};

export const revokeRefreshToken = async (token) => {
  if (!token) return;
  const tokenHash = hashToken(token);
  await supabase
    .from('refresh_tokens')
    .update(toSnakeObj({ revokedAt: new Date() }))
    .eq('token_hash', tokenHash);
};
