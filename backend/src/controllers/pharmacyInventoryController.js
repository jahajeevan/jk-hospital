import * as inventoryService from '../services/pharmacyInventoryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/auth.js';

export const listInventory = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const category = req.query.category || null;

  const items = await inventoryService.listInventory(limit, offset, category);

  res.json({
    success: true,
    items,
    pagination: { limit, offset },
    timestamp: new Date().toISOString()
  });
});

export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.getInventoryItem(req.params.id);

  if (!item) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }

  res.json({
    success: true,
    item,
    timestamp: new Date().toISOString()
  });
});

export const searchInventory = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    const error = new Error('Search term must be at least 2 characters');
    error.statusCode = 400;
    throw error;
  }

  const items = await inventoryService.searchInventory(q);

  res.json({
    success: true,
    items,
    timestamp: new Date().toISOString()
  });
});

export const createItem = asyncHandler(async (req, res) => {
  const { itemName, quantity, unitPrice } = req.body;

  if (!itemName) {
    const error = new Error('Item name is required');
    error.statusCode = 400;
    throw error;
  }

  if (quantity === undefined) {
    const error = new Error('Quantity is required');
    error.statusCode = 400;
    throw error;
  }

  if (unitPrice === undefined) {
    const error = new Error('Unit price is required');
    error.statusCode = 400;
    throw error;
  }

  const item = await inventoryService.createInventoryItem(req.body);

  res.status(201).json({
    success: true,
    item,
    timestamp: new Date().toISOString()
  });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.getInventoryItem(req.params.id);

  if (!item) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await inventoryService.updateInventoryItem(req.params.id, req.body);

  res.json({
    success: true,
    item: updated,
    timestamp: new Date().toISOString()
  });
});

export const restockItem = asyncHandler(async (req, res) => {
  const { quantity, notes } = req.body;

  if (quantity === undefined || quantity <= 0) {
    const error = new Error('Valid quantity is required');
    error.statusCode = 400;
    throw error;
  }

  const item = await inventoryService.getInventoryItem(req.params.id);

  if (!item) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await inventoryService.restockItem(req.params.id, quantity, notes);

  res.json({
    success: true,
    item: updated,
    message: `Restocked ${quantity} units`,
    timestamp: new Date().toISOString()
  });
});

export const removeStock = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  if (quantity === undefined || quantity <= 0) {
    const error = new Error('Valid quantity is required');
    error.statusCode = 400;
    throw error;
  }

  const item = await inventoryService.getInventoryItem(req.params.id);

  if (!item) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }

  if (item.quantity < quantity) {
    const error = new Error(`Insufficient stock. Available: ${item.quantity}`);
    error.statusCode = 400;
    throw error;
  }

  const updated = await inventoryService.removeStock(req.params.id, quantity);

  res.json({
    success: true,
    item: updated,
    message: `Removed ${quantity} units`,
    timestamp: new Date().toISOString()
  });
});

export const getLowStockItems = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const items = await inventoryService.getLowStockItems(limit);

  res.json({
    success: true,
    items,
    message: `Found ${items.length} items below reorder level`,
    timestamp: new Date().toISOString()
  });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.getInventoryItem(req.params.id);

  if (!item) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }

  await inventoryService.deleteInventoryItem(req.params.id);

  res.json({
    success: true,
    message: 'Inventory item deleted',
    timestamp: new Date().toISOString()
  });
});

export default {
  listInventory,
  getInventoryItem,
  searchInventory,
  createItem,
  updateItem,
  restockItem,
  removeStock,
  getLowStockItems,
  deleteItem
};
