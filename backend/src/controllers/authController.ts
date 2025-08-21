import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { RegisterInput, LoginInput } from '../types';
import { io } from '../app';

export const register = async (req: Request, res: Response) => {
  const { username, email, password }: RegisterInput = req.body;

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

  const userExists = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
  if (userExists) {
    return res.status(400).json({ message: 'Username or email already taken' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    online: true,
  });

  if (user) {
    io.emit('userStatus', { username: user.username, online: true });
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password }: LoginInput = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && (await bcrypt.compare(password, user.password))) {
    await User.findByIdAndUpdate(user._id, { online: true });
    io.emit('userStatus', { username: user.username, online: true });
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const user = await User.findById(req.body.userId);
  if (user) {
    await User.findByIdAndUpdate(req.body.userId, { online: false });
    io.emit('userStatus', { username: user.username, online: false });
    res.json({ message: 'Logged out successfully' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};