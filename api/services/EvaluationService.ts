import prisma from '../lib/prisma';
import { notificationService } from './NotificationService';
import { auditLogService } from './AuditLogService';
import type { EvaluationResult, UserRole } from '../../shared/types';
import { SCORING_WEIGHTS, APPROVAL_THRESHOLDS } from '../../shared/types';

function parseJsonArray(value: any): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function parseHistoricalScores(value: any): { price: number; quality: number; delivery: number; service: number } {
  if (!value) return { price: 0, quality: 0, delivery: 0, service: 0 };
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { price: 0, quality: 0, delivery: 0, service: 0 };
    }
  }
  return value;
}

class EvaluationService {
  async calculateScores(procurementId: string): Promise<EvaluationResult[]> {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: procurementId },
      include: {
        invitedSuppliers: true,
        invitedSuppliers: true,
      },
    });

    if (!procurement) {
      throw new Error('采购需求不存在');
    }

    const validBids = await prisma.bid.findMany({
      where: {
        procurementId,
        status: 'VALID',
      },
      include: {
        supplier: true,
      },
      orderBy: {
        price: 'asc',
      },
    });

    if (validBids.length === 0) {
      throw new Error('没有有效报价');
    }

    const supplierBids = new Map<string, typeof validBids[0]>();
    validBids.forEach(bid => {
      const existing = supplierBids.get(bid.supplierId);
      if (!existing || bid.timestamp > existing.timestamp) {
        supplierBids.set(bid.supplierId, bid);
      }
    });

    const allBids = Array.from(supplierBids.values());
    const minPrice = Math.min(...allBids.map(b => b.price.toNumber()));
    const maxPrice = Math.max(...allBids.map(b => b.price.toNumber()));

    const results = [];

    for (const bid of allBids) {
      const supplier = bid.supplier;
      const finalPrice = bid.price.toNumber();

      const priceScore = maxPrice === minPrice 
        ? 100 
        : ((maxPrice - finalPrice) / (maxPrice - minPrice)) * 100;

      const history = parseHistoricalScores(supplier.historicalScores);
      const historyScore = 
        history.price * 0.3 +
        history.quality * 0.3 +
        history.delivery * 0.2 +
        history.service * 0.2;

      const totalScore = priceScore * SCORING_WEIGHTS.PRICE + historyScore * SCORING_WEIGHTS.HISTORY;

      results.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        finalPrice,
        priceScore,
        historyScore,
        totalScore,
      });
    }

    results.sort((a, b) => b.totalScore - a.totalScore);

    await prisma.$transaction(async (tx) => {
      await tx.evaluationResult.deleteMany({
        where: { procurementId },
      });

      const createdResults = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const created = await tx.evaluationResult.create({
          data: {
            procurementId,
            supplierId: result.supplierId,
            finalPrice: result.finalPrice,
            priceScore: result.priceScore,
            historyScore: result.historyScore,
            totalScore: result.totalScore,
            rank: i + 1,
            isRecommended: i === 0,
          },
          include: {
            supplier: true,
          },
        });
        createdResults.push(created);
      }

      await tx.procurementRequest.update({
        where: { id: procurementId },
        data: { status: 'PENDING_APPROVAL' },
      });

      return createdResults;
    });

    const finalResults = await prisma.evaluationResult.findMany({
      where: { procurementId },
      orderBy: { rank: 'asc' },
      include: { supplier: true },
    });

    const recommended = finalResults[0];
    const totalSavings = procurement.budget.toNumber() - recommended.finalPrice.toNumber();

    await prisma.procurementRequest.update({
      where: { id: procurementId },
      data: {
        totalSavings,
      },
    });

    const budgetOverrun = 0;
    let requiredRole: UserRole = 'PROCUREMENT_MANAGER';
    let needsApproval = false;

    if (recommended.finalPrice.toNumber() > procurement.budget.toNumber()) {
      needsApproval = true;
      const overrun = (recommended.finalPrice.toNumber() - procurement.budget.toNumber()) / procurement.budget.toNumber();

      if (recommended.finalPrice.toNumber() > APPROVAL_THRESHOLDS.DIRECTOR_APPROVAL_AMOUNT) {
        requiredRole = 'PROCUREMENT_DIRECTOR';
      } else if (overrun > APPROVAL_THRESHOLDS.DIRECTOR_OVERRUN_THRESHOLD) {
        requiredRole = 'PROCUREMENT_DIRECTOR';
      } else if (overrun > APPROVAL_THRESHOLDS.MANAGER_OVERRUN_THRESHOLD) {
        requiredRole = 'PROCUREMENT_MANAGER';
      }

      await prisma.approvalRecord.create({
        data: {
          procurementId,
          approverId: '',
          approverRole: requiredRole,
          requiredRole,
          budgetOverrun,
        },
      });

      await notificationService.sendApprovalNotification(
        procurement.title,
        requiredRole,
        budgetOverrun
      );
    } else {
      await this.autoApprove(procurementId, 'SYSTEM');
    }

    await notificationService.sendBiddingAlert(
      procurement.title,
      '评标完成',
      `推荐中标: ${recommended.supplier.name}，价格: ${recommended.finalPrice.toNumber()}元，节约: ${totalSavings.toFixed(2)}元${needsApproval ? '，等待审批' : ''}`
    );

    await auditLogService.log({
      action: 'EVALUATION_COMPLETED',
      resource: 'Evaluation',
      resourceId: procurementId,
      details: `评标完成，推荐供应商：${recommended.supplier.name}，得分：${recommended.totalScore.toFixed(2)}`,
    });

    return finalResults.map(r => ({
      id: r.id,
      procurementId: r.procurementId,
      supplierId: r.supplierId,
      supplier: {
        id: r.supplier.id,
        name: r.supplier.name,
        contactName: r.supplier.contactName,
        contactPhone: r.supplier.contactPhone,
        contactEmail: r.supplier.contactEmail,
        address: r.supplier.address || undefined,
        qualifications: parseJsonArray(r.supplier.qualifications),
        level: r.supplier.level,
        performanceScore: r.supplier.performanceScore,
        status: r.supplier.status,
        categories: parseJsonArray(r.supplier.categories),
        historicalScores: parseHistoricalScores(r.supplier.historicalScores),
        createdAt: r.supplier.createdAt.toISOString(),
        updatedAt: r.supplier.updatedAt.toISOString(),
      },
      finalPrice: r.finalPrice.toNumber(),
      priceScore: r.priceScore,
      historyScore: r.historyScore,
      totalScore: r.totalScore,
      rank: r.rank,
      isRecommended: r.isRecommended,
      evaluatedAt: r.evaluatedAt.toISOString(),
    }));
  }

  async getResults(procurementId: string): Promise<any> {
    const results = await prisma.evaluationResult.findMany({
      where: { procurementId },
      orderBy: { rank: 'asc' },
      include: { supplier: true },
    });

    return results.map(r => ({
      id: r.id,
      procurementId: r.procurementId,
      supplierId: r.supplierId,
      supplier: {
        id: r.supplier.id,
        name: r.supplier.name,
        contactName: r.supplier.contactName,
        contactPhone: r.supplier.contactPhone,
        contactEmail: r.supplier.contactEmail,
        address: r.supplier.address || undefined,
        qualifications: parseJsonArray(r.supplier.qualifications),
        level: r.supplier.level,
        performanceScore: r.supplier.performanceScore,
        status: r.supplier.status,
        categories: parseJsonArray(r.supplier.categories),
        historicalScores: parseHistoricalScores(r.supplier.historicalScores),
        createdAt: r.supplier.createdAt.toISOString(),
        updatedAt: r.supplier.updatedAt.toISOString(),
      },
      finalPrice: r.finalPrice.toNumber(),
      priceScore: r.priceScore,
      historyScore: r.historyScore,
      totalScore: r.totalScore,
      rank: r.rank,
      isRecommended: r.isRecommended,
      evaluatedAt: r.evaluatedAt.toISOString(),
    }));
  }

  async autoApprove(procurementId: string, approverId: string): Promise<void> {
    await prisma.$transaction([
      prisma.approvalRecord.updateMany({
        where: { procurementId },
        data: {
          approverId,
          decision: 'APPROVED',
          comment: '自动审批 - 未超预算',
          decidedAt: new Date(),
        },
      }),
      prisma.procurementRequest.update({
        where: { id: procurementId },
        data: { status: 'APPROVED' },
      }),
    ]);
  }
}

export const evaluationService = new EvaluationService();
