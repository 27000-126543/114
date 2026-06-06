import app from './app.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { biddingEngineService } from './services/BiddingEngineService.js';
import { authenticate } from './middleware/auth.js';
import { verifyToken } from './utils/jwt.js';
import cron from 'node-cron';
import { reportService } from './services/ReportService.js';
import { notificationService } from './services/NotificationService.js';
import { auditLogService } from './services/AuditLogService.js';

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  if (!token) {
    return next(new Error('未提供认证令牌'));
  }
  const user = verifyToken(token);
  if (!user) {
    return next(new Error('认证令牌无效'));
  }
  (socket as any).user = user;
  next();
});

io.on('connection', (socket) => {
  console.log('Socket connected:', (socket as any).user.userId);

  socket.on('bidding:join', (procurementId: string) => {
    socket.join(`bidding:${procurementId}`);
    console.log(`User joined bidding room: ${procurementId}`);
  });

  socket.on('bidding:leave', (procurementId: string) => {
    socket.leave(`bidding:${procurementId}`);
    console.log(`User left bidding room: ${procurementId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', (socket as any).user.userId);
  });
});

biddingEngineService.setSocketIO(io);

biddingEngineService.initializeActiveBiddings();

cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('Starting monthly report generation...');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    const report = await reportService.generateMonthlyReport(monthStr);
    console.log(`Monthly report generated: ${report.id}`);
    
    await notificationService.sendAlert(
      '月度报告已生成',
      `本月报告已生成，共 ${report.totalProjects} 个项目，平均降价率 ${(report.avgPriceDrop * 100).toFixed(2)}%`,
      'info'
    );
  } catch (error) {
    console.error('Monthly report generation failed:', error);
    await notificationService.sendAlert(
      '月度报告生成失败',
      `错误: ${error instanceof Error ? error.message : '未知错误'}`,
      'critical'
    );
  }
}, {
  timezone: 'Asia/Shanghai',
});

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`Socket.IO server ready`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  biddingEngineService.shutdown();
  auditLogService.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  biddingEngineService.shutdown();
  auditLogService.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
