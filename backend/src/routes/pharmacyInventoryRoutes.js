import express from 'express';
import { requirePermission, requireUser } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/permissions.js';
import inventoryController from '../controllers/pharmacyInventoryController.js';

const router = express.Router();

const requireInventoryManage = requirePermission(PERMISSIONS.PHARMACY_INVENTORY_MANAGE);

// Read endpoints — any authenticated staff member
router.get('/', requireUser, inventoryController.listInventory);
router.get('/search', requireUser, inventoryController.searchInventory);
router.get('/low-stock', requireUser, requireInventoryManage, inventoryController.getLowStockItems);
router.get('/:id', requireUser, inventoryController.getInventoryItem);

// Write endpoints — admin or pharmacist
router.post('/', requireUser, requireInventoryManage, inventoryController.createItem);
router.patch('/:id', requireUser, requireInventoryManage, inventoryController.updateItem);
router.delete('/:id', requireUser, requireInventoryManage, inventoryController.deleteItem);

// Stock management
router.post('/:id/restock', requireUser, requireInventoryManage, inventoryController.restockItem);
router.post('/:id/remove-stock', requireUser, requireInventoryManage, inventoryController.removeStock);

export default router;
