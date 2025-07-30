import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getMessages, sendMessage, addReaction, getOnlineUsers } from '../controllers/messageController';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/messages', protect, getMessages);
router.post('/messages', protect, upload.single('audio'), sendMessage);
router.post('/messages/reaction', protect, addReaction);
router.get('/users/online', protect, getOnlineUsers);

export default router;