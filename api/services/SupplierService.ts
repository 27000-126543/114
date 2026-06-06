import prisma from '../lib/prisma';
import type { Supplier, SupplierLevel, SupplierStatus, HistoricalScores } from '../../shared/types';

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

function parseHistoricalScores(value: any): HistoricalScores {
  if (!value) return { price: 0, quality: 0, delivery: 0, service: 0 };
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { price: 0, quality: 0, delivery: 0, service: 0 };
    }
  }
  return value as HistoricalScores;
}

function toSupplier(supplier: any): Supplier {
  return {
    id: supplier.id,
    name: supplier.name,
    contactName: supplier.contactName,
    contactPhone: supplier.contactPhone,
    contactEmail: supplier.contactEmail,
    address: supplier.address || undefined,
    qualifications: parseJsonArray(supplier.qualifications),
    level: supplier.level as SupplierLevel,
    performanceScore: supplier.performanceScore,
    status: supplier.status as SupplierStatus,
    categories: parseJsonArray(supplier.categories),
    historicalScores: parseHistoricalScores(supplier.historicalScores),
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

class SupplierService {
  async getSuppliers(params: {
    page?: number;
    pageSize?: number;
    level?: SupplierLevel;
    status?: SupplierStatus;
    category?: string;
    keyword?: string;
  }) {
    const { page = 1, pageSize = 20, level, status, category, keyword } = params;

    const where: any = {};

    if (level) where.level = level;
    if (status) where.status = status;
    if (category) {
      where.categories = {
        contains: category,
      };
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { contactName: { contains: keyword } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: suppliers.map(toSupplier),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        bids: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!supplier) return null;

    return toSupplier(supplier);
  }

  async createSupplier(data: {
    name: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    address?: string;
    qualifications: string[];
    level: SupplierLevel;
    categories: string[];
  }): Promise<Supplier> {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        address: data.address,
        qualifications: data.qualifications,
        level: data.level,
        categories: data.categories,
        historicalScores: { price: 0, quality: 0, delivery: 0, service: 0 },
      },
    });

    return toSupplier(supplier);
  }

  async updateSupplier(id: string, data: Partial<{
    name: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    qualifications: string[];
    level: SupplierLevel;
    status: SupplierStatus;
    categories: string[];
  }>): Promise<Supplier | null> {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return toSupplier(supplier);
  }

  async filterEligibleSuppliers(params: {
    category: string;
    requiredQualifications: string[];
    minLevel: SupplierLevel;
  }): Promise<Supplier[]> {
    const { category, requiredQualifications, minLevel } = params;

    const levelOrder = { A: 4, B: 3, C: 2, D: 1 };
    const minLevelValue = levelOrder[minLevel];

    const allSuppliers = await prisma.supplier.findMany({
      where: {
        status: 'ACTIVE',
      },
    });

    const eligibleSuppliers = allSuppliers.filter(supplier => {
      const supplierLevelValue = levelOrder[supplier.level as SupplierLevel];
      if (supplierLevelValue < minLevelValue) return false;

      const categories = parseJsonArray(supplier.categories);
      if (!categories.includes(category)) return false;

      const qualifications = parseJsonArray(supplier.qualifications);
      const hasAllQualifications = requiredQualifications.every(q => 
        qualifications.includes(q)
      );

      return hasAllQualifications;
    });

    return eligibleSuppliers.map(toSupplier);
  }

  async updatePerformanceScore(supplierId: string, performanceDelta: number): Promise<void> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) return;

    const newScore = Math.max(0, Math.min(100, supplier.performanceScore + performanceDelta));

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        performanceScore: newScore,
        updatedAt: new Date(),
      },
    });
  }

  async updateHistoricalScores(
    supplierId: string,
    scores: Partial<HistoricalScores>
  ): Promise<void> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) return;

    const currentScores = parseHistoricalScores(supplier.historicalScores);
    const newScores = { ...currentScores, ...scores };

    const performanceScore = 
      newScores.price * 0.3 +
      newScores.quality * 0.3 +
      newScores.delivery * 0.2 +
      newScores.service * 0.2;

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        historicalScores: newScores,
        performanceScore,
        updatedAt: new Date(),
      },
    });
  }

  async deleteSupplier(id: string): Promise<void> {
    await prisma.supplier.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date(),
      },
    });
  }
}

export const supplierService = new SupplierService();
