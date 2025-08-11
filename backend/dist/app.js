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
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, express_fileupload_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes_1.default);
app.use('/api', messageRoutes_1.default);
// *** CONTROLE DE USUÁRIOS ONLINE ***
const onlineUsers = new Map();
// chave: socket.id, valor: username
exports.io.on('connection', socket => {
    console.log('A user connected:', socket.id);
    socket.on('joinChat', (username) => {
        onlineUsers.set(socket.id, username);
        console.log(`👤 ${username} entrou no chat`);
        // Enviar lista atualizada de usuários online para todos
        exports.io.emit('onlineUsers', Array.from(new Set(onlineUsers.values())));
    });
    socket.on('disconnect', () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            onlineUsers.delete(socket.id);
            console.log(`🚪 ${username} saiu do chat`);
            // Enviar lista atualizada após saída
            exports.io.emit('onlineUsers', Array.from(new Set(onlineUsers.values())));
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
exports.default = server;
