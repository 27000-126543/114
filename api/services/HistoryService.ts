import prisma from '../lib/prisma';
import { auditLogService } from './AuditLogService';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { config } from '../lib/config';
import type { ProcurementStatus, SupplierLevel } from '../../shared/types';

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

class HistoryService {
  private async ensureExportDir() {
    const dir = path.join(process.cwd(), config.fileStorage.path, 'exports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async searchProcurements(params: {
    page?: number;
    pageSize?: number;
    category?: string;
    status?: ProcurementStatus;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
    keyword?: string;
    minBudget?: number;
    maxBudget?: number;
  }) {
    const {
      page = 1,
      pageSize = 20,
      category,
      status,
      supplierId,
      startDate,
      endDate,
      keyword,
      minBudget,
      maxBudget,
    } = params;

    const where: any = {};

    if (category) where.category = category;
    if (status) where.status = status;
    if (startDate) where.createdAt = { ...where.createdAt, gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };
    if (minBudget) where.budget = { ...where.budget, gte: minBudget };
    if (maxBudget) where.budget = { ...where.budget, lte: maxBudget };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (supplierId) {
      where.invitedSuppliers = {
        some: { id: supplierId },
      };
    }

    const [total, procurements] = await Promise.all([
      prisma.procurementRequest.count({ where }),
      prisma.procurementRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { username: true } },
          invitedSuppliers: { select: { id: true, name: true } },
          evaluationResults: {
            where: { isRecommended: true },
            include: { supplier: true },
            take: 1,
          },
          _count: {
            select: { bids: true, biddingRounds: true },
          },
        },
      }),
    ]);

    return {
      data: procurements.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        budget: p.budget.toNumber(),
        startPrice: p.startPrice.toNumber(),
        status: p.status,
        finalPrice: p.evaluationResults[0]?.finalPrice.toNumber(),
        winner: p.evaluationResults[0]?.supplier.name,
        totalSavings: p.totalSavings?.toNumber(),
        invitedSupplierCount: p.invitedSuppliers.length,
        bidCount: p._count.bids,
        roundCount: p._count.biddingRounds,
        creator: p.creator.username,
        createdAt: p.createdAt.toISOString(),
        publishedAt: p.publishedAt?.toISOString(),
        awardedAt: p.awardedAt?.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async searchSuppliers(params: {
    page?: number;
    pageSize?: number;
    level?: SupplierLevel;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    category?: string;
    keyword?: string;
    minPerformance?: number;
    maxPerformance?: number;
  }) {
    const {
      page = 1,
      pageSize = 20,
      level,
      status,
      category,
      keyword,
      minPerformance,
      maxPerformance,
    } = params;

    const where: any = {};

    if (level) where.level = level;
    if (status) where.status = status;
    if (minPerformance) where.performanceScore = { ...where.performanceScore, gte: minPerformance };
    if (maxPerformance) where.performanceScore = { ...where.performanceScore, lte: maxPerformance };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { contactName: { contains: keyword } },
        { contactEmail: { contains: keyword } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { bids: true, contracts: true },
          },
        },
      }),
    ]);

    return {
      data: suppliers.map(s => ({
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        contactPhone: s.contactPhone,
        contactEmail: s.contactEmail,
        address: s.address,
        qualifications: parseJsonArray(s.qualifications),
        level: s.level,
        performanceScore: s.performanceScore,
        status: s.status,
        categories: parseJsonArray(s.categories),
        historicalScores: typeof s.historicalScores === 'string'
          ? JSON.parse(s.historicalScores)
          : s.historicalScores,
        bidCount: s._count.bids,
        contractCount: s._count.contracts,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async searchBids(params: {
    page?: number;
    pageSize?: number;
    procurementId?: string;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const {
      page = 1,
      pageSize = 20,
      procurementId,
      supplierId,
      startDate,
      endDate,
      minPrice,
      maxPrice,
    } = params;

    const where: any = { status: 'VALID' };

    if (procurementId) where.procurementId = procurementId;
    if (supplierId) where.supplierId = supplierId;
    if (startDate) where.timestamp = { ...where.timestamp, gte: startDate };
    if (endDate) where.timestamp = { ...where.timestamp, lte: endDate };
    if (minPrice) where.price = { ...where.price, gte: minPrice };
    if (maxPrice) where.price = { ...where.price, lte: maxPrice };

    const [total, bids] = await Promise.all([
      prisma.bid.count({ where }),
      prisma.bid.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
        include: {
          procurement: { select: { title: true, category: true } },
          supplier: { select: { name: true } },
          round: { select: { roundNumber: true } },
        },
      }),
    ]);

    return {
      data: bids.map(b => ({
        id: b.id,
        procurementId: b.procurementId,
        procurementTitle: b.procurement.title,
        category: b.procurement.category,
        supplierId: b.supplierId,
        supplierName: b.supplier.name,
        roundNumber: b.round.roundNumber,
        price: b.price.toNumber(),
        rank: b.rank,
        priceDropPercent: b.priceDropPercent,
        anonymousName: b.anonymousName,
        timestamp: b.timestamp.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async exportProcurements(params: Parameters<typeof this.searchProcurements>[0]): Promise<string> {
    const result = await this.searchProcurements({ ...params, pageSize: 10000 });
    const dir = await this.ensureExportDir();
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filePath = path.join(dir, `procurements-${timestamp}.xlsx`);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('竞价记录');

    sheet.columns = [
      { header: '项目ID', key: 'id', width: 20 },
      { header: '项目名称', key: 'title', width: 30 },
      { header: '品类', key: 'category', width: 15 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '预算(元)', key: 'budget', width: 15 },
      { header: '起拍价(元)', key: 'startPrice', width: 15 },
      { header: '成交价(元)', key: 'finalPrice', width: 15 },
      { header: '节约金额(元)', key: 'savings', width: 15 },
      { header: '中标供应商', key: 'winner', width: 20 },
      { header: '状态', key: 'status', width: 12 },
      { header: '创建人', key: 'creator', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '发布时间', key: 'publishedAt', width: 20 },
      { header: '中标时间', key: 'awardedAt', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    for (const p of result.data) {
      sheet.addRow({
        id: p.id,
        title: p.title,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        budget: p.budget,
        startPrice: p.startPrice,
        finalPrice: p.finalPrice || '-',
        savings: p.totalSavings || 0,
        winner: p.winner || '-',
        status: p.status,
        creator: p.creator,
        createdAt: p.createdAt ? format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm') : '-',
        publishedAt: p.publishedAt ? format(new Date(p.publishedAt), 'yyyy-MM-dd HH:mm') : '-',
        awardedAt: p.awardedAt ? format(new Date(p.awardedAt), 'yyyy-MM-dd HH:mm') : '-',
      });
    }

    await workbook.xlsx.writeFile(filePath);

    await auditLogService.log({
      action: 'HISTORY_EXPORTED',
      resource: 'ProcurementHistory',
      resourceId: timestamp,
      details: `导出竞价历史记录 ${result.data.length} 条`,
    });

    return filePath;
  }

  async getProcurementDetail(procurementId: string) {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: procurementId },
      include: {
        creator: { select: { username: true, email: true } },
        invitedSuppliers: true,
        biddingRounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            bids: {
              where: { status: 'VALID' },
              orderBy: { price: 'asc' },
              include: { supplier: { select: { name: true } } },
            },
          },
        },
        evaluationResults: {
          orderBy: { rank: 'asc' },
          include: { supplier: true },
        },
        approvalRecords: {
          orderBy: { createdAt: 'desc' },
          include: { approver: { select: { username: true } } },
        },
        contract: true,
      },
    });

    if (!procurement) return null;

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
      minSupplierLevel: procurement.minSupplierLevel,
      deadline: procurement.deadline.toISOString(),
      status: procurement.status,
      totalSavings: procurement.totalSavings?.toNumber(),
      creator: {
        username: procurement.creator.username,
        email: procurement.creator.email,
      },
      invitedSuppliers: procurement.invitedSuppliers.map(s => ({
        id: s.id,
        name: s.name,
        level: s.level,
        performanceScore: s.performanceScore,
      })),
      biddingRounds: procurement.biddingRounds.map(round => ({
        id: round.id,
        roundNumber: round.roundNumber,
        startTime: round.startTime.toISOString(),
        endTime: round.endTime.toISOString(),
        status: round.status,
        lowestPrice: round.lowestPrice?.toNumber(),
        bidCount: round.bidCount,
        bids: round.bids.map(bid => ({
          id: bid.id,
          supplierName: bid.supplier.name,
          price: bid.price.toNumber(),
          rank: bid.rank,
          timestamp: bid.timestamp.toISOString(),
        })),
      })),
      evaluationResults: procurement.evaluationResults.map(r => ({
        id: r.id,
        supplierName: r.supplier.name,
        finalPrice: r.finalPrice.toNumber(),
        priceScore: r.priceScore,
        historyScore: r.historyScore,
        totalScore: r.totalScore,
        rank: r.rank,
        isRecommended: r.isRecommended,
      })),
      approvalRecords: procurement.approvalRecords.map(r => ({
        id: r.id,
        approverName: r.approver?.username,
        approverRole: r.approverRole,
        decision: r.decision,
        comment: r.comment,
        decidedAt: r.decidedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
      contract: procurement.contract ? {
        id: procurement.contract.id,
        amount: procurement.contract.amount.toNumber(),
        status: procurement.contract.status,
        signedAt: procurement.contract.signedAt?.toISOString(),
        createdAt: procurement.contract.createdAt.toISOString(),
      } : null,
      createdAt: procurement.createdAt.toISOString(),
      publishedAt: procurement.publishedAt?.toISOString(),
      awardedAt: procurement.awardedAt?.toISOString(),
    };
  }

  async getCategories(): Promise<string[]> {
    const procurements = await prisma.procurementRequest.findMany({
      select: { category: true },
      distinct: ['category'],
    });
    return procurements.map(p => p.category).filter(Boolean);
  }
}

export const historyService = new HistoryService();
