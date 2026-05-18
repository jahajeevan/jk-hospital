import express from 'express';
import { createRefund, myRefunds, updateRefundStatus } from '../controllers/refundController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/mine', myRefunds);
router.post('/', createRefund);
router.patch('/:id/status', authorize('admin'), updateRefundStatus);

export default router;

