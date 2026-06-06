import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { historyService } from '../services/HistoryService.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { ProcurementStatus } from '../../shared/types.js';

const router = Router();

router.get('/procurements', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
      category,
      status,
      supplierId,
      startDate,
      endDate,
      minBudget,
      maxBudget,
      keyword,
    } = req.query;

    const result = await historyService.queryProcurements({
      page: Number(page),
      pageSize: Number(pageSize),
      category: category as string,
      status: status as ProcurementStatus,
      supplierId: supplierId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      keyword: keyword as string,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Query history error:', error);
    res.status(500).json({
      success: false,
      error: '查询历史记录失败',
    });
  }
});

router.get('/procurements/:id/detail', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const detail = await historyService.getProcurementDetail(id);

    if (!detail) {
      res.status(404).json({
        success: false,
        error: '采购项目不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error('Get procurement detail error:', error);
    res.status(500).json({
      success: false,
      error: '获取项目详情失败',
    });
  }
});

router.post('/procurements/export', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ids,
      category,
      status,
      supplierId,
      startDate,
      endDate,
      minBudget,
      maxBudget,
      keyword,
    } = req.body;

    const user = (req as any).user;

    const excelBuffer = await historyService.exportProcurements({
      ids: ids as string[],
      category,
      status,
      supplierId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      minBudget,
      maxBudget,
      keyword,
    });

    await auditLogService.log({
      userId: user.userId,
      action: 'HISTORY_EXPORTED',
      resource: 'ProcurementRequest',
      resourceId: ids?.join(',') || 'bulk',
      details: `批量导出历史记录: ${ids?.length || '全部'} 条`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="procurement-history-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '导出历史记录失败',
    });
  }
});

router.get('/procurements/:id/timeline', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const timeline = await historyService.getProcurementTimeline(id);

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      error: '获取项目时间线失败',
    });
  }
});

export default router;
