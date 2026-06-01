import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const myNotifications = asyncHandler(async (req, res) => {
  const { data: notificationsData } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user._id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(30);

  res.json({ notifications: toCamelObj(notificationsData) || [] });
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
