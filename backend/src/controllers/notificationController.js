import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const dbNotificationType = (type = 'system') =>
  ['appointment', 'payment', 'refund', 'system'].includes(type) ? type : 'system';

export const listNotifications = asyncHandler(async (req, res) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(req.query.limit || 30), 100));

  if (req.user?.role !== 'admin') {
    query = query.eq('user_id', req.user._id);
  } else if (req.query.userId) {
    query = query.eq('user_id', req.query.userId);
  }

  const { data: notificationsData, error } = await query;
  if (error) throw error;
  res.json({ notifications: toCamelObj(notificationsData) || [] });
});

export const myNotifications = asyncHandler(async (req, res) => {
  const { data: notificationsData, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user._id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  res.json({ notifications: toCamelObj(notificationsData) || [] });
});

export const createNotification = asyncHandler(async (req, res) => {
  const { userId, title, message, type } = req.body;
  const targetUserId = userId || req.user?._id;
  if (!targetUserId || !title || !message) {
    const error = new Error('userId, title, and message are required');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(toSnakeObj({
      userId: targetUserId,
      title,
      message,
      type: dbNotificationType(type)
    }))
    .select('*');
  if (error) throw error;

  res.status(201).json({ notification: toCamelObj(data?.[0]) });
});

export const markRead = asyncHandler(async (req, res) => {
  const ids = req.body.ids || [];
  if (ids.length) {
    const { error } = await supabase
      .from('notifications')
      .update(toSnakeObj({ read: true }))
      .eq('user_id', req.user._id)
      .in('id', ids);
      
    if (error) throw error;
  }
  res.json({ message: 'Notifications updated' });
});
