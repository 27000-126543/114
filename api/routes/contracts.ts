import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { contractService } from '../services/ContractService.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { ContractStatus } from '../../shared/types.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      supplierId,
    } = req.query;

    const user = (req as any).user;

    const result = await contractService.getContracts({
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as ContractStatus,
      supplierId: supplierId as string,
      userRole: user.role,
      userId: user.userId,
      supplierUserSupplierId: user.supplierId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      error: '获取合同列表失败',
    });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const contract = await contractService.getContractById(id);

    if (!contract) {
      res.status(404).json({
        success: false,
        error: '合同不存在',
      });
      return;
    }

    if (user.role === 'SUPPLIER' && contract.supplierId !== user.supplierId) {
      res.status(403).json({
        success: false,
        error: '无权查看此合同',
      });
      return;
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({
      success: false,
      error: '获取合同详情失败',
    });
  }
});

router.post('/generate/:procurementId', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { procurementId } = req.params;
    const { supplierId } = req.body;
    const user = (req as any).user;

    if (!supplierId) {
      res.status(400).json({
        success: false,
        error: '请指定供应商',
      });
      return;
    }

    const contract = await contractService.generateContract(procurementId, supplierId);

    await auditLogService.log({
      userId: user.userId,
      action: 'CONTRACT_GENERATED',
      resource: 'Contract',
      resourceId: contract.id,
      details: `生成采购合同: ${contract.id}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: contract,
      message: '合同生成成功',
    });
  } catch (error) {
    console.error('Generate contract error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '生成合同失败',
    });
  }
});

router.post('/:id/signature/start', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const contract = await contractService.initiateSignature(id);

    await auditLogService.log({
      userId: user.userId,
      action: 'CONTRACT_SIGNATURE_STARTED',
      resource: 'Contract',
      resourceId: id,
      details: '发起合同签署流程',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: contract,
      message: '合同签署流程已发起',
    });
  } catch (error) {
    console.error('Start signature error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '发起签署流程失败',
    });
  }
});

router.post('/:id/signature/buyer', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const contract = await contractService.signByBuyer(id, user.userId);

    await auditLogService.log({
      userId: user.userId,
      action: 'CONTRACT_SIGNED_BUYER',
      resource: 'Contract',
      resourceId: id,
      details: '买方签署合同',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: contract,
      message: '买方签署成功',
    });
  } catch (error) {
    console.error('Sign by buyer error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '买方签署失败',
    });
  }
});

router.post('/:id/signature/supplier', authenticate, requireRoles('SUPPLIER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const contract = await contractService.signBySupplier(id, user.supplierId);

    await auditLogService.log({
      userId: user.userId,
      action: 'CONTRACT_SIGNED_SUPPLIER',
      resource: 'Contract',
      resourceId: id,
      details: '供应商签署合同',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: contract,
      message: '供应商签署成功',
    });
  } catch (error) {
    console.error('Sign by supplier error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '供应商签署失败',
    });
  }
});

export default router;
