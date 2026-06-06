import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { supplierService } from '../services/SupplierService.js';
import { auditLogService } from '../services/AuditLogService.js';
import type { SupplierLevel, SupplierStatus } from '../../shared/types.js';

const router = Router();

router.get('/', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
      level,
      status,
      category,
      keyword,
    } = req.query;

    const result = await supplierService.getSuppliers({
      page: Number(page),
      pageSize: Number(pageSize),
      level: level as SupplierLevel,
      status: status as SupplierStatus,
      category: category as string,
      keyword: keyword as string,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      error: '获取供应商列表失败',
    });
  }
});

router.get('/:id', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN', 'SUPPLIER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (user.role === 'SUPPLIER' && user.supplierId !== id) {
      res.status(403).json({
        success: false,
        error: '无权查看其他供应商信息',
      });
      return;
    }

    const supplier = await supplierService.getSupplierById(id);

    if (!supplier) {
      res.status(404).json({
        success: false,
        error: '供应商不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      success: false,
      error: '获取供应商信息失败',
    });
  }
});

router.post('/', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      contactName,
      contactPhone,
      contactEmail,
      address,
      qualifications,
      level,
      categories,
    } = req.body;

    if (!name || !contactName || !contactPhone || !contactEmail || !qualifications || !level || !categories) {
      res.status(400).json({
        success: false,
        error: '请填写完整的供应商信息',
      });
      return;
    }

    const supplier = await supplierService.createSupplier({
      name,
      contactName,
      contactPhone,
      contactEmail,
      address,
      qualifications,
      level,
      categories,
    });

    await auditLogService.log({
      userId: (req as any).user.userId,
      action: 'SUPPLIER_CREATED',
      resource: 'Supplier',
      resourceId: supplier.id,
      details: `创建供应商: ${name}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: supplier,
      message: '供应商创建成功',
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      error: '创建供应商失败',
    });
  }
});

router.put('/:id', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const supplier = await supplierService.updateSupplier(id, updateData);

    if (!supplier) {
      res.status(404).json({
        success: false,
        error: '供应商不存在',
      });
      return;
    }

    await auditLogService.log({
      userId: (req as any).user.userId,
      action: 'SUPPLIER_UPDATED',
      resource: 'Supplier',
      resourceId: id,
      details: `更新供应商信息: ${supplier.name}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: supplier,
      message: '供应商更新成功',
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      error: '更新供应商失败',
    });
  }
});

router.delete('/:id', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const supplier = await supplierService.getSupplierById(id);
    if (!supplier) {
      res.status(404).json({
        success: false,
        error: '供应商不存在',
      });
      return;
    }

    await supplierService.deleteSupplier(id);

    await auditLogService.log({
      userId: (req as any).user.userId,
      action: 'SUPPLIER_DELETED',
      resource: 'Supplier',
      resourceId: id,
      details: `删除供应商: ${supplier.name}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: '供应商删除成功',
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      success: false,
      error: '删除供应商失败',
    });
  }
});

router.post('/filter', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, requiredQualifications, minLevel } = req.body;

    if (!category || !requiredQualifications || !minLevel) {
      res.status(400).json({
        success: false,
        error: '请提供完整的筛选条件',
      });
      return;
    }

    const suppliers = await supplierService.filterEligibleSuppliers({
      category,
      requiredQualifications,
      minLevel,
    });

    res.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error('Filter suppliers error:', error);
    res.status(500).json({
      success: false,
      error: '筛选供应商失败',
    });
  }
});

export default router;
