
import mongoose, { Schema } from 'mongoose';

export interface IVerification {
  _id: string;
  email: string;
  code: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  createdAt: Date;
}

const verificationSchema = new Schema<IVerification>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
    index: { expireAfterSeconds: 0 }, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


verificationSchema.index({ email: 1, type: 1 });

export default mongoose.model<IVerification>('Verification', verificationSchema);