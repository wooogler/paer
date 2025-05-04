import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../../.env') });
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/paer';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;

export const closeDB = async (): Promise<void> => {
  await mongoose.connection.close();
  console.log('MongoDB Connection Closed');
}; 