import { supabase, toCamelObj } from '../config/supabase.js';

// The live pharmacy_inventory table (source of truth) has these columns:
//   name, batch_number, expiry_date, purchase_price, selling_price,
//   current_stock, minimum_stock_level, created_at, updated_at
// The frontend already speaks this vocabulary (name/batchNumber/expiryDate/
// purchasePrice/sellingPrice/currentStock/minimumStockLevel), so this service
// maps straight onto the real columns. (An earlier version wrote item_name/
// quantity/unit_price/reorder_level, which do not exist — hence 0 rows ever.)

const isMissingInventoryTable = (error) => {
  const text = `${error?.message || ''} ${error?.details || ''}`;
  return error?.code === '42P01' || (/pharmacy_inventory/i.test(text) && /not find|does not exist|schema cache/i.test(text));
};

const numberOrUndefined = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

// Build a snake_case row from whatever the caller sends, accepting both the
// frontend field names and the legacy alias names the controller may pass.
const toRow = (data = {}) => {
  const row = {};
  const set = (column, value) => {
    if (value !== undefined) row[column] = value;
  };

  set('name', data.name ?? data.itemName);
  set('batch_number', data.batchNumber ?? data.batch_number ?? data.category);
  if (data.expiryDate !== undefined || data.expiry_date !== undefined) {
    row.expiry_date = data.expiryDate || data.expiry_date || null;
  }
  set('purchase_price', numberOrUndefined(data.purchasePrice ?? data.purchase_price));
  set('selling_price', numberOrUndefined(data.sellingPrice ?? data.unitPrice ?? data.selling_price));
  set('current_stock', numberOrUndefined(data.currentStock ?? data.quantity ?? data.current_stock));
  set('minimum_stock_level', numberOrUndefined(data.minimumStockLevel ?? data.reorderLevel ?? data.minimum_stock_level));
  return row;
};

// Output aliases keep the controller's compatibility checks (item.quantity,
// item.unitPrice) working while the frontend consumes the real field names.
const inventoryOutput = (row) => {
  const item = toCamelObj(row);
  if (!item) return item;
  return {
    ...item,
    quantity: item.currentStock ?? 0,
    unitPrice: item.sellingPrice ?? 0,
    reorderLevel: item.minimumStockLevel ?? 0
  };
};

export const createInventoryItem = async (data) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .insert({ ...toRow(data), updated_at: new Date().toISOString() })
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

export const listInventory = async (limit = 100, offset = 0) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isMissingInventoryTable(error)) return [];
    throw error;
  }
  return (result || []).map(inventoryOutput);
};

export const getLowStockItems = async (limit = 50) => {
  // Postgrest can't compare two columns directly, so fetch and filter in JS
  // (the inventory table is small).
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .order('current_stock', { ascending: true });

  if (error) {
    if (isMissingInventoryTable(error)) return [];
    throw error;
  }
  return (result || [])
    .map(inventoryOutput)
    .filter((item) => (item.currentStock ?? 0) <= (item.minimumStockLevel ?? 0))
    .slice(0, limit);
};

export const updateInventoryItem = async (id, data) => {
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .update({ ...toRow(data), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!result || result.length === 0) return null;
  return inventoryOutput(result[0]);
};

export const restockItem = async (id, quantity, _notes = '') => {
  const current = await getInventoryItem(id);
  if (!current) return null;

  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .update({ current_stock: (current.currentStock ?? 0) + Number(quantity), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) throw error;
  return inventoryOutput(result?.[0]);
};

export const removeStock = async (id, quantity) => {
  const current = await getInventoryItem(id);
  if (!current) return null;

  const nextStock = Math.max(0, (current.currentStock ?? 0) - Number(quantity));
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
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
  const { data: result, error } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) {
    if (isMissingInventoryTable(error)) return [];
    throw error;
  }
  return (result || []).map(inventoryOutput);
};
