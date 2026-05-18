import RefundRequest from '../models/RefundRequest.js';
import { sendStatusEmail } from '../services/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createRefund = asyncHandler(async (req, res) => {
  const refund = await RefundRequest.create({
    patient: req.user._id,
    appointment: req.body.appointmentId,
    reason: req.body.reason,
    emergencyExplanation: req.body.emergencyExplanation,
    proofUrl: req.body.proofUrl
  });
  res.status(201).json({ refund });
});

export const myRefunds = asyncHandler(async (req, res) => {
  const refunds = await RefundRequest.find({ patient: req.user._id }).populate('appointment').sort({ createdAt: -1 });
  res.json({ refunds });
});

export const updateRefundStatus = asyncHandler(async (req, res) => {
  const refund = await RefundRequest.findById(req.params.id).populate('patient');
  if (!refund) {
    const error = new Error('Refund request not found');
    error.statusCode = 404;
    throw error;
  }
  refund.status = req.body.status;
  refund.adminNote = req.body.adminNote;
  await refund.save();
  await sendStatusEmail(refund.patient.email, `JK Hospital Refund ${refund.status}`, `Your refund request was ${refund.status}. ${refund.adminNote || ''}`);
  res.json({ refund });
});

