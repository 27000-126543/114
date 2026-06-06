import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Starting seed...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const userData = [
    {
      username: 'admin',
      email: 'admin@company.com',
      passwordHash,
      role: 'ADMIN',
    },
    {
      username: 'director',
      email: 'director@company.com',
      passwordHash,
      role: 'PROCUREMENT_DIRECTOR',
    },
    {
      username: 'manager',
      email: 'manager@company.com',
      passwordHash,
      role: 'PROCUREMENT_MANAGER',
    },
    {
      username: 'staff1',
      email: 'staff1@company.com',
      passwordHash,
      role: 'PROCUREMENT_STAFF',
    },
    {
      username: 'staff2',
      email: 'staff2@company.com',
      passwordHash,
      role: 'PROCUREMENT_STAFF',
    },
  ];

  let userCount = 0;
  for (const u of userData) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      await prisma.user.create({ data: u });
      userCount++;
    }
  }

  console.log(`Created ${userCount} users`);

  const supplierData = [
    {
      name: '华为技术有限公司',
      contactName: '张经理',
      contactPhone: '13800138001',
      contactEmail: 'zhang@huawei.com',
      address: '广东省深圳市龙岗区坂田华为基地',
      qualifications: JSON.stringify(['ISO9001', 'ISO27001', 'CMMI5']),
      level: 'A',
      performanceScore: 95,
      status: 'ACTIVE',
      categories: JSON.stringify(['电子产品', '通信设备', '服务器']),
      historicalScores: JSON.stringify({ price: 90, quality: 95, delivery: 92, service: 88 }),
    },
    {
      name: '中兴通讯股份有限公司',
      contactName: '李主管',
      contactPhone: '13800138002',
      contactEmail: 'li@zte.com.cn',
      address: '广东省深圳市南山区高新技术产业园',
      qualifications: JSON.stringify(['ISO9001', 'ISO14001', 'CMMI4']),
      level: 'A',
      performanceScore: 92,
      status: 'ACTIVE',
      categories: JSON.stringify(['电子产品', '通信设备', '网络设备']),
      historicalScores: JSON.stringify({ price: 88, quality: 92, delivery: 90, service: 85 }),
    },
    {
      name: '联想集团有限公司',
      contactName: '王经理',
      contactPhone: '13800138003',
      contactEmail: 'wang@lenovo.com',
      address: '北京市海淀区中关村创业大厦',
      qualifications: JSON.stringify(['ISO9001', 'ISO14001']),
      level: 'B',
      performanceScore: 88,
      status: 'ACTIVE',
      categories: JSON.stringify(['电子产品', '计算机设备', '服务器']),
      historicalScores: JSON.stringify({ price: 85, quality: 88, delivery: 86, service: 82 }),
    },
    {
      name: '戴尔中国有限公司',
      contactName: '赵经理',
      contactPhone: '13800138004',
      contactEmail: 'zhao@dell.com',
      address: '上海市浦东新区张江高科技园区',
      qualifications: JSON.stringify(['ISO9001', 'ISO27001']),
      level: 'B',
      performanceScore: 86,
      status: 'ACTIVE',
      categories: JSON.stringify(['电子产品', '计算机设备', '服务器']),
      historicalScores: JSON.stringify({ price: 82, quality: 86, delivery: 84, service: 80 }),
    },
    {
      name: '惠普中国有限公司',
      contactName: '刘经理',
      contactPhone: '13800138005',
      contactEmail: 'liu@hp.com',
      address: '北京市朝阳区望京科技园',
      qualifications: JSON.stringify(['ISO9001', 'ISO14001']),
      level: 'B',
      performanceScore: 84,
      status: 'ACTIVE',
      categories: JSON.stringify(['电子产品', '打印设备', '计算机设备']),
      historicalScores: JSON.stringify({ price: 80, quality: 84, delivery: 82, service: 78 }),
    },
    {
      name: '思科系统(中国)有限公司',
      contactName: '陈主管',
      contactPhone: '13800138006',
      contactEmail: 'chen@cisco.com',
      address: '上海市浦东新区陆家嘴金融贸易区',
      qualifications: JSON.stringify(['ISO9001', 'ISO27001', 'CMMI5']),
      level: 'A',
      performanceScore: 94,
      status: 'ACTIVE',
      categories: JSON.stringify(['网络设备', '通信设备', '安全设备']),
      historicalScores: JSON.stringify({ price: 88, quality: 96, delivery: 94, service: 92 }),
    },
    {
      name: '新华三技术有限公司',
      contactName: '周经理',
      contactPhone: '13800138007',
      contactEmail: 'zhou@h3c.com',
      address: '浙江省杭州市滨江区高新技术开发区',
      qualifications: JSON.stringify(['ISO9001', 'ISO27001', 'CMMI4']),
      level: 'A',
      performanceScore: 91,
      status: 'ACTIVE',
      categories: JSON.stringify(['网络设备', '服务器', '安全设备']),
      historicalScores: JSON.stringify({ price: 86, quality: 92, delivery: 90, service: 88 }),
    },
    {
      name: '浪潮电子信息产业股份有限公司',
      contactName: '吴经理',
      contactPhone: '13800138008',
      contactEmail: 'wu@inspur.com',
      address: '山东省济南市历下区浪潮路',
      qualifications: JSON.stringify(['ISO9001', 'ISO14001']),
      level: 'B',
      performanceScore: 87,
      status: 'ACTIVE',
      categories: JSON.stringify(['服务器', '存储设备', '云计算服务']),
      historicalScores: JSON.stringify({ price: 84, quality: 88, delivery: 86, service: 84 }),
    },
    {
      name: '曙光信息产业股份有限公司',
      contactName: '郑经理',
      contactPhone: '13800138009',
      contactEmail: 'zheng@sugon.com',
      address: '北京市海淀区中关村软件园',
      qualifications: JSON.stringify(['ISO9001', 'ISO14001']),
      level: 'C',
      performanceScore: 80,
      status: 'ACTIVE',
      categories: JSON.stringify(['服务器', '高性能计算', '存储设备']),
      historicalScores: JSON.stringify({ price: 78, quality: 80, delivery: 78, service: 76 }),
    },
    {
      name: '宝德计算机系统股份有限公司',
      contactName: '孙经理',
      contactPhone: '13800138010',
      contactEmail: 'sun@powerleader.com',
      address: '广东省深圳市龙华区宝德科技园',
      qualifications: JSON.stringify(['ISO9001']),
      level: 'C',
      performanceScore: 76,
      status: 'ACTIVE',
      categories: JSON.stringify(['服务器', '计算机设备']),
      historicalScores: JSON.stringify({ price: 75, quality: 76, delivery: 74, service: 72 }),
    },
  ];

  let supplierCount = 0;
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.supplier.create({ data: s });
      supplierCount++;
    }
  }

  console.log(`Created ${supplierCount} suppliers`);

  const createdSuppliers = await prisma.supplier.findMany({ take: 5 });

  let supplierUserCount = 0;
  for (let i = 0; i < createdSuppliers.length; i++) {
    const supplier = createdSuppliers[i];
    const username = `supplier${i + 1}`;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      await prisma.user.create({
        data: {
          username,
          email: `supplier${i + 1}@supplier.com`,
          passwordHash,
          role: 'SUPPLIER',
          supplierId: supplier.id,
        },
      });
      supplierUserCount++;
    }
  }

  console.log(`Created ${supplierUserCount} supplier users`);

  const inventoryData = [
    { productName: '机架式服务器', productCode: 'SRV-001', category: '服务器', quantity: 50, unit: '台', safetyStockLevel: 10 },
    { productName: '刀片服务器', productCode: 'SRV-002', category: '服务器', quantity: 30, unit: '台', safetyStockLevel: 5 },
    { productName: '企业级交换机', productCode: 'NET-001', category: '网络设备', quantity: 100, unit: '台', safetyStockLevel: 20 },
    { productName: '核心路由器', productCode: 'NET-002', category: '网络设备', quantity: 20, unit: '台', safetyStockLevel: 5 },
    { productName: '防火墙', productCode: 'SEC-001', category: '安全设备', quantity: 15, unit: '台', safetyStockLevel: 3 },
    { productName: '笔记本电脑', productCode: 'PC-001', category: '计算机设备', quantity: 200, unit: '台', safetyStockLevel: 50 },
    { productName: '台式工作站', productCode: 'PC-002', category: '计算机设备', quantity: 80, unit: '台', safetyStockLevel: 20 },
    { productName: '网络打印机', productCode: 'PRT-001', category: '打印设备', quantity: 40, unit: '台', safetyStockLevel: 10 },
    { productName: '磁盘阵列存储', productCode: 'STO-001', category: '存储设备', quantity: 25, unit: '套', safetyStockLevel: 5 },
    { productName: '光纤交换机', productCode: 'NET-003', category: '网络设备', quantity: 35, unit: '台', safetyStockLevel: 8 },
  ];

  let inventoryCount = 0;
  for (const item of inventoryData) {
    const existing = await prisma.inventory.findUnique({ where: { productCode: item.productCode } });
    if (!existing) {
      await prisma.inventory.create({ data: item });
      inventoryCount++;
    }
  }

  console.log(`Created ${inventoryCount} inventory items`);

  console.log('Seed completed successfully!');
  console.log('\nDefault accounts:');
  console.log('  admin / 123456 - 系统管理员');
  console.log('  director / 123456 - 采购总监');
  console.log('  manager / 123456 - 采购经理');
  console.log('  staff1 / 123456 - 采购专员');
  console.log('  staff2 / 123456 - 采购专员');
  console.log('  supplier1-5 / 123456 - 供应商账号');

  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
