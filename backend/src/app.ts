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
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.use(fileUpload());                         
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);

// *** CONTROLE DE USUÁRIOS ONLINE ***
const onlineUsers = new Map<string, string>(); 
// chave: socket.id, valor: username

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  socket.on('joinChat', (username: string) => {
    onlineUsers.set(socket.id, username);
    console.log(`👤 ${username} entrou no chat`);

    // Enviar lista atualizada de usuários online para todos
    io.emit('onlineUsers', Array.from(new Set(onlineUsers.values())));
  });

  socket.on('disconnect', () => {
    const username = onlineUsers.get(socket.id);
    if (username) {
      onlineUsers.delete(socket.id);
      console.log(`🚪 ${username} saiu do chat`);

      // Enviar lista atualizada após saída
      io.emit('onlineUsers', Array.from(new Set(onlineUsers.values())));
    }
    console.log('User disconnected:', socket.id);
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Server is working",
    status: "OK",
  });
});

export default server;
