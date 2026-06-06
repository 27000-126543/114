import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { biddingEngineService } from '../services/BiddingEngineService.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { SubmitBidRequest } from '../../shared/types.js';

const router = Router();

router.post('/submit', authenticate, requireRoles('SUPPLIER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { procurementId, roundId, price } = req.body as SubmitBidRequest;
    const user = (req as any).user;

    if (!procurementId || !roundId || !price) {
      res.status(400).json({
        success: false,
        error: '请提供完整的报价信息',
      });
      return;
    }

    const bid = await biddingEngineService.submitBid({
      procurementId,
      roundId,
      supplierId: user.supplierId,
      price,
    });

    res.json({
      success: true,
      data: bid,
      message: '报价提交成功',
    });
  } catch (error) {
    console.error('Submit bid error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '报价提交失败',
    });
  }
});

router.get('/:procurementId/realtime', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { procurementId } = req.params;

    const data = await biddingEngineService.getRealTimeData(procurementId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get realtime data error:', error);
    res.status(500).json({
      success: false,
      error: '获取实时竞价数据失败',
    });
  }
});

router.post('/:procurementId/next-round', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { procurementId } = req.params;
    const user = (req as any).user;

    await biddingEngineService.startNextRound(procurementId);

    await auditLogService.log({
      userId: user.userId,
      action: 'BIDDING_NEXT_ROUND',
      resource: 'ProcurementRequest',
      resourceId: procurementId,
      details: '手动触发下一轮竞价',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: '下一轮竞价已开始',
    });
  } catch (error) {
    console.error('Start next round error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '启动下一轮竞价失败',
    });
  }
});

export default router;
