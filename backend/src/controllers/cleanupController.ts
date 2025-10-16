import { Request, Response } from 'express';
import Message from '../models/Message';

export const cleanupOldMessages = async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await Message.deleteMany({
      timestamp: { $lt: sevenDaysAgo }
    });

    console.log(`Limpeza automática: ${result.deletedCount} mensagens removidas`);
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      cutoffDate: sevenDaysAgo 
    });
  } catch (err) {
    console.error('Erro na limpeza de mensagens:', err);
    res.status(500).json({ message: 'Erro ao limpar mensagens antigas' });
  }
};

export const getMessagesStats = async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const totalMessages = await Message.countDocuments();
    const oldMessages = await Message.countDocuments({
      timestamp: { $lt: sevenDaysAgo }
    });
    const recentMessages = totalMessages - oldMessages;

    res.json({
      total: totalMessages,
      old: oldMessages,
      recent: recentMessages,
      cutoffDate: sevenDaysAgo
    });
  } catch (err) {
    console.error('Erro ao obter estatísticas:', err);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};