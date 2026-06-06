import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { LoginRequest, LoginResponse, User } from '../../shared/types.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as LoginRequest;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: '用户名和密码不能为空',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: '用户名或密码错误',
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: '用户名或密码错误',
      });
      return;
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      supplierId: user.supplierId || undefined,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await auditLogService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      details: `用户 ${username} 登录成功`,
      ipAddress: req.ip,
    });

    const userResponse: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as any,
      supplierId: user.supplierId || undefined,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };

    const response: LoginResponse = {
      token,
      user: userResponse,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试',
    });
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    await auditLogService.log({
      userId,
      action: 'USER_LOGOUT',
      resource: 'User',
      resourceId: userId,
      details: '用户退出登录',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: '退出登录成功',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '退出登录失败',
    });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      });
      return;
    }

    const userResponse: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as any,
      supplierId: user.supplierId || undefined,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };

    res.json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取用户信息失败',
    });
  }
});

export default router;
