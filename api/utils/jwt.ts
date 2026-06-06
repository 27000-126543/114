import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import type { UserRole } from '../../shared/types';

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  supplierId?: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
