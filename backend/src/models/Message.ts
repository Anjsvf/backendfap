// models/Message.ts
import mongoose, { Schema } from 'mongoose';
import { Message as IMessage } from '../types';

const messageSchema = new Schema<IMessage>(
  {
    username: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['text', 'voice'], default: 'text' },
    audioUri: String, 
    audioDuration: Number,
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    reactions: {
      type: Map,
      of: [String], 
      default: new Map(),
    },
  },
  { minimize: false }
);

export default mongoose.model<IMessage>('Message', messageSchema);