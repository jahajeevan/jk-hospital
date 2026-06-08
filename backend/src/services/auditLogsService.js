import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';

export const createAuditLog = async (data) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .insert(toSnakeObj({
      actor: data.actor,
      actorRole: data.actorRole,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: new Date().toISOString()
    }))
    .select();

  if (error) throw error;
  return toCamelObj(result?.[0]);
};

export const getAuditLog = async (id) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) throw error;
  return toCamelObj(result?.[0]) || null;
};

export const listAuditLogs = async (limit = 100, offset = 0, filters = {}) => {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.actor) {
    query = query.eq('actor', filters.actor);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType);
  }

  if (filters.resourceId) {
    query = query.eq('resource_id', filters.resourceId);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: result, error } = await query;

  if (error) throw error;
  return toCamelObj(result || []);
};

export const getAuditLogsByResource = async (resourceType, resourceId) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelObj(result || []);
};

export const getAuditLogsByActor = async (actor, limit = 50, offset = 0) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('actor', actor)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return toCamelObj(result || []);
};

export const getAuditLogsByAction = async (action, limit = 50, offset = 0) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', action)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return toCamelObj(result || []);
};

export const getAuditLogsByDateRange = async (startDate, endDate, limit = 100, offset = 0) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return toCamelObj(result || []);
};

export const exportAuditLogs = async (filters = {}) => {
  const limit = 10000;
  const logs = await listAuditLogs(limit, 0, filters);
  return logs;
};

export const deleteOldAuditLogs = async (daysOld = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { error } = await supabase
    .from('audit_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString());

  if (error) throw error;
  return true;
};

export const getAuditSummary = async (startDate, endDate) => {
  // Get counts by action
  const { data: actionCounts, error: actionError } = await supabase
    .from('audit_logs')
    .select('action', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (actionError) throw actionError;

  // Get counts by actor
  const { data: actorCounts, error: actorError } = await supabase
    .from('audit_logs')
    .select('actor', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (actorError) throw actorError;

  return {
    actionCounts,
    actorCounts,
    period: { startDate, endDate }
  };
};
