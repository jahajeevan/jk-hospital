import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, required: true },
    slotLabel: { type: String, required: true },
    appointmentDate: { type: Date, required: true },
    tokenNumber: { type: Number, required: true },
    queuePosition: { type: Number, required: true },
    estimatedWaitMinutes: { type: Number, default: 0 },
    patientDetails: {
      name: String,
      age: Number,
      gender: String,
      phone: String,
      symptoms: String,
      email: String
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'approved', 'rejected', 'cancelled', 'completed', 'rescheduled'],
      default: 'confirmed'
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    invoiceNumber: String,
    cancellation: {
      reason: String,
      emergencyExplanation: String,
      cancelledAt: Date
    }
  },
  { timestamps: true }
);

appointmentSchema.index({ patient: 1, doctor: 1, appointmentDate: 1, slotId: 1 }, { unique: true });
appointmentSchema.index({ doctor: 1, appointmentDate: 1, slotId: 1, tokenNumber: 1 }, { unique: true });

export default mongoose.model('Appointment', appointmentSchema);

