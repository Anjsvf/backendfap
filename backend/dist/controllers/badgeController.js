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
exports.getOnlineUserBadges = exports.getUserBadge = exports.updateUserBadge = void 0;
const UserBadge_1 = __importDefault(require("../models/UserBadge"));
const updateUserBadge = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { currentBadge, currentStreak } = req.body;
    const username = req.user.username;
    try {
        const userBadge = yield UserBadge_1.default.findOneAndUpdate({ username }, {
            currentBadge,
            currentStreak,
            lastUpdated: new Date(),
        }, { upsert: true, new: true });
        res.json(userBadge);
    }
    catch (error) {
        console.error('Error updating badge:', error);
        res.status(500).json({ message: 'Error updating badge' });
    }
});
exports.updateUserBadge = updateUserBadge;
const getUserBadge = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.params;
    try {
        const userBadge = yield UserBadge_1.default.findOne({ username });
        if (!userBadge) {
            return res.json({
                username,
                currentBadge: null,
                currentStreak: 0,
            });
        }
        res.json(userBadge);
    }
    catch (error) {
        console.error('Error getting badge:', error);
        res.status(500).json({ message: 'Error getting badge' });
    }
});
exports.getUserBadge = getUserBadge;
const getOnlineUserBadges = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const badges = yield UserBadge_1.default.find({}).select('username currentBadge currentStreak');
        res.json(badges);
    }
    catch (error) {
        console.error('Error getting online badges:', error);
        res.status(500).json({ message: 'Error getting badges' });
    }
});
exports.getOnlineUserBadges = getOnlineUserBadges;
