import express from 'express';
import { requireUser, requireAdmin } from '../middleware/authMiddleware.js';
import billController from '../controllers/pharmacyBillController.js';

const router = express.Router();

// User endpoints
router.get('/mine', requireUser, billController.getUserBills);
router.post('/', requireUser, billController.createBill);

// Get specific bill
router.get('/:id', requireUser, billController.getBillDetail);

// Get bill by appointment (nested route)
router.get('/appointment/:appointmentId', requireUser, billController.getAppointmentBill);

// Item management
router.post('/:id/items', requireUser, billController.addItems);
router.patch('/:id/items', requireUser, billController.updateItems);

// Admin endpoints
router.get('/', requireAdmin, billController.listAllBills);
router.patch('/:id/status', requireAdmin, billController.updateBillStatus);
router.delete('/:id', requireUser, billController.deleteBill);

export default router;
