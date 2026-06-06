import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { approvalService } from '../services/ApprovalService.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { ApprovalDecision } from '../../shared/types.js';

const router = Router();

router.get('/pending', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const approvals = await approvalService.getPendingApprovals(user.userId, user.role);

    res.json({
      success: true,
      data: approvals,
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: '获取待审批列表失败',
    });
  }
});

router.get('/completed', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await approvalService.getCompletedApprovals(user.userId, {
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get completed approvals error:', error);
    res.status(500).json({
      success: false,
      error: '获取已审批列表失败',
    });
  }
});

router.get('/procurement/:procurementId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { procurementId } = req.params;

    const approvals = await approvalService.getProcurementApprovals(procurementId);

    res.json({
      success: true,
      data: approvals,
    });
  } catch (error) {
    console.error('Get procurement approvals error:', error);
    res.status(500).json({
      success: false,
      error: '获取审批记录失败',
    });
  }
});

router.post('/:id/decide', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;
    const user = (req as any).user;

    if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
      res.status(400).json({
        success: false,
        error: '请提供有效的审批决策',
      });
      return;
    }

    const approval = await approvalService.decideApproval(
      id,
      user.userId,
      user.role,
      decision as ApprovalDecision,
      comment
    );

    await auditLogService.log({
      userId: user.userId,
      action: 'APPROVAL_DECISION',
      resource: 'ApprovalRecord',
      resourceId: id,
      details: `审批${decision === 'APPROVED' ? '通过' : '拒绝'}: ${comment || ''}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: approval,
      message: `审批${decision === 'APPROVED' ? '通过' : '拒绝'}成功`,
    });
  } catch (error) {
    console.error('Decide approval error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '审批决策失败',
    });
  }
});

export default router;
