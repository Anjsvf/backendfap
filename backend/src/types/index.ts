
export interface User {
  _id: string;
  username: string;
  email: string;
  password: string;
  online: boolean;
  emailVerified: boolean; 
  createdAt: Date;
}

export interface Message {
  _id: string;
  username: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'voice';
  audioUri?: string;
  audioDuration?: number;
  replyTo?: Message | null;
  reactions?: { [emoji: string]: string[] };
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}


export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ResendCodeInput {
  email: string;
  type: 'email_verification' | 'password_reset';
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}