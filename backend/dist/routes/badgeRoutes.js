"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const badgeController_1 = require("../controllers/badgeController");
const router = express_1.default.Router();
router.post('/badges/update', authMiddleware_1.protect, badgeController_1.updateUserBadge);
router.get('/badges/:username', authMiddleware_1.protect, badgeController_1.getUserBadge);
router.get('/badges', authMiddleware_1.protect, badgeController_1.getOnlineUserBadges);
exports.default = router;
