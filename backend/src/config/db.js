import mongoose from 'mongoose';

export const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. API will fail database operations until configured.');
    return;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
};

