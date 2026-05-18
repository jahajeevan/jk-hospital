import express from 'express';
import { markRead, myNotifications } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/mine', myNotifications);
router.patch('/read', markRead);

export default router;

