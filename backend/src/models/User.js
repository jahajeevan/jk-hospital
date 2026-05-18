import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    code: String,
    expiresAt: Date
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    otp: otpSchema,
    resetOtp: otpSchema
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);

