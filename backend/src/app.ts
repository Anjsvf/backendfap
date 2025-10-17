import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';

import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_URL || '*', 
    methods: ['GET', 'POST'] 
  },
  transports: ['websocket'], // FIX: Force websocket (polling fallback automático)
  pingInterval: 10000, //  FIX: 10s ping pra detectar delays
  pingTimeout: 5000, // FIX: 5s timeout
  maxHttpBufferSize: 1e6, //  FIX: Pra msgs grandes
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


app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.m4a') || filepath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);


const onlineUsers = new Map<string, { 
  username: string; 
  connectedAt: Date;
  lastPing: Date;
}>(); 

io.on('connection', (socket) => {
  console.log('🔌 Usuário conectado:', socket.id);

  socket.on('joinChat', (username: string) => {
    if (!username || username.trim() === '') {
      console.warn('⚠️ Username vazio ignorado');
      return;
    }

    onlineUsers.set(socket.id, {
      username: username.trim(),
      connectedAt: new Date(),
      lastPing: new Date(),
    });

    console.log(`👤 ${username} entrou no chat`);

    
    const userList = Array.from(new Set(
      Array.from(onlineUsers.values()).map(u => u.username)
    ));
    
    io.emit('onlineUsers', userList);
    
    
    socket.emit('connected', { username, timestamp: new Date() });
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

     
      const userList = Array.from(new Set(
        Array.from(onlineUsers.values()).map(u => u.username)
      ));
      
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
  }));
  
  res.json({ onlineUsers: users });
});

export default server;