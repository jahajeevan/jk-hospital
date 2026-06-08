import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';

export const createInventoryItem = async (data) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .insert(toSnakeObj({
      itemName: data.itemName,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      reorderLevel: data.reorderLevel || 10,
      category: data.category,
      supplier: data.supplier,
      expiryDate: data.expiryDate,
      metadata: data.metadata || {},
      updatedAt: new Date().toISOString()
    }))
    .select();

  if (error) throw error;
  return toCamelObj(result?.[0]);
};

export const getInventoryItem = async (id) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) throw error;
  return toCamelObj(result?.[0]) || null;
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

  if (error) throw error;
  return toCamelObj(result || []);
};

export const getInventoryByCategory = async (category) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .eq('category', category)
    .order('item_name', { ascending: true });

  if (error) throw error;
  return toCamelObj(result || []);
};

export const getLowStockItems = async (limit = 50) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .lt('quantity', 'reorder_level')
    .order('quantity', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return toCamelObj(result || []);
};

export const updateInventoryItem = async (id, data) => {
  const updateData = {};
  if (data.itemName !== undefined) updateData.itemName = data.itemName;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
  if (data.reorderLevel !== undefined) updateData.reorderLevel = data.reorderLevel;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.supplier !== undefined) updateData.supplier = data.supplier;
  if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;
  updateData.updatedAt = new Date().toISOString();

  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .update(toSnakeObj(updateData))
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!result || result.length === 0) return null;
  return toCamelObj(result[0]);
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
  return toCamelObj(result?.[0]);
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
  return toCamelObj(result?.[0]);
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
  return toCamelObj(result || []);
};
