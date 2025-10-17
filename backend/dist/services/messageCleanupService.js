"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.messageCleanupService = exports.MessageCleanupService = void 0;
const cron = __importStar(require("node-cron"));
const Message_1 = __importDefault(require("../models/Message"));
const app_1 = require("../app");
class MessageCleanupService {
    constructor() {
        this.cronJob = null;
    }
    start() {
        // Executa todos os dias à meia-noite (00:00)
        this.cronJob = cron.schedule('0 0 * * *', () => __awaiter(this, void 0, void 0, function* () {
            yield this.cleanupOldMessages();
        }));
        console.log(' Serviço de limpeza automática iniciado (diário às 00:00)');
        // Executa uma limpeza imediatamente ao iniciar
        this.cleanupOldMessages();
    }
    cleanupOldMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const result = yield Message_1.default.deleteMany({
                    timestamp: { $lt: sevenDaysAgo }
                });
                if (result.deletedCount > 0) {
                    console.log(`🗑️ Limpeza automática: ${result.deletedCount} mensagens removidas (antes de ${sevenDaysAgo.toISOString()})`);
                    // Notifica todos os clientes conectados
                    app_1.io.emit('messagesCleanup', {
                        deletedCount: result.deletedCount,
                        cutoffDate: sevenDaysAgo
                    });
                }
            }
            catch (error) {
                console.error(' Erro na limpeza automática:', error);
            }
        });
    }
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('🛑 Serviço de limpeza automática parado');
        }
    }
}
exports.MessageCleanupService = MessageCleanupService;
exports.messageCleanupService = new MessageCleanupService();
