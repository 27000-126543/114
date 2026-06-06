import prisma from '../lib/prisma';
import type { AuditLogLevel, UserRole } from '../../shared/types';
import type { Request } from 'express';

interface CreateAuditLogParams {
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: string;
  level?: AuditLogLevel;
  ipAddress?: string;
  userAgent?: string;
}

class AuditLogService {
  private batch: CreateAuditLogParams[] = [];
  private batchSize = 50;
  private flushInterval = 5000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startBatchFlush();
  }

  private startBatchFlush() {
    this.flushTimer = setInterval(() => {
      this.flushBatch();
    }, this.flushInterval);
  }

  private async flushBatch() {
    if (this.batch.length === 0) return;

    const logs = [...this.batch];
    this.batch = [];

    try {
      await prisma.auditLog.createMany({
        data: logs.map(log => ({
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          level: log.level || 'INFO',
        })),
      });
    } catch (error) {
      console.error('Failed to flush audit log batch:', error);
      this.batch.push(...logs);
    }
  }

  async log(params: CreateAuditLogParams) {
    this.batch.push(params);

    if (this.batch.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  logFromRequest(
    req: Request,
    action: string,
    resource: string,
    resourceId: string,
    details?: string,
    level: AuditLogLevel = 'INFO'
  ) {
    const ipAddress = req.ip || 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
      req.connection.remoteAddress;
    
    const userAgent = req.headers['user-agent'];

    return this.log({
      userId: req.user?.userId,
      action,
      resource,
      resourceId,
      details,
      level,
      ipAddress,
      userAgent,
    });
  }

  async getLogs(params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    action?: string;
    resource?: string;
    level?: AuditLogLevel;
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      page = 1,
      pageSize = 50,
      userId,
      action,
      resource,
      level,
      startDate,
      endDate,
    } = params;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (level) where.level = level;
    if (startDate) where.timestamp = { ...where.timestamp, gte: startDate };
    if (endDate) where.timestamp = { ...where.timestamp, lte: endDate };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushBatch();
  }
}

export const auditLogService = new AuditLogService();
