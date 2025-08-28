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
exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendVerificationEmail = (email, code, username) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: `"Chat Global" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verificação de E-mail - Chat Global',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; overflow: hidden;">
        <div style="padding: 30px; text-align: center;">
          <h1 style="margin: 0 0 20px 0; font-size: 28px;">Bem-vindo ao Chat Global!</h1>
          <p style="font-size: 16px; margin: 20px 0;">Olá <strong>${username}</strong>,</p>
          <p style="font-size: 16px; margin: 20px 0;">Para completar seu cadastro, use o código de verificação abaixo:</p>
          
          <div style="background: rgba(255,255,255,0.1); padding: 20px; margin: 30px 0; border-radius: 10px; border: 2px dashed rgba(255,255,255,0.3);">
            <h2 style="font-size: 32px; margin: 0; letter-spacing: 8px; color: #FFD700;">${code}</h2>
          </div>
          
          <p style="font-size: 14px; opacity: 0.8; margin: 20px 0;">Este código expira em 10 minutos.</p>
          <p style="font-size: 14px; opacity: 0.8;">Se você não solicitou esta verificação, ignore este e-mail.</p>
        </div>
      </div>
    `
    };
    yield transporter.sendMail(mailOptions);
});
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = (email, code, username) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: `"Chat Global" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Recuperação de Senha - Chat Global',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 10px; overflow: hidden;">
        <div style="padding: 30px; text-align: center;">
          <h1 style="margin: 0 0 20px 0; font-size: 28px;">Recuperação de Senha</h1>
          <p style="font-size: 16px; margin: 20px 0;">Olá <strong>${username}</strong>,</p>
          <p style="font-size: 16px; margin: 20px 0;">Recebemos uma solicitação para redefinir sua senha. Use o código abaixo:</p>
          
          <div style="background: rgba(255,255,255,0.1); padding: 20px; margin: 30px 0; border-radius: 10px; border: 2px dashed rgba(255,255,255,0.3);">
            <h2 style="font-size: 32px; margin: 0; letter-spacing: 8px; color: #FFD700;">${code}</h2>
          </div>
          
          <p style="font-size: 14px; opacity: 0.8; margin: 20px 0;">Este código expira em 10 minutos.</p>
          <p style="font-size: 14px; opacity: 0.8;">Se você não solicitou esta recuperação, ignore este e-mail.</p>
        </div>
      </div>
    `
    };
    yield transporter.sendMail(mailOptions);
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
