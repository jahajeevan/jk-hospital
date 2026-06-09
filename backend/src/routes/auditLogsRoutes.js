import express from 'express';
import { requireAdmin } from '../middleware/authMiddleware.js';
import auditController from '../controllers/auditLogsController.js';

const router = express.Router();

// List audit logs
router.get('/', requireAdmin, auditController.listAuditLogs);

// Create audit log (can be called from anywhere)
router.post('/', auditController.createAuditLog);

// Search by resource
router.get('/resource/:resourceType/:resourceId', requireAdmin, auditController.getAuditLogsByResource);

// Search by actor
router.get('/actor/:actor', requireAdmin, auditController.getAuditLogsByActor);

// Search by action
router.get('/action/:action', requireAdmin, auditController.getAuditLogsByAction);

// Date range search
router.get('/range/search', requireAdmin, auditController.getAuditLogsByDateRange);

// Export logs
router.get('/export/all', requireAdmin, auditController.exportAuditLogs);

// Get summary
router.get('/summary/stats', requireAdmin, auditController.getAuditSummary);

// Delete old logs (admin only)
router.delete('/old/cleanup', requireAdmin, auditController.deleteOldAuditLogs);

// Get specific audit log
router.get('/:id', requireAdmin, auditController.getAuditLog);

export default router;
