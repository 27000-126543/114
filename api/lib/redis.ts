import Redis from 'ioredis';

class RedisClient {
  private client: Redis | null = null;
  private fallbackMap: Map<string, string> = new Map();
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 2000,
        retryDelayOnFailover: 100,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('Redis connected successfully');
      });

      this.client.on('error', (err) => {
        console.warn('Redis connection error, using fallback memory cache:', err.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        this.isConnected = false;
        console.log('Redis connection ended');
      });
    } catch (err) {
      console.warn('Redis initialization failed, using fallback memory cache');
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        return this.fallbackMap.get(key) || null;
      }
    }
    return this.fallbackMap.get(key) || null;
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (expirySeconds) {
          await this.client.set(key, value, 'EX', expirySeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }
    this.fallbackMap.set(key, value);
    if (expirySeconds) {
      setTimeout(() => this.fallbackMap.delete(key), expirySeconds * 1000);
    }
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fallback
      }
    }
    this.fallbackMap.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.exists(key);
        return result === 1;
      } catch {
        return this.fallbackMap.has(key);
      }
    }
    return this.fallbackMap.has(key);
  }

  async setnx(key: string, value: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.set(key, value, 'NX');
        return result !== null;
      } catch {
        if (this.fallbackMap.has(key)) return false;
        this.fallbackMap.set(key, value);
        return true;
      }
    }
    if (this.fallbackMap.has(key)) return false;
    this.fallbackMap.set(key, value);
    return true;
  }

  getInstance(): Redis | null {
    return this.client;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

const redis = new RedisClient();
export default redis;
