import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';

export const createPharmacyBill = async (data, userId) => {
  const billNumber = `BILL-${Date.now()}`;

  const { data: result, error } = await supabase
    .from('pharmacy_bills')
    .insert(toSnakeObj({
      appointmentId: data.appointmentId,
      patientId: userId,
      billNumber,
      totalAmount: data.totalAmount || 0,
      paymentStatus: data.paymentStatus || 'pending',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
    .select();

  if (error) throw error;

  const bill = toCamelObj(result?.[0]);

  // Add items if provided
  if (data.items && data.items.length > 0) {
    const items = await addBillItems(bill.id, data.items);
    bill.items = items;
  } else {
    bill.items = [];
  }

  return bill;
};

export const getPharmacyBill = async (id) => {
  const { data: result, error } = await supabase
    .from('pharmacy_bills')
    .select(`
      *,
      pharmacy_bill_items (*)
    `)
    .eq('id', id)
    .limit(1);

  if (error) throw error;
  if (!result || result.length === 0) return null;

  const bill = toCamelObj(result[0]);
  bill.items = toCamelObj(result[0].pharmacy_bill_items || []);
  return bill;
};

export const getUserPharmacyBills = async (userId, limit = 50, offset = 0) => {
  const { data: result, error } = await supabase
    .from('pharmacy_bills')
    .select(`
      *,
      pharmacy_bill_items (*)
    `)
    .eq('patient_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (result || []).map(row => {
    const bill = toCamelObj(row);
    bill.items = toCamelObj(row.pharmacy_bill_items || []);
    return bill;
  });
};

export const getAppointmentBill = async (appointmentId) => {
  const { data: result, error } = await supabase
    .from('pharmacy_bills')
    .select(`
      *,
      pharmacy_bill_items (*)
    `)
    .eq('appointment_id', appointmentId)
    .limit(1);

  if (error) throw error;
  if (!result || result.length === 0) return null;

  const bill = toCamelObj(result[0]);
  bill.items = toCamelObj(result[0].pharmacy_bill_items || []);
  return bill;
};

export const listAllBills = async (limit = 100, offset = 0, status = null) => {
  let query = supabase
    .from('pharmacy_bills')
    .select(`
      *,
      pharmacy_bill_items (*)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('payment_status', status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: result, error } = await query;

  if (error) throw error;

  return (result || []).map(row => {
    const bill = toCamelObj(row);
    bill.items = toCamelObj(row.pharmacy_bill_items || []);
    return bill;
  });
};

export const updateBillStatus = async (id, status, notes = '') => {
  const { data: result, error } = await supabase
    .from('pharmacy_bills')
    .update(toSnakeObj({
      paymentStatus: status,
      notes,
      updatedAt: new Date().toISOString()
    }))
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!result || result.length === 0) return null;

  return getPharmacyBill(id);
};

export const addBillItems = async (billId, items) => {
  if (!items || items.length === 0) return [];

  const itemRecords = items.map(item => ({
    bill_id: billId,
    medicine_name: item.medicineName || item.name,
    quantity: item.quantity || 1,
    rate: item.rate || item.unitPrice || 0,
    amount: (item.quantity || 1) * (item.rate || item.unitPrice || 0)
  }));

  const { data: result, error } = await supabase
    .from('pharmacy_bill_items')
    .insert(itemRecords)
    .select();

  if (error) throw error;
  return toCamelObj(result || []);
};

export const updateBillItems = async (billId, items) => {
  // Delete existing
  await supabase
    .from('pharmacy_bill_items')
    .delete()
    .eq('bill_id', billId);

  // Add new
  return addBillItems(billId, items);
};

export const calculateBillTotal = async (billId) => {
  const { data: result, error } = await supabase
    .from('pharmacy_bill_items')
    .select('amount')
    .eq('bill_id', billId);

  if (error) throw error;

  const total = (result || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  return total;
};

export const updateBillTotal = async (billId) => {
  const total = await calculateBillTotal(billId);

  const { data: result, error } = await supabase
    .from('pharmacy_bills')
    .update({ total_amount: total, updated_at: new Date().toISOString() })
    .eq('id', billId)
    .select();

  if (error) throw error;
  return result?.[0];
};

export const deleteBill = async (id) => {
  // Delete items first
  await supabase.from('pharmacy_bill_items').delete().eq('bill_id', id);

  // Delete bill
  const { error } = await supabase.from('pharmacy_bills').delete().eq('id', id);

  if (error) throw error;
  return true;
};
