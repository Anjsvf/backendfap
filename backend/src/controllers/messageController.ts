
import { Request, Response } from 'express';
import path from 'path';
import { UploadedFile } from 'express-fileupload';
import cloudinary from 'cloudinary';

import Message from '../models/Message';
import User from '../models/User';
import { io } from '../app';

interface RequestWithFiles extends Request {
  files?: { [key: string]: UploadedFile | UploadedFile[] } | null;
}

export const getMessages = async (req: Request, res: Response) => {
  try {
    let query = {};
    const since = req.query.since as string;
    const limit = parseInt(req.query.limit as string) || 50; 

    if (since) {
      const sinceDate = new Date(since);
    
      query = { timestamp: { $gte: sinceDate } };
    }

   
    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .limit(limit)
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

    try {
     
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.v2.uploader.upload_stream(
          { 
            resource_type: 'video',
            public_id: `chat-audio-${Date.now()}`,
            folder: 'chat-audios',
         
            format: 'mp3',
            audio_codec: 'mp3',
            audio_frequency: 22050, 
            bitrate: 64, 
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.data); // Usa buffer direto do express-fileupload
      });

      audioUri = result.secure_url; // URL segura e persistente
      audioDuration = parseInt(req.body.audioDuration, 10) || 0;
      
      console.log('✅ Áudio enviado para Cloudinary:', audioUri);
    } catch (e) {
      console.error('❌ Erro no upload para Cloudinary:', e);
      return res.status(500).json({ message: 'Error uploading audio file to Cloudinary' });
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
    

    const populatedForEmit = await Message.findById(message._id).populate('replyTo').lean();
    io.emit('newMessage', populatedForEmit);

   
    res.status(201).json(message.toObject());
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


    const populatedForEmit = await Message.findById(messageId).populate('replyTo').lean();
    io.emit('messageUpdated', populatedForEmit);
    
  
    res.json(message.toObject());
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