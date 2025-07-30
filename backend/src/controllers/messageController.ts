import { Request, Response } from 'express';
import Message from '../models/Message';
import User from '../models/User';
import { Message as MessageType } from '../types';
import { io } from '../app';
import path from 'path';
import fs from 'fs';
import { UploadedFile } from 'express-fileupload';

// Interface para tipagem mais segura dos arquivos
interface RequestWithFiles extends Request {
  files?: {
    [key: string]: UploadedFile | UploadedFile[];
  } | null;
}

export const getMessages = async (req: Request, res: Response) => {
  try {
    const messages = await Message.find().populate('replyTo').sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendMessage = async (req: RequestWithFiles, res: Response) => {
  const { text, type, replyTo } = req.body;
  const username = (req as any).user.username;
  let audioUri: string | undefined;
  let audioDuration: number | undefined;

  if (type === 'voice' && req.files) {
    // Verificação mais segura para o arquivo de áudio
    const audioFiles = req.files['audio'];
    if (audioFiles) {
      // Se for um array, pega o primeiro arquivo, senão pega o arquivo único
      const audioFile = Array.isArray(audioFiles) ? audioFiles[0] : audioFiles;
      
      if (audioFile && typeof audioFile === 'object' && 'mv' in audioFile) {
        const uploadPath = path.join(__dirname, '../uploads', `${Date.now()}-${audioFile.name}`);
        
        try {
          await audioFile.mv(uploadPath);
          audioUri = `/uploads/${path.basename(uploadPath)}`;
          audioDuration = parseInt(req.body.audioDuration) || 0;
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          return res.status(500).json({ message: 'Error uploading audio file' });
        }
      }
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

    const populatedMessage = await Message.findById(message._id).populate('replyTo');
    io.emit('newMessage', populatedMessage);
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  const { messageId, emoji } = req.body;
  const username = (req as any).user.username;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Trabalha diretamente com objeto em vez de Map
    const reactions = message.reactions || {};
    
    // Obtém o array de usuários para o emoji ou inicializa um array vazio
    const users = reactions[emoji] || [];
    
    // Adiciona username ao array se não estiver presente
    if (!users.includes(username)) {
      users.push(username);
      reactions[emoji] = users;
    }

    // Atualiza a mensagem com as novas reações
    await message.updateOne({ reactions });
    const updatedMessage = await Message.findById(messageId).populate('replyTo');
    io.emit('messageUpdated', updatedMessage);
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ online: true }).select('username online');
    res.json(users);
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};