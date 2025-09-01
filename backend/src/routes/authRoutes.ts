
import express from 'express';
import { 
  register, 
  login, 
  logout, 
  verifyEmail, 
  resendVerificationCode, 
  forgotPassword, 
  resetPassword ,
  checkUsername
} from '../controllers/authController';

const router = express.Router();


router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);


router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/check-username', checkUsername);
export default router;