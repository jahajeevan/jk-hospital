import * as auditService from '../services/auditLogsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

export const createAuditLog = asyncHandler(async (req, res) => {
  const {
    actor,
    actorRole,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent
  } = req.body;

  if (!action || !actor) {
    const error = new Error('Action and actor are required');
    error.statusCode = 400;
    throw error;
  }

  const log = await auditService.createAuditLog({
    actor,
    actorRole,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent
  });

  // Don't return the audit log (fire and forget)
  res.status(201).json({
    success: true,
    timestamp: new Date().toISOString()
  });
});

export const getAuditLog = asyncHandler(async (req, res) => {
  const log = await auditService.getAuditLog(req.params.id);

  if (!log) {
    const error = new Error('Audit log not found');
    error.statusCode = 404;
    throw error;
  }

  res.json({
    success: true,
    log,
    timestamp: new Date().toISOString()
  });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;

  const filters = {
    actor: req.query.actor || null,
    action: req.query.action || null,
    resourceType: req.query.resourceType || null,
    resourceId: req.query.resourceId || null,
    startDate: req.query.startDate || null,
    endDate: req.query.endDate || null
  };

  // Remove null values
  Object.keys(filters).forEach(key => {
    if (filters[key] === null) delete filters[key];
  });

  const logs = await auditService.listAuditLogs(limit, offset, filters);

  res.json({
    success: true,
    logs,
    pagination: { limit, offset, filters },
    timestamp: new Date().toISOString()
  });
});

export const getAuditLogsByResource = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params;

  if (!resourceType || !resourceId) {
    const error = new Error('Resource type and ID are required');
    error.statusCode = 400;
    throw error;
  }

  const logs = await auditService.getAuditLogsByResource(resourceType, resourceId);

  res.json({
    success: true,
    logs,
    count: logs.length,
    timestamp: new Date().toISOString()
  });
});

export const getAuditLogsByActor = asyncHandler(async (req, res) => {
  const { actor } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  const logs = await auditService.getAuditLogsByActor(actor, limit, offset);

  res.json({
    success: true,
    logs,
    pagination: { limit, offset },
    timestamp: new Date().toISOString()
  });
});

export const getAuditLogsByAction = asyncHandler(async (req, res) => {
  const { action } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  const logs = await auditService.getAuditLogsByAction(action, limit, offset);

  res.json({
    success: true,
    logs,
    pagination: { limit, offset },
    timestamp: new Date().toISOString()
  });
});

export const getAuditLogsByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    const error = new Error('Start date and end date are required');
    error.statusCode = 400;
    throw error;
  }

  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;

  const logs = await auditService.getAuditLogsByDateRange(startDate, endDate, limit, offset);

  res.json({
    success: true,
    logs,
    pagination: { limit, offset },
    dateRange: { startDate, endDate },
    timestamp: new Date().toISOString()
  });
});

export const exportAuditLogs = asyncHandler(async (req, res) => {
  const filters = {
    actor: req.query.actor || null,
    action: req.query.action || null,
    resourceType: req.query.resourceType || null,
    resourceId: req.query.resourceId || null,
    startDate: req.query.startDate || null,
    endDate: req.query.endDate || null
  };

  Object.keys(filters).forEach(key => {
    if (filters[key] === null) delete filters[key];
  });

  const logs = await auditService.exportAuditLogs(filters);

  res.json({
    success: true,
    count: logs.length,
    logs,
    exportDate: new Date().toISOString(),
    timestamp: new Date().toISOString()
  });
});

export const getAuditSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    const error = new Error('Start date and end date are required');
    error.statusCode = 400;
    throw error;
  }

  const summary = await auditService.getAuditSummary(startDate, endDate);

  res.json({
    success: true,
    summary,
    timestamp: new Date().toISOString()
  });
});

export const deleteOldAuditLogs = asyncHandler(async (req, res) => {
  const { daysOld } = req.body;

  if (!daysOld || daysOld < 30) {
    const error = new Error('Days old must be at least 30');
    error.statusCode = 400;
    throw error;
  }

  const deleted = await auditService.deleteOldAuditLogs(daysOld);

  res.json({
    success: true,
    message: `Deleted audit logs older than ${daysOld} days`,
    timestamp: new Date().toISOString()
  });
});

export default {
  createAuditLog,
  getAuditLog,
  listAuditLogs,
  getAuditLogsByResource,
  getAuditLogsByActor,
  getAuditLogsByAction,
  getAuditLogsByDateRange,
  exportAuditLogs,
  getAuditSummary,
  deleteOldAuditLogs
};
