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
exports.getMessagesStats = exports.cleanupOldMessages = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const cleanupOldMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const result = yield Message_1.default.deleteMany({
            timestamp: { $lt: sevenDaysAgo }
        });
        console.log(`Limpeza automática: ${result.deletedCount} mensagens removidas`);
        res.json({
            success: true,
            deletedCount: result.deletedCount,
            cutoffDate: sevenDaysAgo
        });
    }
    catch (err) {
        console.error('Erro na limpeza de mensagens:', err);
        res.status(500).json({ message: 'Erro ao limpar mensagens antigas' });
    }
});
exports.cleanupOldMessages = cleanupOldMessages;
const getMessagesStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const totalMessages = yield Message_1.default.countDocuments();
        const oldMessages = yield Message_1.default.countDocuments({
            timestamp: { $lt: sevenDaysAgo }
        });
        const recentMessages = totalMessages - oldMessages;
        res.json({
            total: totalMessages,
            old: oldMessages,
            recent: recentMessages,
            cutoffDate: sevenDaysAgo
        });
    }
    catch (err) {
        console.error('Erro ao obter estatísticas:', err);
        res.status(500).json({ message: 'Erro ao obter estatísticas' });
    }
});
exports.getMessagesStats = getMessagesStats;
