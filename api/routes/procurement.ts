import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { procurementService } from '../services/ProcurementService.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { ProcurementStatus, CreateProcurementRequest } from '../../shared/types.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      category,
      keyword,
    } = req.query;

    const user = (req as any).user;
    const params: any = {
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as ProcurementStatus,
      category: category as string,
      keyword: keyword as string,
    };

    if (user.role === 'PROCUREMENT_STAFF') {
      params.createdBy = user.userId;
    }

    const result = await procurementService.getProcurements(params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get procurements error:', error);
    res.status(500).json({
      success: false,
      error: '获取采购需求列表失败',
    });
  }
});

router.get('/supplier', authenticate, requireRoles('SUPPLIER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
    } = req.query;

    const user = (req as any).user;

    const result = await procurementService.getProcurementsForSupplier(user.supplierId, {
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as ProcurementStatus,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get supplier procurements error:', error);
    res.status(500).json({
      success: false,
      error: '获取采购需求列表失败',
    });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const procurement = await procurementService.getProcurementById(id);

    if (!procurement) {
      res.status(404).json({
        success: false,
        error: '采购需求不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: procurement,
    });
  } catch (error) {
    console.error('Get procurement error:', error);
    res.status(500).json({
      success: false,
      error: '获取采购需求详情失败',
    });
  }
});

router.post('/', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateProcurementRequest;
    const user = (req as any).user;

    const procurement = await procurementService.createProcurement(data, user.userId);

    await auditLogService.log({
      userId: user.userId,
      action: 'PROCUREMENT_CREATED',
      resource: 'ProcurementRequest',
      resourceId: procurement.id,
      details: `创建采购需求: ${data.title}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: procurement,
      message: '采购需求创建成功',
    });
  } catch (error) {
    console.error('Create procurement error:', error);
    res.status(500).json({
      success: false,
      error: '创建采购需求失败',
    });
  }
});

router.post('/:id/publish', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const procurement = await procurementService.publishProcurement(id);

    await auditLogService.log({
      userId: user.userId,
      action: 'PROCUREMENT_PUBLISHED',
      resource: 'ProcurementRequest',
      resourceId: id,
      details: `发布采购需求: ${procurement.title}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: procurement,
      message: '采购需求发布成功，已自动邀请符合条件的供应商',
    });
  } catch (error) {
    console.error('Publish procurement error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '发布采购需求失败',
    });
  }
});

router.get('/:id/rounds', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const rounds = await procurementService.getBiddingRounds(id);

    res.json({
      success: true,
      data: rounds,
    });
  } catch (error) {
    console.error('Get bidding rounds error:', error);
    res.status(500).json({
      success: false,
      error: '获取竞价轮次失败',
    });
  }
});

router.get('/:id/bids', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roundId } = req.query;

    const bids = await procurementService.getBids(id, roundId as string);

    res.json({
      success: true,
      data: bids,
    });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({
      success: false,
      error: '获取报价列表失败',
    });
  }
});

router.get('/:id/bids/mine', authenticate, requireRoles('SUPPLIER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const bids = await procurementService.getSupplierBids(id, user.supplierId);

    res.json({
      success: true,
      data: bids,
    });
  } catch (error) {
    console.error('Get supplier bids error:', error);
    res.status(500).json({
      success: false,
      error: '获取我的报价失败',
    });
  }
});

router.get('/:id/evaluations', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const results = await procurementService.getEvaluationResults(id);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({
      success: false,
      error: '获取评标结果失败',
    });
  }
});

export default router;
