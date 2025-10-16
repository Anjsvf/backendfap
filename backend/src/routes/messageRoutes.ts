import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getMessages,
  sendMessage,
  addReaction,
  getOnlineUsers,
} from '../controllers/messageController';
import { cleanupOldMessages, getMessagesStats } from '../controllers/cleanupController';

const router = express.Router();

router.get('/messages', protect, getMessages);
router.post('/messages', protect, sendMessage);
router.post('/messages/reaction', protect, addReaction);
router.get('/users/online', protect, getOnlineUsers);

// Novas rotas de limpeza
router.post('/messages/cleanup', protect, cleanupOldMessages);
router.get('/messages/stats', protect, getMessagesStats);

export default router;