# Documentação Completa - Backend Chat Global

##  Índice

1. [Visão Geral](#visão-geral)
 
2. [Configuração e Instalação](#configuração-e-instalação)
3. [Modelos de Dados](#modelos-de-dados)
4. [Autenticação e Autorização](#autenticação-e-autorização)
5. [Rotas da API](#rotas-da-api)
6. [WebSocket/Socket.IO](#websocketsocketio)
7. [Sistema de E-mail](#sistema-de-e-mail)
8. [Upload de Arquivos](#upload-de-arquivos)
9. [Middleware](#middleware)
10. [Tratamento de Erros](#tratamento-de-erros)
11. [Deploy](#deploy)

## Visão Geral

O **Chat Global** é uma aplicação de chat em tempo real construída com Node.js, TypeScript, MongoDB e Socket.IO. O sistema oferece funcionalidades completas de autenticação, mensagens de texto e voz, reações a mensagens e presença de usuários online.

### Funcionalidades Principais

- ✅ Sistema completo de autenticação (registro, login, logout)
- ✅ Verificação de e-mail com códigos
- ✅ Recuperação de senha
- ✅ Chat em tempo real com Socket.IO
- ✅ Mensagens de texto e voz
- ✅ Sistema de reações emoji
- ✅ Respostas a mensagens (replies)
- ✅ Status de usuários online/offline
- ✅ Upload e reprodução de áudio
- ✅ Validação de dados robusta
- ✅ E-mails HTML estilizados

### Stack Tecnológica

- **Runtime**: Node.js
- **Linguagem**: TypeScript
- **Framework**: Express.js
- **Banco de Dados**: MongoDB com Mongoose
- **WebSocket**: Socket.IO
- **Autenticação**: JWT (JSON Web Tokens)
- **Hash de Senhas**: bcryptjs
- **E-mail**: Nodemailer
- **Upload de Arquivos**: express-fileupload



##  Configuração e Instalação

### Pré-requisitos

- Node.js (v18+)
- MongoDB
- Conta de e-mail SMTP (Gmail recomendado)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Anjsvf/backendfap
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.exemple .env
```

### Variáveis de Ambiente

```env
# Banco de Dados
MONGODB_URI=mongodb://localhost:27017/chatglobal

# Autenticação JWT
JWT_SECRET=sua_chave_secreta_super_forte

# Servidor
PORT=5000
NODE_ENV=development

# SMTP para E-mails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASS=sua_senha_de_app


```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start
```

##  Modelos de Dados

### User Model

```typescript
interface User {
  _id: string;
  username: string;        // 3-20 caracteres, único
  email: string;          // único, lowercase
  password: string;       // hash bcrypt, min 6 caracteres
  online: boolean;        // status online/offline
  emailVerified: boolean; // verificação de e-mail
  createdAt: Date;       // data de criação
}
```

**Validações:**
- Username: apenas letras, números, underscore e acentos
- E-mail: formato válido e único
- Senha: mínimo 6 caracteres

### Message Model

```typescript
interface Message {
  _id: string;
  username: string;           // autor da mensagem
  text: string;              // conteúdo da mensagem
  timestamp: Date;           // data/hora de envio
  type: 'text' | 'voice';    // tipo da mensagem
  audioUri?: string;         // URL do arquivo de áudio
  audioDuration?: number;    // duração em segundos
  replyTo?: Message;         // referência à mensagem pai
  reactions?: {              // reações emoji
    [emoji: string]: string[]; // array de usernames
  };
}
```

### Verification Model

```typescript
interface Verification {
  _id: string;
  email: string;
  code: string;                          // código de 6 dígitos
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;                       // expira em 10 minutos
  createdAt: Date;
}
```

**Recursos:**
- TTL Index: documentos expiram automaticamente
- Índices compostos para otimização de consultas

##  Autenticação e Autorização

### Fluxo de Autenticação

1. **Registro**: Usuário se cadastra com username, email e senha
2. **Verificação**: Sistema envia código de 6 dígitos por e-mail
3. **Confirmação**: Usuário insere código para ativar conta
4. **Login**: Autenticação com email/senha retorna JWT
5. **Acesso**: JWT é usado para acessar rotas protegidas

### JWT Token

- **Expiração**: 30 dias
- **Payload**: `{ id: userId }`
- **Header**: `Authorization: Bearer <token>`

### Segurança

- Senhas hasheadas com bcrypt (salt rounds: 10)
- Tokens JWT com secret forte
- Validação rigorosa de dados de entrada
- Rate limiting implícito via Socket.IO

##  Rotas da API

### Rotas de Autenticação (`/api/auth`)

#### POST `/api/auth/register`
Registra um novo usuário e envia código de verificação.

**Body:**
```json
{
  "username": "joao123",
  "email": "joao@email.com", 
  "password": "minhasenha123"
}
```

**Resposta (201):**
```json
{
  "message": "User registered successfully. Please check your email for verification code.",
  "email": "joao@email.com",
  "needsVerification": true
}
```

**Validações:**
- Username: 3-20 caracteres, apenas letras, números, underscore e acentos
- E-mail: formato válido
- Senha: mínimo 6 caracteres
- Unicidade de username e email

#### POST `/api/auth/verify-email`
Verifica o e-mail com código recebido.

**Body:**
```json
{
  "email": "joao@email.com",
  "code": "123456"
}
```

**Resposta (200):**
```json
{
  "message": "Email verified successfully",
  "_id": "64f5a7b8e1234567890abcde",
  "username": "joao123",
  "email": "joao@email.com",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/login`
Autentica o usuário e retorna JWT.

**Body:**
```json
{
  "email": "joao@email.com",
  "password": "minhasenha123"
}
```

**Resposta (200):**
```json
{
  "_id": "64f5a7b8e1234567890abcde",
  "username": "joao123", 
  "email": "joao@email.com",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Comportamentos especiais:**
- E-mail não verificado: retorna 403 e reenvia código
- Credenciais inválidas: retorna 401
- Usuário fica online automaticamente

#### GET `/api/auth/check-username?username=teste`
Verifica disponibilidade de username.

**Resposta (200):**
```json
{
  "available": true,
  "message": "Nome de usuário disponível."
}
```

#### POST `/api/auth/resend-code`
Reenvia código de verificação ou recuperação.

**Body:**
```json
{
  "email": "joao@email.com",
  "type": "email_verification"
}
```

#### POST `/api/auth/forgot-password`
Inicia processo de recuperação de senha.

**Body:**
```json
{
  "email": "joao@email.com"
}
```

#### POST `/api/auth/reset-password`
Redefine senha com código de recuperação.

**Body:**
```json
{
  "email": "joao@email.com",
  "code": "123456",
  "newPassword": "novasenha123"
}
```

#### POST `/api/auth/logout`
Desconecta usuário (requer autenticação).

**Body:**
```json
{
  "userId": "64f5a7b8e1234567890abcde"
}
```

### Rotas de Mensagens (`/api`)

Todas as rotas abaixo requerem autenticação via JWT.

#### GET `/api/messages`
Retorna todas as mensagens do chat.

**Resposta (200):**
```json
[
  {
    "_id": "64f5a7b8e1234567890abcde",
    "username": "joao123",
    "text": "Olá pessoal!",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "type": "text",
    "reactions": {
      "👍": ["maria456", "pedro789"]
    }
  }
]
```

#### POST `/api/messages`
Envia nova mensagem (texto ou voz).

**Body (texto):**
```json
{
  "text": "Olá pessoal!",
  "type": "text",
  "replyTo": "64f5a7b8e1234567890abcde"
}
```

**Body (voz):**
```javascript
// FormData
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('type', 'voice'); 
formData.append('audioDuration', '5');
formData.append('text', 'Mensagem de voz');
```

#### POST `/api/messages/reaction`
Adiciona/remove reação de uma mensagem.

**Body:**
```json
{
  "messageId": "64f5a7b8e1234567890abcde",
  "emoji": "👍"
}
```

#### GET `/api/users/online`
Retorna lista de usuários online.

**Resposta (200):**
```json
[
  {
    "_id": "64f5a7b8e1234567890abcde",
    "username": "joao123",
    "online": true
  }
]
```

##  WebSocket/Socket.IO

### Configuração

```typescript
const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_URL || '*', 
    methods: ['GET', 'POST'] 
  },
  transports: ['websocket', 'polling']
});
```

### Eventos do Cliente para Servidor

#### `joinChat`
Usuário entra no chat e fica online.
```typescript
socket.emit('joinChat', 'joao123');
```

#### `ping`
Mantém conexão ativa (heartbeat).
```typescript
socket.emit('ping');
```

### Eventos do Servidor para Cliente

#### `onlineUsers`
Lista de usuários online é atualizada.
```typescript
socket.on('onlineUsers', (users: string[]) => {
  console.log('Usuários online:', users);
});
```

#### `newMessage`
Nova mensagem foi enviada no chat.
```typescript
socket.on('newMessage', (message: Message) => {
  console.log('Nova mensagem:', message);
});
```

#### `messageUpdated`
Mensagem foi atualizada (reação adicionada/removida).
```typescript
socket.on('messageUpdated', (message: Message) => {
  console.log('Mensagem atualizada:', message);
});
```

#### `userStatus`
Status online/offline de usuário mudou.
```typescript
socket.on('userStatus', ({ username, online }) => {
  console.log(`${username} está ${online ? 'online' : 'offline'}`);
});
```

#### `connected`
Confirmação de conexão estabelecida.
```typescript
socket.on('connected', ({ username, timestamp }) => {
  console.log(`Conectado como ${username}`);
});
```

#### `pong`
Resposta ao ping (heartbeat).
```typescript
socket.on('pong', () => {
  console.log('Pong recebido');
});
```

### Sistema de Presença

- **Timeout**: Usuários inativos por 5 minutos são removidos
- **Cleanup**: Execução a cada minuto para remover usuários inativos
- **Heartbeat**: Sistema de ping/pong para detectar desconexões

##  Sistema de E-mail

### Configuração SMTP

Utiliza Nodemailer com configuração flexível para diferentes provedores:

```typescript
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

### Templates de E-mail

#### E-mail de Verificação

- **Design**: Gradient roxo/azul
- **Código**: Destacado em dourado com espaçamento
- **Personalização**: Nome do usuário
- **Expiração**: Aviso de 10 minutos

#### E-mail de Recuperação de Senha

- **Design**: Gradient rosa/vermelho
- **Código**: Mesmo padrão visual
- **Segurança**: Aviso sobre solicitação não autorizada

### Recursos

- HTML responsivo com fallback para texto
- CSS inline para compatibilidade máxima
- Códigos destacados visualmente
- Branding consistente
- Avisos de segurança

##  Upload de Arquivos

### Configuração

```typescript
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  abortOnLimit: true,
}));
```

### Fluxo de Upload de Áudio

1. Cliente envia áudio via FormData
2. Servidor salva em `/uploads/`
3. Retorna URL pública do arquivo
4. URL é salva na mensagem
5. Cliente pode reproduzir via URL

### Segurança

- Limite de 10MB por arquivo
- Apenas mensagens de voz autenticadas
- Headers corretos para reprodução
- Validação de duração do áudio

### Servindo Arquivos

```typescript
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.m4a') || filepath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
  }
}));
```

##  Middleware

### Middleware de Autenticação

```typescript
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      req.user = await User.findById((decoded as any).id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};
```

**Funcionalidades:**
- Extrai JWT do header Authorization
- Verifica validade do token
- Busca usuário no banco de dados
- Adiciona usuário ao objeto request
- Retorna erros específicos para diferentes falhas

## Tratamento de Erros {#tratamento-de-erros}

### Estratégias Implementadas

1. **Validação de Entrada**: Verificações rigorosas nos controllers
2. **Try-Catch**: Blocos de proteção em operações assíncronas
3. **Códigos HTTP**: Status codes apropriados para cada situação
4. **Logs**: Console.error para debugging
5. **Mensagens Claras**: Respostas descritivas para o frontend

### Códigos de Status Utilizados

- **200**: Sucesso geral
- **201**: Criação bem-sucedida
- **400**: Dados inválidos ou requisição malformada
- **401**: Não autenticado (token inválido/ausente)
- **403**: E-mail não verificado
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

### Exemplos de Tratamento

```typescript
// Erro de duplicação no MongoDB
if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
  return res.status(400).json({ message: 'Username already taken' });
}

// Erro genérico
res.status(500).json({ message: 'Internal server error' });
```

##  Deploy

### Preparação para Produção

1. **Build do TypeScript**:
   ```bash
   npm run build
   ```

2. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   CLIENT_URL=https://seudominio.com
   ```

3. **Estrutura de Deploy**:
   ```
   dist/           # Código compilado
   uploads/        # Arquivos de áudio
   node_modules/   # Dependências
   package.json    # Scripts e dependências
   ```

### Considerações de Produção

- **HTTPS**: Obrigatório para WebRTC e recursos modernos
- **Proxy Reverso**: Nginx ou similar para servir arquivos estáticos
- **PM2**: Para gerenciamento de processos Node.js
- **Logs**: Implementar logging estruturado
- **Backup**: MongoDB com backups regulares
- **Monitoramento**: Métricas de performance e uptime

### Variáveis de Ambiente Críticas

```env
# Segurança
JWT_SECRET=chave_super_forte_e_unica

# Produção
NODE_ENV=production

# E-mail (Gmail com App Password)
SMTP_USER=seuemail@gmail.com
SMTP_PASS=senha_especifica_de_app

# Banco
MONGODB_URI=connection_string_com_credenciais
```

### Health Check

Endpoint disponível em `GET /` retorna:
```json
{
  "message": "Chat Server Online",
  "status": "OK", 
  "timestamp": "2024-01-15T10:30:00.000Z",
  "onlineUsers": 15
}
```

### Debug Endpoint

Endpoint em `GET /debug/users` para monitoramento:
```json
{
  "onlineUsers": [
    {
      "socketId": "abc123",
      "username": "joao123",
      "connectedAt": "2024-01-15T10:00:00.000Z",
      "lastPing": "2024-01-15T10:29:00.000Z"
    }
  ]
}
```

##  Resumo Final

Este backend fornece uma base sólida para um sistema de chat moderno com:

- **Segurança robusta** via JWT e bcrypt
- **Tempo real** com Socket.IO otimizado
- **Recursos avançados** como mensagens de voz e reações
- **Experiência completa** com e-mails estilizados
- **Arquitetura escalável** com TypeScript e modularização
- **Deploy-ready** com configurações de produção

