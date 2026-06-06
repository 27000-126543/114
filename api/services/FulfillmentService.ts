import prisma from '../lib/prisma';
import { auditLogService } from './AuditLogService';
import { notificationService } from './NotificationService';
import { supplierService } from './SupplierService';
import type { FulfillmentRecord } from '../../shared/types';

function toFulfillmentRecord(record: any): FulfillmentRecord {
  return {
    id: record.id,
    contractId: record.contractId,
    receiptNo: record.receiptNo,
    deliveredQuantity: record.deliveredQuantity,
    acceptedQuantity: record.acceptedQuantity,
    qualityScore: record.qualityScore,
    deliveryDate: record.deliveryDate.toISOString(),
    performanceDelta: record.performanceDelta,
    inspectionReport: record.inspectionReport || undefined,
    createdAt: record.createdAt.toISOString(),
  };
}

class FulfillmentService {
  async receiveGoods(params: {
    contractId: string;
    receiptNo: string;
    deliveredQuantity: number;
    acceptedQuantity: number;
    qualityScore: number;
    deliveryDate: string;
    inspectionReport?: string;
  }): Promise<FulfillmentRecord> {
    const contract = await prisma.contract.findUnique({
      where: { id: params.contractId },
      include: {
        procurement: true,
        supplier: true,
      },
    });

    if (!contract) {
      throw new Error('合同不存在');
    }

    if (contract.status !== 'SIGNED' && contract.status !== 'EXECUTING') {
      throw new Error('合同状态不允许收货');
    }

    const deliveryDate = new Date(params.deliveryDate);
    const plannedDate = contract.startDate ? new Date(contract.startDate) : new Date();
    const isOnTime = deliveryDate <= plannedDate;

    const qualityScore = Math.max(0, Math.min(100, params.qualityScore));
    const quantityRatio = params.acceptedQuantity / params.deliveredQuantity;
    const deliveryScore = isOnTime ? 100 : Math.max(0, 100 - (deliveryDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24) * 5);

    const performanceDelta = this.calculatePerformanceDelta(
      qualityScore,
      deliveryScore,
      quantityRatio
    );

    const record = await prisma.$transaction(async (tx) => {
      const fulfillment = await tx.fulfillmentRecord.create({
        data: {
          contractId: params.contractId,
          receiptNo: params.receiptNo,
          deliveredQuantity: params.deliveredQuantity,
          acceptedQuantity: params.acceptedQuantity,
          qualityScore,
          deliveryDate,
          performanceDelta,
          inspectionReport: params.inspectionReport,
        },
      });

      const currentFulfillments = await tx.fulfillmentRecord.aggregate({
        where: { contractId: params.contractId },
        _sum: { acceptedQuantity: true },
      });

      const totalDelivered = currentFulfillments._sum.acceptedQuantity || 0;
      const procurement = await tx.procurementRequest.findUnique({
        where: { id: contract.procurementId },
      });

      if (procurement && totalDelivered >= procurement.quantity) {
        await tx.contract.update({
          where: { id: params.contractId },
          data: { status: 'COMPLETED' },
        });

        await tx.procurementRequest.update({
          where: { id: contract.procurementId },
          data: { status: 'COMPLETED' },
        });
      } else {
        await tx.contract.update({
          where: { id: params.contractId },
          data: { status: 'EXECUTING' },
        });

        await tx.procurementRequest.update({
          where: { id: contract.procurementId },
          data: { status: 'FULFILLING' },
        });
      }

      const inventory = await tx.inventory.findFirst({
        where: { category: procurement?.category || '' },
      });

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { increment: params.acceptedQuantity },
            lastUpdatedAt: new Date(),
          },
        });
      }

      return fulfillment;
    });

    await supplierService.updatePerformanceScore(contract.supplierId, performanceDelta);

    const history = await prisma.supplier.findUnique({
      where: { id: contract.supplierId },
      select: { historicalScores: true },
    });

    if (history) {
      const scores = typeof history.historicalScores === 'string' 
        ? JSON.parse(history.historicalScores) 
        : history.historicalScores;

      const newScores = {
        ...scores,
        quality: (scores.quality * 0.9 + qualityScore * 0.1),
        delivery: (scores.delivery * 0.9 + deliveryScore * 0.1),
      };

      await supplierService.updateHistoricalScores(contract.supplierId, newScores);
    }

    await auditLogService.log({
      action: 'FULFILLMENT_RECEIVED',
      resource: 'Fulfillment',
      resourceId: record.id,
      details: `合同 ${params.contractId} 收货完成，实收：${params.acceptedQuantity}，合格率：${(quantityRatio * 100).toFixed(2)}%，质量评分：${qualityScore}，绩效变化：${performanceDelta > 0 ? '+' : ''}${performanceDelta}`,
    });

    if (qualityScore < 60 || quantityRatio < 0.9) {
      await notificationService.sendAlert(
        '交货异常预警',
        `合同 ${params.contractId} 交货异常\n质量评分：${qualityScore}\n合格率：${(quantityRatio * 100).toFixed(2)}%\n供应商：${contract.supplier.name}`,
        'warning'
      );
    }

    return toFulfillmentRecord(record);
  }

  private calculatePerformanceDelta(
    qualityScore: number,
    deliveryScore: number,
    quantityRatio: number
  ): number {
    const baseScore = 
      qualityScore * 0.4 + 
      deliveryScore * 0.3 + 
      quantityRatio * 100 * 0.3;

    if (baseScore >= 90) return 2;
    if (baseScore >= 80) return 1;
    if (baseScore >= 70) return 0;
    if (baseScore >= 60) return -1;
    return -2;
  }

  async getFulfillments(params: {
    page?: number;
    pageSize?: number;
    contractId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, pageSize = 20, contractId, startDate, endDate } = params;

    const where: any = {};
    if (contractId) where.contractId = contractId;
    if (startDate) where.deliveryDate = { ...where.deliveryDate, gte: startDate };
    if (endDate) where.deliveryDate = { ...where.deliveryDate, lte: endDate };

    const [total, fulfillments] = await Promise.all([
      prisma.fulfillmentRecord.count({ where }),
      prisma.fulfillmentRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { deliveryDate: 'desc' },
        include: {
          contract: {
            include: {
              procurement: { select: { title: true } },
              supplier: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: fulfillments.map(f => ({
        ...toFulfillmentRecord(f),
        procurementTitle: f.contract.procurement.title,
        supplierName: f.contract.supplier.name,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getFulfillmentById(id: string): Promise<FulfillmentRecord | null> {
    const record = await prisma.fulfillmentRecord.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            procurement: true,
            supplier: true,
          },
        },
      },
    });

    if (!record) return null;

    return toFulfillmentRecord(record);
  }

  async compareFulfillment(fulfillmentId: string) {
    const fulfillment = await prisma.fulfillmentRecord.findUnique({
      where: { id: fulfillmentId },
      include: {
        contract: {
          include: {
            procurement: true,
          },
        },
      },
    });

    if (!fulfillment) {
      throw new Error('履约记录不存在');
    }

    const quantityVariance = fulfillment.acceptedQuantity - fulfillment.deliveredQuantity;
    const quantityVariancePercent = fulfillment.deliveredQuantity > 0 
      ? (quantityVariance / fulfillment.deliveredQuantity) * 100 
      : 0;

    return {
      id: fulfillment.id,
      contractId: fulfillment.contractId,
      receiptNo: fulfillment.receiptNo,
      expectedQuantity: fulfillment.deliveredQuantity,
      actualQuantity: fulfillment.acceptedQuantity,
      quantityVariance,
      quantityVariancePercent,
      qualityScore: fulfillment.qualityScore,
      qualityStatus: fulfillment.qualityScore >= 80 ? '合格' : fulfillment.qualityScore >= 60 ? '待复检' : '不合格',
      deliveryDate: fulfillment.deliveryDate,
      performanceDelta: fulfillment.performanceDelta,
      procurementTitle: fulfillment.contract.procurement.title,
      contractAmount: fulfillment.contract.amount.toNumber(),
    };
  }
}

export const fulfillmentService = new FulfillmentService();
