import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    reason: { type: String, required: true },
    emergencyExplanation: String,
    proofUrl: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNote: String
  },
  { timestamps: true }
);

export default mongoose.model('RefundRequest', refundRequestSchema);

