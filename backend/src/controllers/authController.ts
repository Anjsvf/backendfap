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

  if (!/^[a-zA-Z0-9\u00C0-\u017F_]+$/.test(username)) {
    return res.status(400).json({ 
      message: 'Username must contain only letters (including accents), numbers, and underscores' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const userExists = await User.findOne({ 
      $or: [{ username }, { email: email.toLowerCase() }] 
    });
    
    if (userExists) {
      return res.status(400).json({ message: 'Email ou username já existe' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      online: false,
      emailVerified: true, // Definido como true por padrão sem verificação
    });

    // Automaticamente faz login após registro
    await User.findByIdAndUpdate(user._id, { online: true });
    io.emit('userStatus', { username: user.username, online: true });

    res.status(201).json({
      message: 'User registered successfully',
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error: unknown) { 
    console.error('Registration error:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkUsername = async (req: Request, res: Response) => {
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
    const userExists = await User.findOne({ username });

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
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password }: LoginInput = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await User.findByIdAndUpdate(user._id, { online: true });
    io.emit('userStatus', { username: user.username, online: true });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.body.userId);
    if (user) {
      await User.findByIdAndUpdate(req.body.userId, { online: false });
      io.emit('userStatus', { username: user.username, online: false });
      res.json({ message: 'Logged out successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};