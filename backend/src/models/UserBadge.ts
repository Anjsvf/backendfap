
import mongoose, { Schema } from 'mongoose';

export interface UserBadge {
  _id: string;
  username: string;
  currentBadge: {
    key: string;
    name: string;
    days: number;
    category: string;
  } | null;
  currentStreak: number;
  lastUpdated: Date;
}

const userBadgeSchema = new Schema<UserBadge>({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  currentBadge: {
    type: {
      key: String,
      name: String,
      days: Number,
      category: String,
    },
    default: null,
  },
  currentStreak: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<UserBadge>('UserBadge', userBadgeSchema);