import { Router, type Request, type Response } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { reportService } from '../services/ReportService.js';
import { auditLogService } from '../services/AuditLogService.js';

const router = Router();

router.get('/', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
    } = req.query;

    const result = await reportService.getReports({
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: '获取报告列表失败',
    });
  }
});

router.get('/:id', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const report = await reportService.getReportById(id);

    if (!report) {
      res.status(404).json({
        success: false,
        error: '报告不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      error: '获取报告详情失败',
    });
  }
});

router.post('/generate', authenticate, requireRoles('PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.body;
    const user = (req as any).user;

    if (!month) {
      res.status(400).json({
        success: false,
        error: '请指定月份',
      });
      return;
    }

    const report = await reportService.generateMonthlyReport(month);

    await auditLogService.log({
      userId: user.userId,
      action: 'REPORT_GENERATED',
      resource: 'MonthlyReport',
      resourceId: report.id,
      details: `生成月度报告: ${month}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: report,
      message: '月度报告生成成功',
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '生成月度报告失败',
    });
  }
});

router.get('/:id/pdf', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const pdfBuffer = await reportService.exportToPDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '导出PDF失败',
    });
  }
});

router.get('/:id/excel', authenticate, requireRoles('PROCUREMENT_STAFF', 'PROCUREMENT_MANAGER', 'PROCUREMENT_DIRECTOR', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const excelBuffer = await reportService.exportToExcel(id);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${id}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '导出Excel失败',
    });
  }
});

export default router;
