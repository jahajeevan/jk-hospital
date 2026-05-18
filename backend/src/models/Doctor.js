import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    tokenLimit: { type: Number, required: true, min: 1 },
    fee: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { _id: true }
);

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    bio: String,
    fee: { type: Number, default: () => Number(process.env.CONSULTATION_FEE || 500) },
    avatar: String,
    isAvailable: { type: Boolean, default: true },
    unavailableDates: [{ type: Date }],
    slots: [slotSchema]
  },
  { timestamps: true }
);

export default mongoose.model('Doctor', doctorSchema);
