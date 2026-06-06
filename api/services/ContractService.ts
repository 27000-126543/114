import prisma from '../lib/prisma';
import { auditLogService } from './AuditLogService';
import { notificationService } from './NotificationService';
import type { Contract } from '../../shared/types';
import { PERFORMANCE_WEIGHTS } from '../../shared/types';

function toContract(contract: any): Contract {
  return {
    id: contract.id,
    procurementId: contract.procurementId,
    supplierId: contract.supplierId,
    amount: contract.amount.toNumber(),
    status: contract.status,
    content: contract.content,
    signedByBuyer: contract.signedByBuyer || undefined,
    signedBySupplier: contract.signedBySupplier || undefined,
    signedAt: contract.signedAt?.toISOString(),
    startDate: contract.startDate?.toISOString(),
    endDate: contract.endDate?.toISOString(),
    createdAt: contract.createdAt.toISOString(),
  };
}

class ContractService {
  async generateContract(procurementId: string): Promise<Contract> {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: procurementId },
      include: {
        evaluationResults: {
          where: { isRecommended: true },
          include: { supplier: true },
        },
      },
    });

    if (!procurement) {
      throw new Error('采购需求不存在');
    }

    if (procurement.status !== 'APPROVED') {
      throw new Error('采购需求未通过审批');
    }

    const recommended = procurement.evaluationResults[0];
    if (!recommended) {
      throw new Error('未找到中标供应商');
    }

    const inventoryCheck = await this.checkInventory(procurement.category, procurement.quantity);

    const content = this.generateContractContent(
      procurement,
      recommended.supplier,
      recommended.finalPrice.toNumber(),
      inventoryCheck
    );

    const contract = await prisma.$transaction(async (tx) => {
      const existing = await tx.contract.findUnique({
        where: { procurementId },
      });

      if (existing) {
        return tx.contract.update({
          where: { id: existing.id },
          data: {
            content,
            status: 'DRAFT',
          },
        });
      }

      return tx.contract.create({
        data: {
          procurementId,
          supplierId: recommended.supplierId,
          amount: recommended.finalPrice,
          content,
          status: 'DRAFT',
        },
      });

      await tx.procurementRequest.update({
        where: { id: procurementId },
        data: { status: 'AWARDED', awardedAt: new Date() },
      });
    });

    await prisma.procurementRequest.update({
      where: { id: procurementId },
      data: { status: 'AWARDED', awardedAt: new Date() },
    });

    await auditLogService.log({
      action: 'CONTRACT_GENERATED',
      resource: 'Contract',
      resourceId: contract.id,
      details: `为项目 ${procurement.title} 生成合同草稿，供应商：${recommended.supplier.name}，金额：${recommended.finalPrice.toNumber()}元`,
    });

    await notificationService.sendBiddingAlert(
      procurement.title,
      '合同生成',
      `中标供应商：${recommended.supplier.name}，合同金额：${recommended.finalPrice.toNumber()}元，已生成合同草稿`
    );

    return toContract(contract);
  }

  private generateContractContent(
    procurement: any,
    supplier: any,
    amount: number,
    inventoryCheck: any
  ): string {
    const today = new Date().toLocaleDateString('zh-CN');
    const deliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN');

    return `
采购合同

合同编号：CN-${procurement.id.slice(0, 8).toUpperCase()}
签订日期：${today}

甲方（采购方）：
企业名称：XX有限公司
地址：XX市XX区XX路XX号
联系人：XXX
联系电话：XXX-XXXXXXX

乙方（供应商）：
企业名称：${supplier.name}
地址：${supplier.address || '未提供'}
联系人：${supplier.contactName}
联系电话：${supplier.contactPhone}
电子邮箱：${supplier.contactEmail}

根据《中华人民共和国民法典》及相关法律法规，甲乙双方本着平等、自愿、公平和诚实信用的原则，经协商一致，签订本合同。

第一条 采购标的
1.1 货物名称：${procurement.title}
1.2 货物描述：${procurement.description}
1.3 数量：${procurement.quantity} ${procurement.unit}
1.4 单价：${(amount / procurement.quantity).toFixed(2)} 元/${procurement.unit}
1.5 总金额：${amount.toFixed(2)} 元（大写：${this.numberToChinese(amount)}元整）

第二条 质量标准
2.1 货物质量符合国家标准、行业标准及甲方要求。
2.2 乙方应提供产品合格证明、检测报告等质量文件。

第三条 交货
3.1 交货日期：${deliveryDate}
3.2 交货地点：甲方指定仓库
3.3 运输方式及费用：乙方承担

第四条 验收
4.1 甲方在收到货物后3个工作日内进行验收。
4.2 验收内容包括数量、外观、质量、规格等。
4.3 如发现质量问题，甲方有权拒收或要求退换。

第五条 付款方式
5.1 货到验收合格后30个工作日内支付100%货款。
5.2 付款前乙方应开具等额增值税专用发票。

第六条 违约责任
6.1 逾期交货：每逾期一日，按合同总金额的0.1%支付违约金。
6.2 质量不符：乙方应退换货物并承担由此造成的损失。
6.3 逾期付款：每逾期一日，按应付金额的0.1%支付违约金。

第七条 库存情况说明
${inventoryCheck.sufficient 
  ? `7.1 当前库存：${inventoryCheck.currentStock} ${procurement.unit}`
  : `7.1 当前库存不足：仅存${inventoryCheck.currentStock} ${procurement.unit}，需要采购${procurement.quantity} ${procurement.unit}`
}
7.2 安全库存水平：${inventoryCheck.safetyStock} ${procurement.unit}
7.3 库存状态：${inventoryCheck.sufficient ? '充足' : '需要补充'}

第八条 争议解决
8.1 因本合同引起的争议，双方应友好协商解决。
8.2 协商不成的，向甲方所在地人民法院提起诉讼。

第九条 其他
9.1 本合同自双方签字盖章之日起生效。
9.2 本合同一式两份，甲乙双方各执一份，具有同等法律效力。

甲方（盖章）：          乙方（盖章）：
法定代表人：            法定代表人：
日期：${today}          日期：${today}
    `.trim();
  }

  private numberToChinese(num: number): string {
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟', '万'];
    
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);
    
    let result = '';
    const numStr = integerPart.toString();
    
    for (let i = 0; i < numStr.length; i++) {
      const digit = parseInt(numStr[i]);
      const pos = numStr.length - 1 - i;
      
      if (digit !== 0) {
        result += digits[digit] + units[pos % 4];
        if (pos > 0 && pos % 4 === 0) {
          result += units[4];
        }
      } else if (result && !result.endsWith('零')) {
        result += '零';
      }
    }
    
    result = result.replace(/零+$/g, '');
    
    if (decimalPart > 0) {
      const jiao = Math.floor(decimalPart / 10);
      const fen = decimalPart % 10;
      result += '元';
      if (jiao > 0) result += digits[jiao] + '角';
      if (fen > 0) result += digits[fen] + '分';
    } else {
      result += '元整';
    }
    
    return result || '零元整';
  }

  async checkInventory(category: string, requiredQuantity: number): Promise<{
    currentStock: number;
    safetyStock: number;
    sufficient: boolean;
  }> {
    const inventory = await prisma.inventory.findFirst({
      where: { category },
    });

    if (!inventory) {
      return {
        currentStock: 0,
        safetyStock: 0,
        sufficient: false,
      };
    }

    return {
      currentStock: inventory.quantity,
      safetyStock: inventory.safetyStockLevel,
      sufficient: inventory.quantity >= requiredQuantity,
    };
  }

  async getContracts(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    supplierId?: string;
  }) {
    const { page = 1, pageSize = 20, status, supplierId } = params;

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [total, contracts] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          procurement: { select: { title: true } },
          supplier: { select: { name: true } },
        },
      }),
    ]);

    return {
      data: contracts.map(c => ({
        ...toContract(c),
        procurementTitle: c.procurement.title,
        supplierName: c.supplier.name,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getContractById(id: string): Promise<Contract | null> {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        procurement: true,
        supplier: true,
        fulfillments: {
          orderBy: { deliveryDate: 'desc' },
        },
      },
    });

    if (!contract) return null;

    return toContract(contract);
  }

  async initiateSigning(contractId: string): Promise<Contract> {
    const contract = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'PENDING_SIGNATURE' },
      include: { procurement: true, supplier: true },
    });

    await notificationService.sendBiddingAlert(
      contract.procurement.title,
      '发起签署',
      `合同已发起签署流程，请供应商 ${contract.supplier.name} 及时签署`
    );

    return toContract(contract);
  }

  async signContract(contractId: string, signatory: string, isSupplier: boolean): Promise<Contract> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { procurement: true },
    });

    if (!contract) {
      throw new Error('合同不存在');
    }

    const updateData: any = {};
    if (isSupplier) {
      updateData.signedBySupplier = signatory;
    } else {
      updateData.signedByBuyer = signatory;
    }

    const updated = await prisma.contract.findUnique({ where: { id: contractId } });
    const bothSigned = 
      (isSupplier && updated?.signedByBuyer) ||
      (!isSupplier && updated?.signedBySupplier) ||
      (updated?.signedByBuyer && updated?.signedBySupplier);

    if (bothSigned) {
      updateData.status = 'SIGNED';
      updateData.signedAt = new Date();
      updateData.startDate = new Date();
      updateData.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    const result = await prisma.contract.update({
      where: { id: contractId },
      data: updateData,
    });

    if (updateData.status === 'SIGNED') {
      await prisma.procurementRequest.update({
        where: { id: contract.procurementId },
        data: { status: 'CONTRACT_SIGNED' },
      });

      await notificationService.sendBiddingAlert(
        contract.procurement.title,
        '合同签署完成',
        `采购合同已完成双方签署，开始履约执行`
      );
    }

    return toContract(result);
  }
}

export const contractService = new ContractService();
