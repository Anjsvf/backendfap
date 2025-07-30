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
exports.getOnlineUsers = exports.addReaction = exports.sendMessage = exports.getMessages = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const app_1 = require("../app");
const path_1 = __importDefault(require("path"));
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messages = yield Message_1.default.find().populate('replyTo').sort({ timestamp: 1 });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getMessages = getMessages;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { text, type, replyTo } = req.body;
    const username = req.user.username;
    let audioUri;
    let audioDuration;
    if (type === 'voice' && req.files) {
        // Verificação mais segura para o arquivo de áudio
        const audioFiles = req.files['audio'];
        if (audioFiles) {
            // Se for um array, pega o primeiro arquivo, senão pega o arquivo único
            const audioFile = Array.isArray(audioFiles) ? audioFiles[0] : audioFiles;
            if (audioFile && typeof audioFile === 'object' && 'mv' in audioFile) {
                const uploadPath = path_1.default.join(__dirname, '../uploads', `${Date.now()}-${audioFile.name}`);
                try {
                    yield audioFile.mv(uploadPath);
                    audioUri = `/uploads/${path_1.default.basename(uploadPath)}`;
                    audioDuration = parseInt(req.body.audioDuration) || 0;
                }
                catch (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    return res.status(500).json({ message: 'Error uploading audio file' });
                }
            }
        }
    }
    try {
        const message = yield Message_1.default.create({
            username,
            text,
            type,
            audioUri,
            audioDuration,
            replyTo,
        });
        const populatedMessage = yield Message_1.default.findById(message._id).populate('replyTo');
        app_1.io.emit('newMessage', populatedMessage);
        res.status(201).json(populatedMessage);
    }
    catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.sendMessage = sendMessage;
const addReaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { messageId, emoji } = req.body;
    const username = req.user.username;
    try {
        const message = yield Message_1.default.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        // Trabalha diretamente com objeto em vez de Map
        const reactions = message.reactions || {};
        // Obtém o array de usuários para o emoji ou inicializa um array vazio
        const users = reactions[emoji] || [];
        // Adiciona username ao array se não estiver presente
        if (!users.includes(username)) {
            users.push(username);
            reactions[emoji] = users;
        }
        // Atualiza a mensagem com as novas reações
        yield message.updateOne({ reactions });
        const updatedMessage = yield Message_1.default.findById(messageId).populate('replyTo');
        app_1.io.emit('messageUpdated', updatedMessage);
        res.json(updatedMessage);
    }
    catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.addReaction = addReaction;
const getOnlineUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find({ online: true }).select('username online');
        res.json(users);
    }
    catch (error) {
        console.error('Error getting online users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getOnlineUsers = getOnlineUsers;
