import mongoose, { Schema } from 'mongoose';
import { Message } from '../types';

const messageSchema = new Schema<Message>({
  username: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text',
  },
  audioUri: {
    type: String,
    required: false,
  },
  audioDuration: {
    type: Number,
    required: false,
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: false,
  },
  reactions: {
    type: Map,
    of: [String],
    default: {},
  },
});

export default mongoose.model<Message>('Message', messageSchema);