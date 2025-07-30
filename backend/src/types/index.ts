export interface User {
  _id: string;
  username: string;
  email: string;
  password: string;
  online: boolean;
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