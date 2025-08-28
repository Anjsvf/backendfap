
import mongoose, { Schema } from 'mongoose';
import { User } from '../types';

const userSchema = new Schema<User>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: [/^[a-zA-Z0-9\u00C0-\u017F_]+$/, 'Username must contain only letters (including accents), numbers, and underscores'],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  online: {
    type: Boolean,
    default: false,
  },
  emailVerified: { 
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<User>('User', userSchema);