
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getMessages,
  sendMessage,
  addReaction,
  getOnlineUsers,
} from '../controllers/messageController';

const router = express.Router();

router.get('/messages', protect, getMessages);
router.post('/messages', protect, sendMessage);
router.post('/messages/reaction', protect, addReaction);
router.get('/users/online', protect, getOnlineUsers);

export default router;