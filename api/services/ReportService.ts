import prisma from '../lib/prisma';
import { auditLogService } from './AuditLogService';
import { notificationService } from './NotificationService';
import type { MonthlyReport, ComparisonChartData } from '../../shared/types';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { config } from '../lib/config';

class ReportService {
  private async ensureReportDir() {
    const dir = path.join(process.cwd(), config.fileStorage.path, 'reports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async generateMonthlyReport(month: string): Promise<MonthlyReport> {
    const [year, monthNum] = month.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, monthNum - 1));
    const monthEnd = endOfMonth(new Date(year, monthNum - 1));
    const lastMonthStart = startOfMonth(subMonths(monthStart, 1));
    const lastMonthEnd = endOfMonth(subMonths(monthStart, 1));

    const [currentMonthData, lastMonthData] = await Promise.all([
      this.getMonthStats(monthStart, monthEnd),
      this.getMonthStats(lastMonthStart, lastMonthEnd),
    ]);

    const avgPriceDrop = currentMonthData.totalProjects > 0
      ? currentMonthData.totalPriceDrop / currentMonthData.totalProjects
      : 0;

    const awardDeviationRate = currentMonthData.totalProjects > 0
      ? currentMonthData.totalDeviation / currentMonthData.totalProjects
      : 0;

    const comparisonData = {
      currentMonth: {
        totalProjects: currentMonthData.totalProjects,
        avgPriceDrop,
        awardDeviationRate,
        totalSavings: currentMonthData.totalSavings,
        totalBudget: currentMonthData.totalBudget,
      },
      lastMonth: {
        totalProjects: lastMonthData.totalProjects,
        avgPriceDrop: lastMonthData.totalProjects > 0
          ? lastMonthData.totalPriceDrop / lastMonthData.totalProjects
          : 0,
        awardDeviationRate: lastMonthData.totalProjects > 0
          ? lastMonthData.totalDeviation / lastMonthData.totalProjects
          : 0,
        totalSavings: lastMonthData.totalSavings,
        totalBudget: lastMonthData.totalBudget,
      },
    };

    const existing = await prisma.monthlyReport.findUnique({
      where: { month },
    });

    const report = await prisma.monthlyReport.upsert({
      where: { month },
      update: {
        totalProjects: currentMonthData.totalProjects,
        avgPriceDrop,
        awardDeviationRate,
        totalSavings: currentMonthData.totalSavings,
        comparisonData,
      },
      create: {
        month,
        totalProjects: currentMonthData.totalProjects,
        avgPriceDrop,
        awardDeviationRate,
        totalSavings: currentMonthData.totalSavings,
        comparisonData,
      },
    });

    await auditLogService.log({
      action: 'REPORT_GENERATED',
      resource: 'MonthlyReport',
      resourceId: report.id,
      details: `生成 ${month} 月度报告，项目数：${currentMonthData.totalProjects}，平均降价率：${(avgPriceDrop * 100).toFixed(2)}%，总节约：${currentMonthData.totalSavings}元`,
    });

    return {
      id: report.id,
      month: report.month,
      totalProjects: report.totalProjects,
      avgPriceDrop: report.avgPriceDrop,
      awardDeviationRate: report.awardDeviationRate,
      totalSavings: report.totalSavings.toNumber(),
      comparisonData: typeof report.comparisonData === 'string'
        ? JSON.parse(report.comparisonData)
        : report.comparisonData,
      generatedAt: report.generatedAt.toISOString(),
    };
  }

  private async getMonthStats(start: Date, end: Date) {
    const procurements = await prisma.procurementRequest.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ['COMPLETED', 'AWARDED', 'CONTRACT_SIGNED', 'FULFILLING'] },
      },
      include: {
        bids: {
          where: { status: 'VALID' },
          orderBy: { price: 'asc' },
          take: 1,
        },
        evaluationResults: {
          where: { isRecommended: true },
          take: 1,
        },
      },
    });

    let totalPriceDrop = 0;
    let totalDeviation = 0;
    let totalSavings = 0;
    let totalBudget = 0;

    for (const p of procurements) {
      if (p.bids.length > 0 && p.startPrice) {
        const startPrice = p.startPrice.toNumber();
        const finalPrice = p.bids[0].price.toNumber();
        const priceDrop = (startPrice - finalPrice) / startPrice;
        totalPriceDrop += priceDrop;
      }

      if (p.evaluationResults.length > 0) {
        const finalPrice = p.evaluationResults[0].finalPrice.toNumber();
        const budget = p.budget.toNumber();
        const deviation = (finalPrice - budget) / budget;
        totalDeviation += deviation;
        totalSavings += budget - finalPrice;
        totalBudget += budget;
      }
    }

    return {
      totalProjects: procurements.length,
      totalPriceDrop,
      totalDeviation,
      totalSavings,
      totalBudget,
    };
  }

  async getMonthlyReport(month: string): Promise<MonthlyReport | null> {
    const report = await prisma.monthlyReport.findUnique({
      where: { month },
    });

    if (!report) return null;

    return {
      id: report.id,
      month: report.month,
      totalProjects: report.totalProjects,
      avgPriceDrop: report.avgPriceDrop,
      awardDeviationRate: report.awardDeviationRate,
      totalSavings: report.totalSavings.toNumber(),
      comparisonData: typeof report.comparisonData === 'string'
        ? JSON.parse(report.comparisonData)
        : report.comparisonData,
      generatedAt: report.generatedAt.toISOString(),
    };
  }

  async getChartData(month: string): Promise<ComparisonChartData> {
    const report = await this.getMonthlyReport(month);
    if (!report) {
      throw new Error('报告不存在');
    }

    const labels = ['项目数', '平均降价率(%)', '中标偏离率(%)', '总节约(万元)'];
    const current = report.comparisonData.currentMonth;
    const last = report.comparisonData.lastMonth;

    return {
      labels,
      currentMonth: [
        current.totalProjects,
        current.avgPriceDrop * 100,
        current.awardDeviationRate * 100,
        current.totalSavings / 10000,
      ],
      lastMonth: [
        last.totalProjects,
        last.avgPriceDrop * 100,
        last.awardDeviationRate * 100,
        last.totalSavings / 10000,
      ],
    };
  }

  async exportToPDF(month: string): Promise<string> {
    const report = await this.getMonthlyReport(month);
    if (!report) {
      throw new Error('报告不存在');
    }

    const dir = await this.ensureReportDir();
    const filePath = path.join(dir, `monthly-report-${month}.pdf`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc.fontSize(20).text('供应商竞价管理系统 - 月度报告', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`报告月份：${month}`, { align: 'center' });
      doc.fontSize(12).text(`生成时间：${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(16).text('一、核心指标', { underline: true });
      doc.moveDown();

      const current = report.comparisonData.currentMonth;
      const last = report.comparisonData.lastMonth;

      const tableData = [
        ['指标', '本月', '上月', '环比变化'],
        ['竞价项目数', current.totalProjects.toString(), last.totalProjects.toString(),
          this.getChangePercent(current.totalProjects, last.totalProjects)],
        ['平均降价率', `${(current.avgPriceDrop * 100).toFixed(2)}%`, `${(last.avgPriceDrop * 100).toFixed(2)}%`,
          this.getChangePercent(current.avgPriceDrop * 100, last.avgPriceDrop * 100)],
        ['中标偏离率', `${(current.awardDeviationRate * 100).toFixed(2)}%`, `${(last.awardDeviationRate * 100).toFixed(2)}%`,
          this.getChangePercent(current.awardDeviationRate * 100, last.awardDeviationRate * 100)],
        ['总节约金额', `${current.totalSavings.toLocaleString()}元`, `${last.totalSavings.toLocaleString()}元`,
          this.getChangePercent(current.totalSavings, last.totalSavings)],
        ['总预算金额', `${current.totalBudget.toLocaleString()}元`, `${last.totalBudget.toLocaleString()}元`,
          this.getChangePercent(current.totalBudget, last.totalBudget)],
      ];

      this.drawTable(doc, tableData, 50, doc.y, 500);
      doc.moveDown(2);

      doc.fontSize(16).text('二、趋势分析', { underline: true });
      doc.moveDown();

      const chartImage = this.generateChart(month, report);
      doc.image(chartImage, { width: 500 });
      doc.moveDown(2);

      doc.fontSize(16).text('三、备注', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text('1. 降价率 = (起拍价 - 最终成交价) / 起拍价 × 100%');
      doc.text('2. 中标偏离率 = (最终成交价 - 预算) / 预算 × 100%');
      doc.text('3. 环比变化 = (本月值 - 上月值) / 上月值 × 100%');

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private getChangePercent(current: number, last: number): string {
    if (last === 0) return 'N/A';
    const change = ((current - last) / last) * 100;
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  }

  private drawTable(doc: PDFKit.PDFDocument, data: string[][], x: number, y: number, width: number) {
    const rowHeight = 30;
    const colWidth = width / data[0].length;

    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const cellX = x + col * colWidth;
        const cellY = y + row * rowHeight;

        doc.rect(cellX, cellY, colWidth, rowHeight).stroke();

        const isHeader = row === 0;
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(isHeader ? 12 : 10)
           .text(data[row][col], cellX + 5, cellY + 8, {
             width: colWidth - 10,
             align: 'center',
           });
      }
    }
  }

  private generateChart(month: string, report: MonthlyReport): Buffer {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    const Chart = require('chart.js/auto');
    const chartData = this.getChartDataSync(report);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: '本月',
            data: chartData.currentMonth,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          },
          {
            label: '上月',
            data: chartData.lastMonth,
            backgroundColor: 'rgba(156, 163, 175, 0.7)',
            borderColor: 'rgb(156, 163, 175)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `${month} 月度指标对比`,
            font: { size: 16 },
          },
          legend: {
            position: 'top',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    return canvas.toBuffer('image/png');
  }

  private getChartDataSync(report: MonthlyReport): ComparisonChartData {
    const labels = ['项目数', '平均降价率(%)', '中标偏离率(%)', '总节约(万元)'];
    const current = report.comparisonData.currentMonth;
    const last = report.comparisonData.lastMonth;

    return {
      labels,
      currentMonth: [
        current.totalProjects,
        current.avgPriceDrop * 100,
        current.awardDeviationRate * 100,
        current.totalSavings / 10000,
      ],
      lastMonth: [
        last.totalProjects,
        last.avgPriceDrop * 100,
        last.awardDeviationRate * 100,
        last.totalSavings / 10000,
      ],
    };
  }

  async exportToExcel(month: string): Promise<string> {
    const report = await this.getMonthlyReport(month);
    if (!report) {
      throw new Error('报告不存在');
    }

    const dir = await this.ensureReportDir();
    const filePath = path.join(dir, `monthly-report-${month}.xlsx`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '供应商竞价管理系统';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('核心指标');

    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 20 },
      { header: '本月', key: 'current', width: 20 },
      { header: '上月', key: 'last', width: 20 },
      { header: '环比变化', key: 'change', width: 15 },
    ];

    const current = report.comparisonData.currentMonth;
    const last = report.comparisonData.lastMonth;

    summarySheet.addRow({
      metric: '竞价项目数',
      current: current.totalProjects,
      last: last.totalProjects,
      change: this.getChangePercent(current.totalProjects, last.totalProjects),
    });
    summarySheet.addRow({
      metric: '平均降价率',
      current: `${(current.avgPriceDrop * 100).toFixed(2)}%`,
      last: `${(last.avgPriceDrop * 100).toFixed(2)}%`,
      change: this.getChangePercent(current.avgPriceDrop * 100, last.avgPriceDrop * 100),
    });
    summarySheet.addRow({
      metric: '中标偏离率',
      current: `${(current.awardDeviationRate * 100).toFixed(2)}%`,
      last: `${(last.awardDeviationRate * 100).toFixed(2)}%`,
      change: this.getChangePercent(current.awardDeviationRate * 100, last.awardDeviationRate * 100),
    });
    summarySheet.addRow({
      metric: '总节约金额',
      current: `${current.totalSavings.toLocaleString()}元`,
      last: `${last.totalSavings.toLocaleString()}元`,
      change: this.getChangePercent(current.totalSavings, last.totalSavings),
    });
    summarySheet.addRow({
      metric: '总预算金额',
      current: `${current.totalBudget.toLocaleString()}元`,
      last: `${last.totalBudget.toLocaleString()}元`,
      change: this.getChangePercent(current.totalBudget, last.totalBudget),
    });

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    const detailSheet = workbook.addWorksheet('项目明细');

    const [year, monthNum] = month.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, monthNum - 1));
    const monthEnd = endOfMonth(new Date(year, monthNum - 1));

    const procurements = await prisma.procurementRequest.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { in: ['COMPLETED', 'AWARDED', 'CONTRACT_SIGNED', 'FULFILLING'] },
      },
      include: {
        creator: { select: { username: true } },
        bids: {
          where: { status: 'VALID' },
          orderBy: { price: 'asc' },
          take: 1,
        },
        evaluationResults: {
          where: { isRecommended: true },
          include: { supplier: true },
          take: 1,
        },
      },
    });

    detailSheet.columns = [
      { header: '项目名称', key: 'title', width: 30 },
      { header: '品类', key: 'category', width: 15 },
      { header: '预算(元)', key: 'budget', width: 15 },
      { header: '起拍价(元)', key: 'startPrice', width: 15 },
      { header: '成交价(元)', key: 'finalPrice', width: 15 },
      { header: '中标供应商', key: 'supplier', width: 20 },
      { header: '降价率(%)', key: 'priceDrop', width: 12 },
      { header: '节约金额(元)', key: 'savings', width: 15 },
      { header: '状态', key: 'status', width: 12 },
      { header: '创建人', key: 'creator', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    for (const p of procurements) {
      const finalPrice = p.evaluationResults[0]?.finalPrice.toNumber() || 0;
      const startPrice = p.startPrice.toNumber();
      const budget = p.budget.toNumber();
      const priceDrop = startPrice > 0 ? ((startPrice - finalPrice) / startPrice) * 100 : 0;

      detailSheet.addRow({
        title: p.title,
        category: p.category,
        budget: budget.toLocaleString(),
        startPrice: startPrice.toLocaleString(),
        finalPrice: finalPrice.toLocaleString(),
        supplier: p.evaluationResults[0]?.supplier.name || '-',
        priceDrop: priceDrop.toFixed(2),
        savings: (budget - finalPrice).toLocaleString(),
        status: p.status,
        creator: p.creator.username,
        createdAt: format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm'),
      });
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  async getReportList(params: {
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 20 } = params;

    const [total, reports] = await Promise.all([
      prisma.monthlyReport.count(),
      prisma.monthlyReport.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { month: 'desc' },
      }),
    ]);

    return {
      data: reports.map(r => ({
        id: r.id,
        month: r.month,
        totalProjects: r.totalProjects,
        avgPriceDrop: r.avgPriceDrop,
        awardDeviationRate: r.awardDeviationRate,
        totalSavings: r.totalSavings.toNumber(),
        generatedAt: r.generatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

export const reportService = new ReportService();
