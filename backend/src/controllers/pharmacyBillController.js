import * as billService from '../services/pharmacyBillService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

export const createBill = asyncHandler(async (req, res) => {
  const { appointmentId, items, notes } = req.body;

  if (!appointmentId) {
    const error = new Error('Appointment ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!items || items.length === 0) {
    const error = new Error('Bill items are required');
    error.statusCode = 400;
    throw error;
  }

  // Calculate total
  const totalAmount = items.reduce((sum, item) => {
    return sum + ((item.quantity || 1) * (item.rate || item.unitPrice || 0));
  }, 0);

  const bill = await billService.createPharmacyBill(
    { appointmentId, items, totalAmount, notes },
    req.user._id
  );

  res.status(201).json({
    success: true,
    bill,
    timestamp: new Date().toISOString()
  });
});

export const getBillDetail = asyncHandler(async (req, res) => {
  const bill = await billService.getPharmacyBill(req.params.id);

  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify user owns this bill
  if (bill.patientId !== req.user._id && req.user.role !== 'admin') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  res.json({
    success: true,
    bill,
    timestamp: new Date().toISOString()
  });
});

export const getUserBills = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status || null;

  const bills = await billService.getUserPharmacyBills(req.user._id, limit, offset);

  // Filter by status if provided
  const filtered = status ? bills.filter(b => b.paymentStatus === status) : bills;

  res.json({
    success: true,
    bills: filtered,
    pagination: { limit, offset },
    timestamp: new Date().toISOString()
  });
});

export const getAppointmentBill = asyncHandler(async (req, res) => {
  const bill = await billService.getAppointmentBill(req.params.appointmentId);

  if (!bill) {
    res.json({
      success: true,
      bill: null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (bill.patientId !== req.user._id && !['admin', 'doctor', 'pharmacist'].includes(req.user.role)) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  res.json({
    success: true,
    bill,
    timestamp: new Date().toISOString()
  });
});

export const listAllBills = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status || null;

  const bills = await billService.listAllBills(limit, offset, status);

  res.json({
    success: true,
    bills,
    pagination: { limit, offset, status },
    timestamp: new Date().toISOString()
  });
});

export const updateBillStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  if (!status || !['pending', 'paid', 'cancelled', 'refunded'].includes(status)) {
    const error = new Error('Valid status is required');
    error.statusCode = 400;
    throw error;
  }

  const bill = await billService.getPharmacyBill(req.params.id);

  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await billService.updateBillStatus(req.params.id, status, notes);

  res.json({
    success: true,
    bill: updated,
    message: `Bill status updated to ${status}`,
    timestamp: new Date().toISOString()
  });
});

export const addItems = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || items.length === 0) {
    const error = new Error('Items are required');
    error.statusCode = 400;
    throw error;
  }

  const bill = await billService.getPharmacyBill(req.params.id);

  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  const updatedItems = await billService.addBillItems(req.params.id, items);
  await billService.updateBillTotal(req.params.id);
  const updated = await billService.getPharmacyBill(req.params.id);

  res.json({
    success: true,
    bill: updated,
    timestamp: new Date().toISOString()
  });
});

export const updateItems = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || items.length === 0) {
    const error = new Error('Items are required');
    error.statusCode = 400;
    throw error;
  }

  const bill = await billService.getPharmacyBill(req.params.id);

  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  await billService.updateBillItems(req.params.id, items);
  await billService.updateBillTotal(req.params.id);
  const updated = await billService.getPharmacyBill(req.params.id);

  res.json({
    success: true,
    bill: updated,
    timestamp: new Date().toISOString()
  });
});

export const deleteBill = asyncHandler(async (req, res) => {
  const bill = await billService.getPharmacyBill(req.params.id);

  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  if (bill.patientId !== req.user._id && req.user.role !== 'admin') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  await billService.deleteBill(req.params.id);

  res.json({
    success: true,
    message: 'Bill deleted successfully',
    timestamp: new Date().toISOString()
  });
});

export default {
  createBill,
  getBillDetail,
  getUserBills,
  getAppointmentBill,
  listAllBills,
  updateBillStatus,
  addItems,
  updateItems,
  deleteBill
};
