import prisma from '../lib/prisma.js';
import { notificationService } from './NotificationService.js';
import { auditLogService } from './AuditLogService.js';
import type { ApprovalDecision, UserRole } from '../../shared/types.js';
import { APPROVAL_THRESHOLDS } from '../../shared/types.js';

class ApprovalService {
  async getPendingApprovals(approverRole: UserRole, params: {
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 20 } = params;

    const where = {
      decision: null,
      requiredRole: approverRole,
    };

    const [total, approvals] = await Promise.all([
      prisma.approvalRecord.count({ where }),
      prisma.approvalRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          procurement: {
            include: {
              creator: {
                select: { username: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: approvals.map(a => ({
        id: a.id,
        procurementId: a.procurementId,
        procurementTitle: a.procurement.title,
        budget: a.procurement.budget.toNumber(),
        budgetOverrun: a.budgetOverrun,
        requiredRole: a.requiredRole,
        createdAt: a.createdAt.toISOString(),
        creator: a.procurement.creator.username,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getApprovalHistory(approverId: string, params: {
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 20 } = params;

    const where = {
      approverId,
      decision: { not: null },
    };

    const [total, approvals] = await Promise.all([
      prisma.approvalRecord.count({ where }),
      prisma.approvalRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { decidedAt: 'desc' },
        include: {
          procurement: true,
        },
      }),
    ]);

    return {
      data: approvals.map(a => ({
        id: a.id,
        procurementId: a.procurementId,
        procurementTitle: a.procurement.title,
        decision: a.decision,
        comment: a.comment,
        decidedAt: a.decidedAt?.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async decideApproval(params: {
    approvalId: string;
    approverId: string;
    decision: ApprovalDecision;
    comment?: string;
  }) {
    const approval = await prisma.approvalRecord.findUnique({
      where: { id: params.approvalId },
      include: { procurement: true },
    });

    if (!approval) {
      throw new Error('审批记录不存在');
    }

    if (approval.decision) {
      throw new Error('该审批已处理');
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.update({
        where: { id: params.approvalId },
        data: {
          approverId: params.approverId,
          decision: params.decision,
          comment: params.comment,
          decidedAt: new Date(),
        },
      });

      if (params.decision === 'APPROVED') {
        await tx.procurementRequest.update({
          where: { id: approval.procurementId },
          data: { status: 'APPROVED' },
        });
      } else {
        await tx.procurementRequest.update({
          where: { id: approval.procurementId },
          data: { status: 'REJECTED' },
        });
      }
    });

    const statusText = params.decision === 'APPROVED' ? '通过' : '拒绝';

    await notificationService.sendBiddingAlert(
      approval.procurement.title,
      `审批${statusText}`,
      `项目${statusText}：${approval.procurement.title}，${params.comment ? `备注：${params.comment}` : ''}`
    );

    await auditLogService.log({
      userId: params.approverId,
      action: `APPROVAL_${params.decision}`,
      resource: 'Approval',
      resourceId: params.approvalId,
      details: `审批${statusText}采购需求：${approval.procurement.title}`,
    });

    return true;
  }

  async checkApprovalRequired(procurementId: string): Promise<{
    required: boolean;
    requiredRole?: UserRole;
    budgetOverrun: number;
  }> {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: procurementId },
      include: { evaluationResults: { where: { isRecommended: true } } },
    });

    if (!procurement) {
      throw new Error('采购需求不存在');
    }

    const recommended = procurement.evaluationResults[0];
    if (!recommended) {
      return { required: false, budgetOverrun: 0 };
    }

    const finalPrice = recommended.finalPrice.toNumber();
    const budget = procurement.budget.toNumber();

    if (finalPrice <= budget) {
      return { required: false, budgetOverrun: 0 };
    }

    const overrun = (finalPrice - budget) / budget;
    let requiredRole: UserRole = 'PROCUREMENT_MANAGER';

    if (finalPrice > APPROVAL_THRESHOLDS.DIRECTOR_APPROVAL_AMOUNT) {
      requiredRole = 'PROCUREMENT_DIRECTOR';
    } else if (overrun > APPROVAL_THRESHOLDS.DIRECTOR_OVERRUN_THRESHOLD) {
      requiredRole = 'PROCUREMENT_DIRECTOR';
    } else if (overrun > APPROVAL_THRESHOLDS.MANAGER_OVERRUN_THRESHOLD) {
      requiredRole = 'PROCUREMENT_MANAGER';
    }

    return {
      required: true,
      requiredRole,
      budgetOverrun: overrun,
    };
  }
}

export const approvalService = new ApprovalService();
