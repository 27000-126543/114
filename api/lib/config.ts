import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '24h',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  wechat: {
    webhookUrl: process.env.WECHAT_WEBHOOK_URL || '',
  },
  fileStorage: {
    path: process.env.FILE_STORAGE_PATH || './uploads',
  },
  concurrency: {
    maxConcurrentBids: parseInt(process.env.MAX_CONCURRENT_BIDS || '1000'),
    bidTimeoutMs: parseInt(process.env.BID_TIMEOUT_MS || '5000'),
  },
} as const;
