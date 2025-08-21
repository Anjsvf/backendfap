"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'], // ✅ Fallback
});
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, express_fileupload_1.default)({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    abortOnLimit: true,
}));
// ✅ Servir arquivos estáticos com headers corretos
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads'), {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.m4a') || filepath.endsWith('.mp3')) {
            res.setHeader('Content-Type', 'audio/mpeg');
        }
    }
}));
app.use('/api/auth', authRoutes_1.default);
app.use('/api', messageRoutes_1.default);
// ✅ CONTROLE DE USUÁRIOS ONLINE MELHORADO
const onlineUsers = new Map();
exports.io.on('connection', (socket) => {
    console.log('🔌 Usuário conectado:', socket.id);
    socket.on('joinChat', (username) => {
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
        // ✅ Enviar lista atualizada
        const userList = Array.from(new Set(Array.from(onlineUsers.values()).map(u => u.username)));
        exports.io.emit('onlineUsers', userList);
        // ✅ Enviar confirmação de conexão
        socket.emit('connected', { username, timestamp: new Date() });
    });
    // ✅ Heartbeat para manter conexão ativa
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
            // ✅ Atualizar lista após saída
            const userList = Array.from(new Set(Array.from(onlineUsers.values()).map(u => u.username)));
            exports.io.emit('onlineUsers', userList);
        }
    });
    // ✅ Limpeza periódica de conexões "fantasma"
    setInterval(() => {
        const now = new Date();
        const timeout = 5 * 60 * 1000; // 5 minutos
        for (const [socketId, user] of onlineUsers.entries()) {
            if (now.getTime() - user.lastPing.getTime() > timeout) {
                console.log(`🧹 Removendo usuário inativo: ${user.username}`);
                onlineUsers.delete(socketId);
            }
        }
    }, 60000); // Verificar a cada minuto
});
// ✅ Health check melhorado
app.get('/', (req, res) => {
    res.json({
        message: 'Chat Server Online',
        status: 'OK',
        timestamp: new Date().toISOString(),
        onlineUsers: onlineUsers.size,
    });
});
// ✅ Endpoint para debug
app.get('/debug/users', (req, res) => {
    const users = Array.from(onlineUsers.entries()).map(([socketId, user]) => ({
        socketId,
        username: user.username,
        connectedAt: user.connectedAt,
        lastPing: user.lastPing,
    }));
    res.json({ onlineUsers: users });
});
exports.default = server;
