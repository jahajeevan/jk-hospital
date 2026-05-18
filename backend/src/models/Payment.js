import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['upi', 'stripe', 'razorpay'], default: 'upi' },
    upiId: String,
    currency: { type: String, default: 'INR' },
    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: String,
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpayPaymentMethod: String,
    transactionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['success', 'failed', 'refunded', 'pending'], default: 'success' },
    paidAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
