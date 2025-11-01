
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { Server } from 'socket.io';
import http from 'http';
import cloudinary from 'cloudinary';

import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import badgeRoutes from './routes/badgeRoutes'; 
import UserBadge from './models/UserBadge'; 

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_URL || '*', 
    methods: ['GET', 'POST'] 
  },
  transports: ['websocket'],
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,
});

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, 
  abortOnLimit: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);
app.use('/api', badgeRoutes); // ✅ NOVO

//  NOVO: Estrutura para armazenar badges dos usuários online
const onlineUsers = new Map<string, { 
  username: string; 
  connectedAt: Date;
  lastPing: Date;
  badge?: {
    key: string;
    name: string;
    days: number;
    category: string;
  } | null;
  currentStreak?: number;
}>(); 

io.on('connection', (socket) => {
  console.log('🔌 Usuário conectado:', socket.id);

  
  socket.on('joinChat', async (data: { username: string; badge?: any; currentStreak?: number }) => {
    const username = typeof data === 'string' ? data : data.username;
    const badge = typeof data === 'object' ? data.badge : null;
    const currentStreak = typeof data === 'object' ? data.currentStreak : 0;

    if (!username || username.trim() === '') {
      console.warn('⚠️ Username vazio ignorado');
      return;
    }

    
    if (badge) {
      try {
        await UserBadge.findOneAndUpdate(
          { username: username.trim() },
          {
            currentBadge: badge,
            currentStreak: currentStreak || 0,
            lastUpdated: new Date(),
          },
          { upsert: true }
        );
        console.log(`💎 Badge de ${username} salva:`, badge.name);
      } catch (error) {
        console.error('❌ Erro ao salvar badge:', error);
      }
    }

    onlineUsers.set(socket.id, {
      username: username.trim(),
      connectedAt: new Date(),
      lastPing: new Date(),
      badge,
      currentStreak,
    });

    console.log(`👤 ${username} entrou no chat`);

    //  ATUALIZADO: Enviar lista com badges
    const userList = Array.from(onlineUsers.values()).map(u => ({
      username: u.username,
      badge: u.badge,
      currentStreak: u.currentStreak,
    }));
    
    io.emit('onlineUsers', userList);
    
    socket.emit('connected', { username, timestamp: new Date() });
  });

 
  socket.on('updateBadge', async (data: { badge: any; currentStreak: number }) => {
    const user = onlineUsers.get(socket.id);
    if (!user) return;

    user.badge = data.badge;
    user.currentStreak = data.currentStreak;

  
    try {
      await UserBadge.findOneAndUpdate(
        { username: user.username },
        {
          currentBadge: data.badge,
          currentStreak: data.currentStreak,
          lastUpdated: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Erro ao atualizar badge:', error);
    }

   
    const userList = Array.from(onlineUsers.values()).map(u => ({
      username: u.username,
      badge: u.badge,
      currentStreak: u.currentStreak,
    }));
    
    io.emit('onlineUsers', userList);
    console.log(`💎 Badge de ${user.username} atualizada:`, data.badge?.name);
  });

  socket.on('ping', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.lastPing = new Date();
    }
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      console.log(`🚪 ${user.username} saiu do chat`);

      const userList = Array.from(onlineUsers.values()).map(u => ({
        username: u.username,
        badge: u.badge,
        currentStreak: u.currentStreak,
      }));
      
      io.emit('onlineUsers', userList);
    }
  });

  setInterval(() => {
    const now = new Date();
    const timeout = 5 * 60 * 1000; 

    for (const [socketId, user] of onlineUsers.entries()) {
      if (now.getTime() - user.lastPing.getTime() > timeout) {
        console.log(`🧹 Removendo usuário inativo: ${user.username}`);
        onlineUsers.delete(socketId);
      }
    }
  }, 60000); 
});

app.get('/', (req, res) => {
  res.json({
    message: 'Chat Server Online',
    status: 'OK',
    timestamp: new Date().toISOString(),
    onlineUsers: onlineUsers.size,
  });
});

app.get('/debug/users', (req, res) => {
  const users = Array.from(onlineUsers.entries()).map(([socketId, user]) => ({
    socketId,
    username: user.username,
    connectedAt: user.connectedAt,
    lastPing: user.lastPing,
    badge: user.badge,
    currentStreak: user.currentStreak,
  }));
  
  res.json({ onlineUsers: users });
});

export default server;