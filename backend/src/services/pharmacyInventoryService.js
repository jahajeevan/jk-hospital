import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';

const isMissingInventoryTable = (error) => {
  const text = `${error?.message || ''} ${error?.details || ''}`;
  return error?.code === '42P01' || /pharmacy_inventory/i.test(text) && /not find|does not exist|schema cache/i.test(text);
};

const inventoryInput = (data = {}) => ({
  itemName: data.itemName || data.name || 'Medicine',
  quantity: Number(data.quantity ?? data.currentStock ?? 0),
  unitPrice: Number(data.unitPrice ?? data.sellingPrice ?? 0),
  reorderLevel: Number(data.reorderLevel ?? data.minimumStockLevel ?? 10),
  category: data.category || data.batchNumber || '',
  supplier: data.supplier || '',
  expiryDate: data.expiryDate || null,
  metadata: {
    ...(data.metadata || {}),
    batchNumber: data.batchNumber || data.metadata?.batchNumber || '',
    purchasePrice: Number(data.purchasePrice ?? data.metadata?.purchasePrice ?? 0)
  }
});

const inventoryOutput = (row) => {
  const item = toCamelObj(row);
  if (!item) return item;
  return {
    ...item,
    name: item.name || item.itemName,
    batchNumber: item.batchNumber || item.metadata?.batchNumber || item.category || '',
    purchasePrice: Number(item.purchasePrice ?? item.metadata?.purchasePrice ?? 0),
    sellingPrice: Number(item.sellingPrice ?? item.unitPrice ?? 0),
    currentStock: Number(item.currentStock ?? item.quantity ?? 0),
    minimumStockLevel: Number(item.minimumStockLevel ?? item.reorderLevel ?? 10)
  };
};

export const createInventoryItem = async (data) => {
  const input = inventoryInput(data);
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .insert(toSnakeObj({
      itemName: input.itemName,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      reorderLevel: input.reorderLevel,
      category: input.category,
      supplier: input.supplier,
      expiryDate: input.expiryDate,
      metadata: input.metadata,
      updatedAt: new Date().toISOString()
    }))
    .select();

  if (error) throw error;
  return inventoryOutput(result?.[0]);
};

export const getInventoryItem = async (id) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) throw error;
  return inventoryOutput(result?.[0]) || null;
};

export const listInventory = async (limit = 100, offset = 0, category = null) => {
  let query = supabase
    .from('pharmacy_inventory')
    .select('*')
    .order('item_name', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: result, error } = await query;

  if (error) {
    if (isMissingInventoryTable(error)) return [];
    throw error;
  }
  return (result || []).map(inventoryOutput);
};

export const getInventoryByCategory = async (category) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .eq('category', category)
    .order('item_name', { ascending: true });

  if (error) {
    if (isMissingInventoryTable(error)) return [];
    throw error;
  }
  return (result || []).map(inventoryOutput);
};

export const getLowStockItems = async (limit = 50) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .lt('quantity', 'reorder_level')
    .order('quantity', { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingInventoryTable(error)) return [];
    throw error;
  }
  return (result || []).map(inventoryOutput);
};

export const updateInventoryItem = async (id, data) => {
  const updateData = {};
  if (data.itemName !== undefined || data.name !== undefined) updateData.itemName = data.itemName || data.name;
  if (data.quantity !== undefined || data.currentStock !== undefined) updateData.quantity = Number(data.quantity ?? data.currentStock);
  if (data.unitPrice !== undefined || data.sellingPrice !== undefined) updateData.unitPrice = Number(data.unitPrice ?? data.sellingPrice);
  if (data.reorderLevel !== undefined || data.minimumStockLevel !== undefined) updateData.reorderLevel = Number(data.reorderLevel ?? data.minimumStockLevel);
  if (data.category !== undefined) updateData.category = data.category;
  if (data.supplier !== undefined) updateData.supplier = data.supplier;
  if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
  if (data.metadata !== undefined || data.batchNumber !== undefined || data.purchasePrice !== undefined) {
    updateData.metadata = {
      ...(data.metadata || {}),
      ...(data.batchNumber !== undefined ? { batchNumber: data.batchNumber } : {}),
      ...(data.purchasePrice !== undefined ? { purchasePrice: Number(data.purchasePrice) } : {})
    };
  }
  updateData.updatedAt = new Date().toISOString();

  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .update(toSnakeObj(updateData))
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!result || result.length === 0) return null;
  return inventoryOutput(result[0]);
};

export const restockItem = async (id, quantity, notes = '') => {
  // Get current
  const current = await getInventoryItem(id);
  if (!current) return null;

  const newQuantity = current.quantity + quantity;
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .update({
      quantity: newQuantity,
      metadata: {
        ...(current.metadata || {}),
        lastRestocked: new Date().toISOString(),
        restockNotes: notes
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return inventoryOutput(result?.[0]);
};

export const removeStock = async (id, quantity) => {
  const current = await getInventoryItem(id);
  if (!current) return null;

  const newQuantity = Math.max(0, current.quantity - quantity);
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .update({
      quantity: newQuantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return inventoryOutput(result?.[0]);
};

export const deleteInventoryItem = async (id) => {
  const { error } = await supabase
    .from('pharmacy_inventory')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const searchInventory = async (query) => {
  const searchTerm = `%${query}%`;
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .ilike('item_name', searchTerm)
    .order('item_name', { ascending: true });

  if (error) throw error;
  return (result || []).map(inventoryOutput);
};
