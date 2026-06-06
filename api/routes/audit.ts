import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { AuditLogLevel } from '../../shared/types.js';

const router = Router();

router.get('/', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 50,
      userId,
      action,
      resource,
      level,
      startDate,
      endDate,
    } = req.query;

    const result = await auditLogService.queryLogs({
      page: Number(page),
      pageSize: Number(pageSize),
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      level: level as AuditLogLevel,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: '获取审计日志失败',
    });
  }
});

router.get('/:id', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const log = await auditLogService.getLogById(id);

    if (!log) {
      res.status(404).json({
        success: false,
        error: '日志记录不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      error: '获取日志详情失败',
    });
  }
});

router.get('/stats/summary', authenticate, requireRoles('PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 7 } = req.query;

    const stats = await auditLogService.getLogStats(Number(days));

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: '获取日志统计失败',
    });
  }
});

export default router;
