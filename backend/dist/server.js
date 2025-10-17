"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const messageCleanupService_1 = require("./services/messageCleanupService");
const PORT = process.env.PORT || 5000;
(0, db_1.default)()
    .then(() => {
    app_1.default.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📧 SMTP_HOST: ${process.env.SMTP_HOST}`);
        // Inicia o serviço de limpeza automática
        messageCleanupService_1.messageCleanupService.start();
        console.log('Serviço de limpeza de mensagens iniciado');
    });
})
    .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
});
// Graceful shutdown - para o serviço ao encerrar o servidor
process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM recebido, encerrando servidor...');
    messageCleanupService_1.messageCleanupService.stop();
    app_1.default.close(() => {
        console.log('Servidor encerrado com sucesso');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log(' SIGINT recebido, encerrando servidor...');
    messageCleanupService_1.messageCleanupService.stop();
    app_1.default.close(() => {
        console.log(' Servidor encerrado com sucesso');
        process.exit(0);
    });
});
