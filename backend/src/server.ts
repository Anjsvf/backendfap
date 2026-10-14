import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import dotenv from 'dotenv';
dotenv.config(); 

import server from './app';
import connectDB from './config/db';
import { messageCleanupService } from './services/messageCleanupService';

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📧 SMTP_HOST: ${process.env.SMTP_HOST}`);
      
      // Inicia o serviço de limpeza automática
      messageCleanupService.start();
      console.log('Serviço de limpeza de mensagens iniciado');
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  });

// Graceful shutdown - para o serviço ao encerrar o servidor
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recebido, encerrando servidor...');
  messageCleanupService.stop();
  server.close(() => {
    console.log('Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(' SIGINT recebido, encerrando servidor...');
  messageCleanupService.stop();
  server.close(() => {
    console.log(' Servidor encerrado com sucesso');
    process.exit(0);
  });
});