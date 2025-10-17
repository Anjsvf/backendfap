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
exports.logout = exports.login = exports.checkUsername = exports.register = void 0;
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
    if (!/^[a-zA-Z0-9\u00C0-\u017F_]+$/.test(username)) {
        return res.status(400).json({
            message: 'Username must contain only letters (including accents), numbers, and underscores'
        });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    try {
        const userExists = yield User_1.default.findOne({
            $or: [{ username }, { email: email.toLowerCase() }]
        });
        if (userExists) {
            return res.status(400).json({ message: 'Email ou username já existe' });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        const user = yield User_1.default.create({
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            online: false,
            emailVerified: true,
        });
        // Automaticamente faz login após registro
        yield User_1.default.findByIdAndUpdate(user._id, { online: true });
        app_1.io.emit('userStatus', { username: user.username, online: true });
        res.status(201).json({
            message: 'User registered successfully',
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
            return res.status(400).json({ message: 'Username already taken' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.register = register;
const checkUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Username is required' });
    }
    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({
            available: false,
            message: 'O nome de usuário deve ter entre 3 e 20 caracteres'
        });
    }
    if (!/^[a-zA-Z0-9\u00C0-\u017F_]+$/.test(username)) {
        return res.status(400).json({
            available: false,
            message: 'O nome de usuário deve conter apenas letras (incluindo acentos), números e _'
        });
    }
    try {
        const userExists = yield User_1.default.findOne({ username });
        if (userExists) {
            return res.json({
                available: false,
                message: 'Nome de usuário já está em uso'
            });
        }
        res.json({
            available: true,
            message: 'Nome de usuário disponível.'
        });
    }
    catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.checkUsername = checkUsername;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const user = yield User_1.default.findOne({ email: email.toLowerCase() });
        if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        yield User_1.default.findByIdAndUpdate(user._id, { online: true });
        app_1.io.emit('userStatus', { username: user.username, online: true });
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.body.userId);
        if (user) {
            yield User_1.default.findByIdAndUpdate(req.body.userId, { online: false });
            app_1.io.emit('userStatus', { username: user.username, online: false });
            res.json({ message: 'Logged out successfully' });
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.logout = logout;
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};
