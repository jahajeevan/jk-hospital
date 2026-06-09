import { supabase, toCamelObj } from '../config/supabase.js';

const auditOutput = (row) => {
  const log = toCamelObj(row);
  if (!log) return log;
  return {
    ...log,
    actor: log.actor || log.actorId || 'system',
    actorRole: log.actorRole || log.metadata?.actorRole || '',
    resourceType: log.resourceType || log.resource || '',
    details: log.details || log.metadata || {},
    ipAddress: log.ipAddress || log.ip || '',
    timestamp: log.timestamp || log.createdAt
  };
};

export const createAuditLog = async (data) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_id: data.actorId || (/^[0-9a-f-]{36}$/i.test(String(data.actor || '')) ? data.actor : null),
      action: data.action,
      resource: data.resourceType || data.resource || 'system',
      resource_id: data.resourceId || null,
      request_id: data.requestId || null,
      ip: data.ipAddress || data.ip || null,
      user_agent: data.userAgent || null,
      metadata: {
        actor: data.actor || 'system',
        actorRole: data.actorRole || '',
        details: data.details || {}
      },
      created_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  return auditOutput(result?.[0]);
};

export const getAuditLog = async (id) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) throw error;
  return auditOutput(result?.[0]) || null;
};

export const listAuditLogs = async (limit = 100, offset = 0, filters = {}) => {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.resourceType) {
    query = query.eq('resource', filters.resourceType);
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
  return (result || []).map(auditOutput);
};

export const getAuditLogsByResource = async (resourceType, resourceId) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('resource', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (result || []).map(auditOutput);
};

export const getAuditLogsByActor = async (actor, limit = 50, offset = 0) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .contains('metadata', { actor })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (result || []).map(auditOutput);
};

export const getAuditLogsByAction = async (action, limit = 50, offset = 0) => {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', action)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (result || []).map(auditOutput);
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
  return (result || []).map(auditOutput);
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
    .select('metadata', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (actorError) throw actorError;

  return {
    actionCounts,
    actorCounts,
    period: { startDate, endDate }
  };
};
