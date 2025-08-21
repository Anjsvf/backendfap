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
exports.logout = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const app_1 = require("../app");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ message: 'Username must be between 3 and 20 characters' });
    }
    // Regex atualizada para aceitar letras (incluindo acentos), números e underscores
    if (!/^[a-zA-Z0-9\u00C0-\u017F_]+$/.test(username)) {
        return res.status(400).json({
            message: 'Username must contain only letters (including accents), numbers, and underscores'
        });
    }
    const userExists = yield User_1.default.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (userExists) {
        return res.status(400).json({ message: 'Username or email already taken' });
    }
    const salt = yield bcryptjs_1.default.genSalt(10);
    const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
    const user = yield User_1.default.create({
        username,
        email,
        password: hashedPassword,
        online: true,
    });
    if (user) {
        app_1.io.emit('userStatus', { username: user.username, online: true });
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    }
    else {
        res.status(400).json({ message: 'Invalid user data' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const user = yield User_1.default.findOne({ email: email.toLowerCase() });
    if (user && (yield bcryptjs_1.default.compare(password, user.password))) {
        yield User_1.default.findByIdAndUpdate(user._id, { online: true });
        app_1.io.emit('userStatus', { username: user.username, online: true });
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    }
    else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.default.findById(req.body.userId);
    if (user) {
        yield User_1.default.findByIdAndUpdate(req.body.userId, { online: false });
        app_1.io.emit('userStatus', { username: user.username, online: false });
        res.json({ message: 'Logged out successfully' });
    }
    else {
        res.status(404).json({ message: 'User not found' });
    }
});
exports.logout = logout;
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};
