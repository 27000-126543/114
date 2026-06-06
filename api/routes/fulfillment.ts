import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { fulfillmentService } from '../services/FulfillmentService.js';
import { auditLogService } from '../services/AuditLogService.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
      contractId,
      supplierId,
    } = req.query;

    const user = (req as any).user;

    const result = await fulfillmentService.getFulfillmentRecords({
      page: Number(page),
      pageSize: Number(pageSize),
      contractId: contractId as string,
      supplierId: supplierId as string,
      userRole: user.role,
      supplierUserSupplierId: user.supplierId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get fulfillment records error:', error);
    res.status(500).json({
      success: false,
      error: '获取履约记录失败',
    });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await fulfillmentService.getFulfillmentById(id);

    if (!record) {
      res.status(404).json({
        success: false,
        error: '履约记录不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Get fulfillment error:', error);
    res.status(500).json({
      success: false,
      error: '获取履约详情失败',
    });
  }
});

router.post('/receive', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      contractId,
      receiptNo,
      deliveredQuantity,
      acceptedQuantity,
      qualityScore,
      deliveryDate,
      inspectionReport,
    } = req.body;

    const user = (req as any).user;

    if (!contractId || !receiptNo || !deliveredQuantity || !acceptedQuantity || !qualityScore || !deliveryDate) {
      res.status(400).json({
        success: false,
        error: '请填写完整的收货信息',
      });
      return;
    }

    const record = await fulfillmentService.receiveGoods({
      contractId,
      receiptNo,
      deliveredQuantity: Number(deliveredQuantity),
      acceptedQuantity: Number(acceptedQuantity),
      qualityScore: Number(qualityScore),
      deliveryDate: new Date(deliveryDate),
      inspectionReport,
    });

    await auditLogService.log({
      userId: user.userId,
      action: 'GOODS_RECEIVED',
      resource: 'FulfillmentRecord',
      resourceId: record.id,
      details: `登记收货: 合同 ${contractId}, 入库单 ${receiptNo}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: record,
      message: '收货登记成功',
    });
  } catch (error) {
    console.error('Receive goods error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '收货登记失败',
    });
  }
});

export default router;
