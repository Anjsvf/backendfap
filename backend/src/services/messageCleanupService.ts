import * as cron from 'node-cron';
import Message from '../models/Message';
import { io } from '../app';

export class MessageCleanupService {
  private cronJob: cron.ScheduledTask | null = null;

  start() {
    // Executa todos os dias à meia-noite (00:00)
    this.cronJob = cron.schedule('0 0 * * *', async () => {
      await this.cleanupOldMessages();
    });

    console.log('🕐 Serviço de limpeza automática iniciado (diário às 00:00)');
    
    // Executa uma limpeza imediatamente ao iniciar
    this.cleanupOldMessages();
  }

  async cleanupOldMessages() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await Message.deleteMany({
        timestamp: { $lt: sevenDaysAgo }
      });

      if (result.deletedCount > 0) {
        console.log(`🗑️ Limpeza automática: ${result.deletedCount} mensagens removidas (antes de ${sevenDaysAgo.toISOString()})`);
        
        // Notifica todos os clientes conectados
        io.emit('messagesCleanup', { 
          deletedCount: result.deletedCount,
          cutoffDate: sevenDaysAgo 
        });
      }
    } catch (error) {
      console.error('❌ Erro na limpeza automática:', error);
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Serviço de limpeza automática parado');
    }
  }
}

export const messageCleanupService = new MessageCleanupService();