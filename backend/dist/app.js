"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const badgeRoutes_1 = __importDefault(require("./routes/badgeRoutes"));
const UserBadge_1 = __importDefault(require("./models/UserBadge"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
    },
    transports: ['websocket'],
    pingInterval: 10000,
    pingTimeout: 5000,
    maxHttpBufferSize: 1e6,
});
cloudinary_1.default.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, express_fileupload_1.default)({
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true,
}));
app.use('/api/auth', authRoutes_1.default);
app.use('/api', messageRoutes_1.default);
app.use('/api', badgeRoutes_1.default); // ✅ NOVO
//  NOVO: Estrutura para armazenar badges dos usuários online
const onlineUsers = new Map();
exports.io.on('connection', (socket) => {
    console.log('🔌 Usuário conectado:', socket.id);
    socket.on('joinChat', (data) => __awaiter(void 0, void 0, void 0, function* () {
        const username = typeof data === 'string' ? data : data.username;
        const badge = typeof data === 'object' ? data.badge : null;
        const currentStreak = typeof data === 'object' ? data.currentStreak : 0;
        if (!username || username.trim() === '') {
            console.warn('⚠️ Username vazio ignorado');
            return;
        }
        if (badge) {
            try {
                yield UserBadge_1.default.findOneAndUpdate({ username: username.trim() }, {
                    currentBadge: badge,
                    currentStreak: currentStreak || 0,
                    lastUpdated: new Date(),
                }, { upsert: true });
                console.log(`💎 Badge de ${username} salva:`, badge.name);
            }
            catch (error) {
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
        exports.io.emit('onlineUsers', userList);
        socket.emit('connected', { username, timestamp: new Date() });
    }));
    socket.on('updateBadge', (data) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const user = onlineUsers.get(socket.id);
        if (!user)
            return;
        user.badge = data.badge;
        user.currentStreak = data.currentStreak;
        try {
            yield UserBadge_1.default.findOneAndUpdate({ username: user.username }, {
                currentBadge: data.badge,
                currentStreak: data.currentStreak,
                lastUpdated: new Date(),
            }, { upsert: true });
        }
        catch (error) {
            console.error('❌ Erro ao atualizar badge:', error);
        }
        const userList = Array.from(onlineUsers.values()).map(u => ({
            username: u.username,
            badge: u.badge,
            currentStreak: u.currentStreak,
        }));
        exports.io.emit('onlineUsers', userList);
        console.log(`💎 Badge de ${user.username} atualizada:`, (_a = data.badge) === null || _a === void 0 ? void 0 : _a.name);
    }));
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
            exports.io.emit('onlineUsers', userList);
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
exports.default = server;
