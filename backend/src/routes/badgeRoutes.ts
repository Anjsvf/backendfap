
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  updateUserBadge,
  getUserBadge,
  getOnlineUserBadges,
} from '../controllers/badgeController';

const router = express.Router();

router.post('/badges/update', protect, updateUserBadge);
router.get('/badges/:username', protect, getUserBadge);
router.get('/badges', protect, getOnlineUserBadges);

export default router;