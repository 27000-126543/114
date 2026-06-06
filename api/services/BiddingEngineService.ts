import prisma from '../lib/prisma';
import redis from '../lib/redis';
import { auditLogService } from './AuditLogService';
import { notificationService } from './NotificationService';
import type { 
  Bid, 
  BiddingRealTimeData,
  BiddingRoundStatus,
  ProcurementStatus,
} from '../../shared/types';
import { BIDDING_RULES } from '../../shared/types';
import type { Server as SocketIOServer } from 'socket.io';

const anonymousNames = [
  '雄鹰', '猛虎', '雄狮', '猎豹', '灰狼', '黑熊', '白鲨', '金雕',
  '麒麟', '凤凰', '朱雀', '玄武', '青龙', '白虎', '天马', '神龟',
  '貔貅', '金蟾', '仙鹤', '孔雀', '麋鹿', '骆驼', '大象', '犀牛',
];

function generateAnonymousName(supplierId: string): string {
  const hash = supplierId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return anonymousNames[hash % anonymousNames.length] + '-' + supplierId.slice(0, 4).toUpperCase();
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

class BiddingEngineService {
  private io: SocketIOServer | null = null;
  private activeBiddings: Map<string, {
    roundEndTimer: NodeJS.Timeout;
    currentLowestPrice: number;
    bidCount: number;
  }> = new Map();

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  private getBidLockKey(procurementId: string): string {
    return `bid:lock:${procurementId}`;
  }

  private getBiddingCacheKey(procurementId: string): string {
    return `bidding:cache:${procurementId}`;
  }

  private async acquireLock(key: string, ttl: number = 5000): Promise<boolean> {
    const result = await redis.setnx(key, Date.now().toString());
    if (result) {
      await redis.set(key, Date.now().toString(), ttl / 1000);
      return true;
    }
    return false;
  }

  private async releaseLock(key: string): Promise<void> {
    await redis.del(key);
  }

  async submitBid(params: {
    procurementId: string;
    roundId: string;
    supplierId: string;
    price: number;
  }): Promise<Bid> {
    const { procurementId, roundId, supplierId, price } = params;
    const lockKey = this.getBidLockKey(procurementId);

    const lockAcquired = await this.acquireLock(lockKey, 5000);
    if (!lockAcquired) {
      throw new Error('系统繁忙，请稍后重试');
    }

    try {
      return await this.processBid(params);
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  private async processBid(params: {
    procurementId: string;
    roundId: string;
    supplierId: string;
    price: number;
  }): Promise<Bid> {
    const { procurementId, roundId, supplierId, price } = params;

    const [procurement, round, existingBid] = await Promise.all([
      prisma.procurementRequest.findUnique({
        where: { id: procurementId },
        include: { invitedSuppliers: true },
      }),
      prisma.biddingRound.findUnique({
        where: { id: roundId },
      }),
      prisma.bid.findUnique({
        where: {
          procurementId_roundId_supplierId: {
            procurementId,
            roundId,
            supplierId,
          },
        },
      }),
    ]);

    if (!procurement) {
      throw new Error('采购需求不存在');
    }

    if (procurement.status !== 'BIDDING') {
      throw new Error('竞价已结束');
    }

    if (!round) {
      throw new Error('竞价轮次不存在');
    }

    if (round.status !== 'ACTIVE') {
      throw new Error('当前轮次已结束');
    }

    const now = new Date();
    if (now > new Date(round.endTime)) {
      throw new Error('竞价时间已截止');
    }

    const isInvited = procurement.invitedSuppliers.some(s => s.id === supplierId);
    if (!isInvited) {
      throw new Error('您未被邀请参与此竞价');
    }

    const currentLowestPrice = round.lowestPrice?.toNumber() || procurement.startPrice.toNumber();
    
    const minAllowedPrice = currentLowestPrice * (1 - procurement.minPriceDrop);
    if (price >= minAllowedPrice) {
      throw new Error(`报价必须低于当前最低价的 ${(procurement.minPriceDrop * 100).toFixed(0)}%，当前最低价: ${currentLowestPrice.toFixed(2)}元`);
    }

    const priceDropPercent = ((currentLowestPrice - price) / currentLowestPrice) * 100;
    const anonymousName = generateAnonymousName(supplierId);

    const bid = await prisma.$transaction(async (tx) => {
      if (existingBid) {
        await tx.bid.update({
          where: { id: existingBid.id },
          data: {
            status: 'OUTBIDDED',
          },
        });
      }

      const newBid = await tx.bid.create({
        data: {
          procurementId,
          roundId,
          supplierId,
          price,
          status: 'VALID',
          anonymousName,
          priceDropPercent,
        },
      });

      await tx.biddingRound.update({
        where: { id: roundId },
        data: {
          lowestPrice: Math.min(currentLowestPrice, price),
          bidCount: { increment: 1 },
        },
      });

      const allValidBids = await tx.bid.findMany({
        where: {
          procurementId,
          roundId,
          status: 'VALID',
        },
        orderBy: { price: 'asc' },
      });

      const rankUpdates = allValidBids.map((bid, index) => 
        tx.bid.update({
          where: { id: bid.id },
          data: { rank: index + 1 },
        })
      );
      await Promise.all(rankUpdates);

      return newBid;
    });

    await this.updateBiddingCache(procurementId);
    this.broadcastBidUpdate(procurementId);

    await auditLogService.log({
      userId: supplierId,
      action: 'BID_SUBMITTED',
      resource: 'Bid',
      resourceId: bid.id,
      details: `供应商 ${supplierId} 在项目 ${procurementId} 提交报价 ${price} 元`,
    });

    return toBid(bid);
  }

  async getRealTimeData(procurementId: string): Promise<BiddingRealTimeData> {
    const cacheKey = this.getBiddingCacheKey(procurementId);
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const data = await this.fetchRealTimeData(procurementId);
    await redis.set(cacheKey, JSON.stringify(data), 2);

    return data;
  }

  private async fetchRealTimeData(procurementId: string): Promise<BiddingRealTimeData> {
    const [procurement, rounds, bids] = await Promise.all([
      prisma.procurementRequest.findUnique({
        where: { id: procurementId },
      }),
      prisma.biddingRound.findMany({
        where: { procurementId },
        orderBy: { roundNumber: 'asc' },
      }),
      prisma.bid.findMany({
        where: {
          procurementId,
          status: 'VALID',
        },
        orderBy: { price: 'asc' },
        include: {
          round: true,
        },
      }),
    ]);

    if (!procurement) {
      throw new Error('采购需求不存在');
    }

    const currentRound = rounds.find(r => r.status === 'ACTIVE') || rounds[rounds.length - 1];
    const currentLowestPrice = currentRound?.lowestPrice?.toNumber() || procurement.startPrice.toNumber();
    
    const activeRoundBids = bids
      .filter(b => b.roundId === currentRound?.id)
      .sort((a, b) => a.price.toNumber() - b.price.toNumber());

    const anonymousRanking = activeRoundBids.map((bid, index) => ({
      rank: index + 1,
      anonymousName: bid.anonymousName,
      price: bid.price.toNumber(),
    }));

    const now = Date.now();
    const endTime = new Date(currentRound?.endTime || Date.now()).getTime();
    const timeRemaining = Math.max(0, endTime - now);

    return {
      procurementId,
      currentRound: {
        id: currentRound?.id || '',
        procurementId,
        roundNumber: currentRound?.roundNumber || 1,
        startTime: currentRound?.startTime.toISOString() || '',
        endTime: currentRound?.endTime.toISOString() || '',
        status: (currentRound?.status as BiddingRoundStatus) || 'ENDED',
        lowestPrice: currentLowestPrice,
        bidCount: currentRound?.bidCount || 0,
      },
      lowestPrice: currentLowestPrice,
      bidCount: activeRoundBids.length,
      anonymousRanking,
      timeRemaining,
    };
  }

  private async updateBiddingCache(procurementId: string): Promise<void> {
    const data = await this.fetchRealTimeData(procurementId);
    const cacheKey = this.getBiddingCacheKey(procurementId);
    await redis.set(cacheKey, JSON.stringify(data), 5);
  }

  private broadcastBidUpdate(procurementId: string): void {
    if (this.io) {
      this.io.to(`bidding:${procurementId}`).emit('bid:update', { procurementId });
    }
  }

  async startNextRound(procurementId: string): Promise<void> {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: procurementId },
      include: { biddingRounds: true },
    });

    if (!procurement) {
      throw new Error('采购需求不存在');
    }

    const currentRoundNumber = procurement.currentRoundNumber;
    const currentRound = procurement.biddingRounds.find(r => r.roundNumber === currentRoundNumber);

    if (currentRound) {
      await prisma.biddingRound.update({
        where: { id: currentRound.id },
        data: { status: 'ENDED' },
      });
    }

    const validBids = await prisma.bid.count({
      where: {
        procurementId,
        roundId: currentRound?.id,
        status: 'VALID',
      },
    });

    let consecutiveNoBidRounds = procurement.consecutiveNoBidRounds;
    if (validBids === 0) {
      consecutiveNoBidRounds++;
    } else {
      consecutiveNoBidRounds = 0;
    }

    if (
      currentRoundNumber >= procurement.maxRounds ||
      consecutiveNoBidRounds >= BIDDING_RULES.MAX_CONSECUTIVE_NO_BID_ROUNDS ||
      new Date() >= new Date(procurement.deadline)
    ) {
      await this.endBidding(procurementId);
      return;
    }

    const nextRoundNumber = currentRoundNumber + 1;
    const now = new Date();
    const endTime = new Date(now.getTime() + BIDDING_RULES.ROUND_DURATION_MINUTES * 60 * 1000);

    await prisma.$transaction([
      prisma.biddingRound.create({
        data: {
          procurementId,
          roundNumber: nextRoundNumber,
          startTime: now,
          endTime,
          status: 'ACTIVE',
          lowestPrice: currentRound?.lowestPrice,
        },
      }),
      prisma.procurementRequest.update({
        where: { id: procurementId },
        data: {
          currentRoundNumber: nextRoundNumber,
          consecutiveNoBidRounds,
        },
      }),
    ]);

    this.broadcastBidUpdate(procurementId);

    await notificationService.sendBiddingAlert(
      procurement.title,
      `第 ${nextRoundNumber} 轮竞价开始`,
      `当前最低价: ${currentRound?.lowestPrice?.toNumber() || procurement.startPrice.toNumber()}元，请尽快报价`
    );

    this.scheduleRoundEnd(procurementId, endTime);
  }

  private async endBidding(procurementId: string): Promise<void> {
    const procurement = await prisma.procurementRequest.update({
      where: { id: procurementId },
      data: {
        status: 'EVALUATING',
        biddingEndedAt: new Date(),
      },
      include: {
        bids: {
          where: { status: 'VALID' },
          orderBy: { timestamp: 'desc' },
          include: { supplier: true },
        },
      },
    });

    this.clearRoundEndTimer(procurementId);
    this.broadcastBidUpdate(procurementId);

    await notificationService.sendBiddingAlert(
      procurement.title,
      '竞价结束',
      `共收到 ${procurement.bids.length} 次有效报价，进入评标阶段`
    );

    const { evaluationService } = await import('./EvaluationService');
    await evaluationService.calculateScores(procurementId);
  }

  private scheduleRoundEnd(procurementId: string, endTime: Date): void {
    this.clearRoundEndTimer(procurementId);

    const delay = endTime.getTime() - Date.now();
    const timer = setTimeout(async () => {
      try {
        await this.startNextRound(procurementId);
      } catch (error) {
        console.error('Round end scheduler error:', error);
        await notificationService.sendAlert(
          '竞价轮次结束异常',
          `项目 ${procurementId} 轮次结束处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
          'critical'
        );
      }
    }, delay);

    this.activeBiddings.set(procurementId, {
      roundEndTimer: timer,
      currentLowestPrice: 0,
      bidCount: 0,
    });
  }

  private clearRoundEndTimer(procurementId: string): void {
    const bidding = this.activeBiddings.get(procurementId);
    if (bidding?.roundEndTimer) {
      clearTimeout(bidding.roundEndTimer);
    }
    this.activeBiddings.delete(procurementId);
  }

  initializeActiveBiddings(): void {
    prisma.biddingRound.findMany({
      where: { status: 'ACTIVE' },
      include: { procurement: true },
    }).then(rounds => {
      rounds.forEach(round => {
        if (round.procurement.status === 'BIDDING') {
          this.scheduleRoundEnd(round.procurementId, round.endTime);
        }
      });
      console.log(`Initialized ${rounds.length} active bidding rounds`);
    }).catch(error => {
      console.error('Failed to initialize active biddings:', error);
    });
  }

  getSupplierAnonymousName(supplierId: string): string {
    return generateAnonymousName(supplierId);
  }

  shutdown(): void {
    this.activeBiddings.forEach((bidding) => {
      if (bidding.roundEndTimer) {
        clearTimeout(bidding.roundEndTimer);
      }
    });
    this.activeBiddings.clear();
  }
}

export const biddingEngineService = new BiddingEngineService();
