
import { Request, Response } from 'express';
import UserBadge from '../models/UserBadge';

interface AuthRequest extends Request {
  user?: any;
}

export const updateUserBadge = async (req: AuthRequest, res: Response) => {
  const { currentBadge, currentStreak } = req.body;
  const username = req.user.username;

  try {
    const userBadge = await UserBadge.findOneAndUpdate(
      { username },
      {
        currentBadge,
        currentStreak,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(userBadge);
  } catch (error) {
    console.error('Error updating badge:', error);
    res.status(500).json({ message: 'Error updating badge' });
  }
};

export const getUserBadge = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const userBadge = await UserBadge.findOne({ username });
    
    if (!userBadge) {
      return res.json({
        username,
        currentBadge: null,
        currentStreak: 0,
      });
    }

    res.json(userBadge);
  } catch (error) {
    console.error('Error getting badge:', error);
    res.status(500).json({ message: 'Error getting badge' });
  }
};

export const getOnlineUserBadges = async (req: Request, res: Response) => {
  try {
    const badges = await UserBadge.find({}).select('username currentBadge currentStreak');
    res.json(badges);
  } catch (error) {
    console.error('Error getting online badges:', error);
    res.status(500).json({ message: 'Error getting badges' });
  }
};