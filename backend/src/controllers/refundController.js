import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';
import { sendStatusEmail } from '../services/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { refundRazorpayPayment } from '../utils/razorpayClient.js';
import { getStripe } from '../utils/stripeClient.js';
import { createAuditLog } from '../services/auditLogsService.js';

const normalizeRefundStatus = (status) => (status === 'declined' ? 'rejected' : status);

/** Issue the refund at the gateway that actually took the money. Returns null if there is nothing to refund at a gateway (e.g. cash/UPI walk-in). */
const refundAtGateway = async (payment) => {
  if (!payment || payment.status === 'refunded') return null;

  if (payment.method === 'razorpay' && payment.razorpayPaymentId) {
    return refundRazorpayPayment(payment.razorpayPaymentId, payment.amount);
  }
  if (payment.method === 'stripe' && payment.stripePaymentIntentId) {
    return getStripe().refunds.create({ payment_intent: payment.stripePaymentIntentId });
  }
  return null;
};

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

  const nextStatus = normalizeRefundStatus(req.body.status);
  let gatewayRefundId = null;

  if (nextStatus === 'approved') {
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', refund.appointmentId)
      .eq('status', 'success')
      .limit(1);

    const payment = toCamelObj(paymentsData?.[0]);
    const gatewayResult = await refundAtGateway(payment);
    gatewayRefundId = gatewayResult?.id || null;

    if (payment) {
      await supabase
        .from('payments')
        .update(toSnakeObj({ status: 'refunded' }))
        .eq('id', payment._id);
    }
  }

  const { data: updatedRefunds, error: updateError } = await supabase
    .from('refund_requests')
    .update(toSnakeObj({
      status: nextStatus,
      adminNote: req.body.adminNote
    }))
    .eq('id', refund.id)
    .select('*, patient:users(*)');

  if (updateError) throw updateError;
  const updatedRefund = toCamelObj(updatedRefunds?.[0]);

  await createAuditLog({
    actor: req.user.email || req.user._id,
    actorRole: req.user.role,
    action: `refund:${nextStatus}`,
    resourceType: 'refund_request',
    resourceId: refund.id,
    details: gatewayRefundId ? `Gateway refund id: ${gatewayRefundId}` : req.body.adminNote || null
  });

  await sendStatusEmail(updatedRefund.patient.email, `JK Hospital Refund ${updatedRefund.status}`, `Your refund request was ${updatedRefund.status}. ${updatedRefund.adminNote || ''}`);
  res.json({ refund: updatedRefund });
});
