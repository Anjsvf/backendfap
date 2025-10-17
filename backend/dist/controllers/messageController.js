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
const path_1 = __importDefault(require("path"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const app_1 = require("../app");
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let query = {};
        const since = req.query.since;
        const limit = parseInt(req.query.limit) || 50; // ✅ FIX: Default 50
        if (since) {
            const sinceDate = new Date(since);
            // ✅ FIX: Usa $gte (maior ou igual) pra incluir a última msg (evita gaps)
            query = { timestamp: { $gte: sinceDate } };
        }
        // ✅ FIX: REMOVE populate (leve pra API, só populado no emit real-time)
        const messages = yield Message_1.default.find(query)
            .sort({ timestamp: 1 })
            .limit(limit) // ✅ FIX: Aplica limit
            .lean();
        res.json(messages);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getMessages = getMessages;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { text, type, replyTo } = req.body;
    const username = req.user.username;
    let audioUri;
    let audioDuration;
    if (type === 'voice' && ((_a = req.files) === null || _a === void 0 ? void 0 : _a.audio)) {
        const file = Array.isArray(req.files.audio) ? req.files.audio[0] : req.files.audio;
        const uploadPath = path_1.default.join(__dirname, '../uploads', `${Date.now()}-${file.name}`);
        try {
            yield file.mv(uploadPath);
            const serverUrl = process.env.NODE_ENV === 'production'
                ? `https://${req.get('host')}`
                : `${req.protocol}://${req.get('host')}`;
            audioUri = `${serverUrl}/uploads/${path_1.default.basename(uploadPath)}`;
            audioDuration = parseInt(req.body.audioDuration, 10) || 0;
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({ message: 'Error uploading audio file' });
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
        // ✅ Populate SÓ pro emit (real-time precisa do objeto)
        const populatedForEmit = yield Message_1.default.findById(message._id).populate('replyTo').lean();
        app_1.io.emit('newMessage', populatedForEmit);
        // ✅ res.json SEM populate (leve pra API)
        res.status(201).json(message.toObject());
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.sendMessage = sendMessage;
const addReaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { messageId, emoji } = req.body;
    const username = req.user.username;
    try {
        const message = yield Message_1.default.findById(messageId);
        if (!message)
            return res.status(404).json({ message: 'Message not found' });
        const reactions = message.reactions && typeof message.reactions === 'object'
            ? JSON.parse(JSON.stringify(message.reactions))
            : {};
        // ✅ Limpa reações antigas do usuário (toggle)
        for (const [key, val] of Object.entries(reactions)) {
            if (Array.isArray(val)) {
                const filtered = val.filter((u) => u !== username);
                if (filtered.length === 0) {
                    delete reactions[key];
                }
                else {
                    reactions[key] = filtered;
                }
            }
        }
        const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
        const idx = current.indexOf(username);
        if (idx === -1) {
            reactions[emoji] = [...current, username];
        }
        else {
            current.splice(idx, 1);
            if (current.length === 0)
                delete reactions[emoji];
            else
                reactions[emoji] = current;
        }
        message.reactions = reactions;
        message.markModified('reactions');
        yield message.save();
        // ✅ Populate SÓ pro emit (real-time precisa do objeto)
        const populatedForEmit = yield Message_1.default.findById(messageId).populate('replyTo').lean();
        app_1.io.emit('messageUpdated', populatedForEmit);
        // ✅ res.json SEM populate (leve pra API)
        res.json(message.toObject());
    }
    catch (err) {
        console.error('Erro ao adicionar reação:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.addReaction = addReaction;
const getOnlineUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find({ online: true }).select('username online');
        res.json(users);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getOnlineUsers = getOnlineUsers;
