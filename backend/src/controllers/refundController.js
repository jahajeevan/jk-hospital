import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { sendStatusEmail } from '../services/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createRefund = asyncHandler(async (req, res) => {
  const { data: newRefunds, error } = await supabase
    .from('refund_requests')
    .insert(toSnakeObj({
      patient: req.user._id,
      appointment: req.body.appointmentId,
      reason: req.body.reason,
      emergencyExplanation: req.body.emergencyExplanation,
      proofUrl: req.body.proofUrl
    }))
    .select('*');

  if (error) throw error;
  res.status(201).json({ refund: toCamelObj(newRefunds?.[0]) });
});

export const myRefunds = asyncHandler(async (req, res) => {
  const { data: refundsData } = await supabase
    .from('refund_requests')
    .select('*, appointment:appointments(*)')
    .eq('patient_id', req.user._id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  res.json({ refunds: toCamelObj(refundsData) || [] });
});

export const updateRefundStatus = asyncHandler(async (req, res) => {
  const { data: refundsData } = await supabase
    .from('refund_requests')
    .select('*, patient:users(*)')
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .limit(1);

  const refund = toCamelObj(refundsData?.[0]);
  if (!refund) {
    const error = new Error('Refund request not found');
    error.statusCode = 404;
    throw error;
  }

  const { data: updatedRefunds, error: updateError } = await supabase
    .from('refund_requests')
    .update(toSnakeObj({
      status: req.body.status,
      adminNote: req.body.adminNote
    }))
    .eq('id', refund.id)
    .select('*, patient:users(*)');

  if (updateError) throw updateError;
  const updatedRefund = toCamelObj(updatedRefunds?.[0]);

  await sendStatusEmail(updatedRefund.patient.email, `JK Hospital Refund ${updatedRefund.status}`, `Your refund request was ${updatedRefund.status}. ${updatedRefund.adminNote || ''}`);
  res.json({ refund: updatedRefund });
});
