
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';   
import path from 'path';

import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import { Server } from 'socket.io';
import http from 'http';

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


io.on('connection', socket => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
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