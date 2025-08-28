
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Verification from '../models/Verification';
import { RegisterInput, LoginInput, VerifyEmailInput, ResendCodeInput, ForgotPasswordInput, ResetPasswordInput } from '../types';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';
import { io } from '../app';


const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] 
    });
    
    if (userExists) {
      return res.status(400).json({ message: 'Username or email already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      online: false,
      emailVerified: false,
    });

   
    const verificationCode = generateVerificationCode();
    
    await Verification.create({
      email: email.toLowerCase(),
      code: verificationCode,
      type: 'email_verification',
    });

    await sendVerificationEmail(email, verificationCode, username);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification code.',
      email: user.email,
      needsVerification: true,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { email, code }: VerifyEmailInput = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required' });
  }

  try {
    const verification = await Verification.findOne({
      email: email.toLowerCase(),
      code,
      type: 'email_verification',
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { emailVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

  
    await Verification.deleteMany({ email: email.toLowerCase(), type: 'email_verification' });

    res.json({
      message: 'Email verified successfully',
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  const { email, type }: ResendCodeInput = req.body;

  if (!email || !type) {
    return res.status(400).json({ message: 'Email and type are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (type === 'email_verification' && user.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

   
    await Verification.deleteMany({ email: email.toLowerCase(), type });

    const verificationCode = generateVerificationCode();
    
    await Verification.create({
      email: email.toLowerCase(),
      code: verificationCode,
      type,
    });

    if (type === 'email_verification') {
      await sendVerificationEmail(email, verificationCode, user.username);
    } else {
      await sendPasswordResetEmail(email, verificationCode, user.username);
    }

    res.json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Resend code error:', error);
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

    if (!user.emailVerified) {
   
      const verificationCode = generateVerificationCode();
      
      await Verification.deleteMany({ email: email.toLowerCase(), type: 'email_verification' });
      await Verification.create({
        email: email.toLowerCase(),
        code: verificationCode,
        type: 'email_verification',
      });

      await sendVerificationEmail(email, verificationCode, user.username);

      return res.status(403).json({ 
        message: 'Email not verified. A new verification code has been sent to your email.',
        needsVerification: true,
        email: user.email,
      });
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

export const forgotPassword = async (req: Request, res: Response) => {
  const { email }: ForgotPasswordInput = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Por segurança, não revelamos se o usuário existe ou não
      return res.json({ message: 'If this email exists, a password reset code has been sent.' });
    }

    // Remover códigos anteriores
    await Verification.deleteMany({ email: email.toLowerCase(), type: 'password_reset' });

    const resetCode = generateVerificationCode();
    
    await Verification.create({
      email: email.toLowerCase(),
      code: resetCode,
      type: 'password_reset',
    });

    await sendPasswordResetEmail(email, resetCode, user.username);

    res.json({ message: 'If this email exists, a password reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, code, newPassword }: ResetPasswordInput = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  try {
    const verification = await Verification.findOne({
      email: email.toLowerCase(),
      code,
      type: 'password_reset',
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remover códigos de reset usados
    await Verification.deleteMany({ email: email.toLowerCase(), type: 'password_reset' });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
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