import prisma from '../lib/prisma';
import { supplierService } from './SupplierService';
import { auditLogService } from './AuditLogService';
import { notificationService } from './NotificationService';
import type { 
  ProcurementRequest, 
  ProcurementStatus, 
  SupplierLevel,
  CreateProcurementRequest,
  BiddingRound,
  Bid,
  EvaluationResult,
  UserRole,
} from '../../shared/types';
import { BIDDING_RULES } from '../../shared/types';

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

function toProcurementRequest(procurement: any): ProcurementRequest {
  return {
    id: procurement.id,
    title: procurement.title,
    description: procurement.description,
    category: procurement.category,
    quantity: procurement.quantity,
    unit: procurement.unit,
    budget: procurement.budget.toNumber(),
    startPrice: procurement.startPrice.toNumber(),
    requiredQualifications: parseJsonArray(procurement.requiredQualifications),
    minSupplierLevel: procurement.minSupplierLevel as SupplierLevel,
    deadline: procurement.deadline.toISOString(),
    maxRounds: procurement.maxRounds,
    minPriceDrop: procurement.minPriceDrop,
    status: procurement.status as ProcurementStatus,
    totalSavings: procurement.totalSavings?.toNumber(),
    createdBy: procurement.createdBy,
    createdAt: procurement.createdAt.toISOString(),
    publishedAt: procurement.publishedAt?.toISOString(),
    biddingEndedAt: procurement.biddingEndedAt?.toISOString(),
    awardedAt: procurement.awardedAt?.toISOString(),
    currentRoundNumber: procurement.currentRoundNumber,
    consecutiveNoBidRounds: procurement.consecutiveNoBidRounds,
    invitedSuppliers: [],
  };
}

function toBiddingRound(round: any): BiddingRound {
  return {
    id: round.id,
    procurementId: round.procurementId,
    roundNumber: round.roundNumber,
    startTime: round.startTime.toISOString(),
    endTime: round.endTime.toISOString(),
    status: round.status,
    lowestPrice: round.lowestPrice?.toNumber(),
    bidCount: round.bidCount,
  };
}

function toBid(bid: any): Bid {
  return {
    id: bid.id,
    procurementId: bid.procurementId,
    roundId: bid.roundId,
    supplierId: bid.supplierId,
    price: bid.price.toNumber(),
    timestamp: bid.timestamp.toISOString(),
    status: bid.status,
    rank: bid.rank ?? undefined,
    anonymousName: bid.anonymousName,
    priceDropPercent: bid.priceDropPercent ?? undefined,
  };
}

function toEvaluationResult(result: any): EvaluationResult {
  return {
    id: result.id,
    procurementId: result.procurementId,
    supplierId: result.supplierId,
    supplier: result.supplier,
    finalPrice: result.finalPrice.toNumber(),
    priceScore: result.priceScore,
    historyScore: result.historyScore,
    totalScore: result.totalScore,
    rank: result.rank,
    isRecommended: result.isRecommended,
    evaluatedAt: result.evaluatedAt.toISOString(),
  };
}

class ProcurementService {
  async getProcurements(params: {
    page?: number;
    pageSize?: number;
    status?: ProcurementStatus;
    category?: string;
    createdBy?: string;
    keyword?: string;
  }) {
    const { page = 1, pageSize = 20, status, category, createdBy, keyword } = params;

    const where: any = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (createdBy) where.createdBy = createdBy;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [total, procurements] = await Promise.all([
      prisma.procurementRequest.count({ where }),
      prisma.procurementRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              username: true,
              email: true,
            },
          },
          _count: {
            select: {
              bids: true,
              biddingRounds: true,
            },
          },
        },
      }),
    ]);

    return {
      data: procurements.map(p => ({
        ...toProcurementRequest(p),
        creator: p.creator,
        bidCount: p._count.bids,
        roundCount: p._count.biddingRounds,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProcurementById(id: string): Promise<ProcurementRequest | null> {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            username: true,
            email: true,
          },
        },
        invitedSuppliers: true,
        biddingRounds: {
          orderBy: { roundNumber: 'asc' },
        },
        bids: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!procurement) return null;

    const result = toProcurementRequest(procurement);
    result.invitedSuppliers = procurement.invitedSuppliers.map(s => ({
      id: s.id,
      name: s.name,
      contactName: s.contactName,
      contactPhone: s.contactPhone,
      contactEmail: s.contactEmail,
      address: s.address || undefined,
      qualifications: parseJsonArray(s.qualifications),
      level: s.level as SupplierLevel,
      performanceScore: s.performanceScore,
      status: s.status,
      categories: parseJsonArray(s.categories),
      historicalScores: typeof s.historicalScores === 'string' ? JSON.parse(s.historicalScores) : s.historicalScores,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return result;
  }

  async createProcurement(
    data: CreateProcurementRequest,
    createdBy: string
  ): Promise<ProcurementRequest> {
    const procurement = await prisma.procurementRequest.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        budget: data.budget,
        startPrice: data.startPrice,
        requiredQualifications: data.requiredQualifications,
        minSupplierLevel: data.minSupplierLevel,
        deadline: new Date(data.deadline),
        maxRounds: data.maxRounds || BIDDING_RULES.MAX_ROUNDS,
        minPriceDrop: data.minPriceDrop || BIDDING_RULES.MIN_PRICE_DROP,
        status: 'DRAFT',
        createdBy,
      },
    });

    return toProcurementRequest(procurement);
  }

  async publishProcurement(procurementId: string): Promise<ProcurementRequest> {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: procurementId },
    });

    if (!procurement) {
      throw new Error('采购需求不存在');
    }

    if (procurement.status !== 'DRAFT') {
      throw new Error('只能发布草稿状态的需求');
    }

    const eligibleSuppliers = await supplierService.filterEligibleSuppliers({
      category: procurement.category,
      requiredQualifications: parseJsonArray(procurement.requiredQualifications),
      minLevel: procurement.minSupplierLevel as SupplierLevel,
    });

    if (eligibleSuppliers.length === 0) {
      throw new Error('未找到符合条件的供应商');
    }

    const now = new Date();
    const firstRoundEnd = new Date(now.getTime() + BIDDING_RULES.ROUND_DURATION_MINUTES * 60 * 1000);

    const updatedProcurement = await prisma.procurementRequest.update({
      where: { id: procurementId },
      data: {
        status: 'BIDDING',
        publishedAt: now,
        currentRoundNumber: 1,
        invitedSuppliers: {
          connect: eligibleSuppliers.map(s => ({ id: s.id })),
        },
        biddingRounds: {
          create: {
            roundNumber: 1,
            startTime: now,
            endTime: firstRoundEnd,
            status: 'ACTIVE',
            lowestPrice: procurement.startPrice,
          },
        },
      },
      include: {
        invitedSuppliers: true,
        biddingRounds: true,
      },
    });

    await notificationService.sendBiddingAlert(
      procurement.title,
      '竞价开始',
      `已邀请 ${eligibleSuppliers.length} 家供应商参与竞价，起拍价: ${procurement.startPrice}元`
    );

    return toProcurementRequest(updatedProcurement);
  }

  async getBiddingRounds(procurementId: string): Promise<BiddingRound[]> {
    const rounds = await prisma.biddingRound.findMany({
      where: { procurementId },
      orderBy: { roundNumber: 'asc' },
    });

    return rounds.map(toBiddingRound);
  }

  async getBids(procurementId: string, roundId?: string): Promise<Bid[]> {
    const where: any = { procurementId };
    if (roundId) where.roundId = roundId;

    const bids = await prisma.bid.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return bids.map(toBid);
  }

  async getSupplierBids(procurementId: string, supplierId: string): Promise<Bid[]> {
    const bids = await prisma.bid.findMany({
      where: {
        procurementId,
        supplierId,
      },
      orderBy: { timestamp: 'desc' },
    });

    return bids.map(toBid);
  }

  async getEvaluationResults(procurementId: string): Promise<EvaluationResult[]> {
    const results = await prisma.evaluationResult.findMany({
      where: { procurementId },
      orderBy: { rank: 'asc' },
      include: {
        supplier: true,
      },
    });

    return results.map(r => {
      const supplier = r.supplier;
      return {
        ...toEvaluationResult(r),
        supplier: {
          id: supplier.id,
          name: supplier.name,
          contactName: supplier.contactName,
          contactPhone: supplier.contactPhone,
          contactEmail: supplier.contactEmail,
          address: supplier.address || undefined,
          qualifications: parseJsonArray(supplier.qualifications),
          level: supplier.level as SupplierLevel,
          performanceScore: supplier.performanceScore,
          status: supplier.status,
          categories: parseJsonArray(supplier.categories),
          historicalScores: typeof supplier.historicalScores === 'string' ? JSON.parse(supplier.historicalScores) : supplier.historicalScores,
          createdAt: supplier.createdAt.toISOString(),
          updatedAt: supplier.updatedAt.toISOString(),
        },
      };
    });
  }

  async updateProcurementStatus(
    procurementId: string,
    status: ProcurementStatus
  ): Promise<ProcurementRequest> {
    const procurement = await prisma.procurementRequest.update({
      where: { id: procurementId },
      data: { status },
    });

    return toProcurementRequest(procurement);
  }

  async getProcurementsForSupplier(supplierId: string, params: {
    page?: number;
    pageSize?: number;
    status?: ProcurementStatus;
  }) {
    const { page = 1, pageSize = 20, status } = params;

    const where: any = {
      invitedSuppliers: {
        some: {
          id: supplierId,
        },
      },
    };

    if (status) where.status = status;

    const [total, procurements] = await Promise.all([
      prisma.procurementRequest.count({ where }),
      prisma.procurementRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: procurements.map(toProcurementRequest),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

export const procurementService = new ProcurementService();
