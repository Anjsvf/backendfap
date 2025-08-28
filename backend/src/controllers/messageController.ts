import { Request, Response } from 'express';
import path from 'path';
import { UploadedFile } from 'express-fileupload';

import Message from '../models/Message';
import User from '../models/User';
import { io } from '../app';

interface RequestWithFiles extends Request {
  files?: { [key: string]: UploadedFile | UploadedFile[] } | null;
}

export const getMessages = async (req: Request, res: Response) => {
  try {
    const messages = await Message.find()
      .populate('replyTo')
      .sort({ timestamp: 1 })
      .lean(); 
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendMessage = async (req: RequestWithFiles, res: Response) => {
  const { text, type, replyTo } = req.body;
  const username = (req as any).user.username;

  let audioUri: string | undefined;
  let audioDuration: number | undefined;

  if (type === 'voice' && req.files?.audio) {
    const file = Array.isArray(req.files.audio) ? req.files.audio[0] : req.files.audio;
    const uploadPath = path.join(__dirname, '../uploads', `${Date.now()}-${file.name}`);

    try {
      await file.mv(uploadPath);
      
     
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? `https://${req.get('host')}` 
        : `${req.protocol}://${req.get('host')}`;
        
      audioUri = `${serverUrl}/uploads/${path.basename(uploadPath)}`;
      audioDuration = parseInt(req.body.audioDuration, 10) || 0;
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Error uploading audio file' });
    }
  }

  try {
    const message = await Message.create({
      username,
      text,
      type,
      audioUri,
      audioDuration,
      replyTo,
    });
    const populated = await Message.findById(message._id).populate('replyTo').lean();
    io.emit('newMessage', populated);
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  const { messageId, emoji } = req.body;
  const username = (req as any).user.username;

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const reactions = message.reactions && typeof message.reactions === 'object'
      ? JSON.parse(JSON.stringify(message.reactions))
      : {};

    for (const [key, val] of Object.entries(reactions)) {
      if (Array.isArray(val)) {
        const filtered = val.filter((u: string) => u !== username);
        if (filtered.length === 0) {
          delete reactions[key];
        } else {
          reactions[key] = filtered;
        }
      }
    }

    const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const idx = current.indexOf(username);
    if (idx === -1) {
      reactions[emoji] = [...current, username];
    } else {
      current.splice(idx, 1);
      if (current.length === 0) delete reactions[emoji];
      else reactions[emoji] = current;
    }

    message.reactions = reactions;
    message.markModified('reactions');
    await message.save();

    const updated = await Message.findById(messageId).populate('replyTo').lean();
    io.emit('messageUpdated', updated);
    res.json(updated);
  } catch (err) {
    console.error('Erro ao adicionar reação:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ online: true }).select('username online');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};