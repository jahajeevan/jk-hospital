import express from 'express';
import { requireAdmin, requireUser } from '../middleware/auth.js';
import inventoryController from '../controllers/pharmacyInventoryController.js';

const router = express.Router();

// Public read endpoints
router.get('/', inventoryController.listInventory);
router.get('/search', inventoryController.searchInventory);
router.get('/low-stock', requireAdmin, inventoryController.getLowStockItems);
router.get('/:id', inventoryController.getInventoryItem);

// Admin write endpoints
router.post('/', requireAdmin, inventoryController.createItem);
router.patch('/:id', requireAdmin, inventoryController.updateItem);
router.delete('/:id', requireAdmin, inventoryController.deleteItem);

// Stock management
router.post('/:id/restock', requireAdmin, inventoryController.restockItem);
router.post('/:id/remove-stock', requireAdmin, inventoryController.removeStock);

export default router;
