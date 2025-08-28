
import dotenv from 'dotenv';
dotenv.config(); 

import server from './app';
import connectDB from './config/db';

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📧 SMTP_HOST: ${process.env.SMTP_HOST}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  });