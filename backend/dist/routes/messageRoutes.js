"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const messageController_1 = require("../controllers/messageController");
const router = express_1.default.Router();
router.get('/messages', authMiddleware_1.protect, messageController_1.getMessages);
router.post('/messages', authMiddleware_1.protect, messageController_1.sendMessage);
router.post('/messages/reaction', authMiddleware_1.protect, messageController_1.addReaction);
router.get('/users/online', authMiddleware_1.protect, messageController_1.getOnlineUsers);
exports.default = router;
