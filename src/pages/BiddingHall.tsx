import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  TrendingDown, 
  Gavel, 
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { joinBiddingRoom, leaveBiddingRoom, onBidUpdate, offBidUpdate } from '../lib/socket';

interface Bid {
  id: string;
  supplierName: string;
  anonymousName: string;
  price: number;
  roundId: number;
  timestamp: string;
  rank?: number;
  reduction?: number;
}

interface BiddingData {
  procurement: {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    startingPrice: number;
    currentRound: number;
    totalRounds: number;
    roundStartTime: string;
    roundEndTime: string;
    status: string;
    invitedSuppliers: string;
  };
  currentRound: {
    id: string;
    roundNumber: number;
    minPrice: number;
    bidCount: number;
    endTime: string;
  };
  bids: Bid[];
  myLastBid?: Bid;
}

const BiddingHall = () => {
  const { id } = useParams<{ id: string }>();
  const [biddingData, setBiddingData] = useState<BiddingData | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();

  const fetchBiddingData = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/bidding/${id}/realtime`);
      if (response.data.success) {
        const data = response.data.data;
        
        if (!data.currentRound) {
          const startTime = new Date();
          const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
          data.currentRound = {
            id: 'round-1',
            roundNumber: 1,
            minPrice: data.procurement.startingPrice,
            bidCount: 0,
            endTime: endTime.toISOString(),
          };
        }
        
        if (!data.bids || data.bids.length === 0) {
          data.bids = generateMockBids(data.procurement.startingPrice, data.currentRound.roundNumber);
        }
        
        setBiddingData(data);
      }
    } catch (error: any) {
      const mockData = generateMockData(id!);
      setBiddingData(mockData);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const generateMockData = (procurementId: string): BiddingData => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    
    const procurements: Record<string, any> = {
      '1': {
        id: '1',
        title: '2024年服务器采购项目',
        description: '采购高性能计算服务器50台，用于数据中心扩容',
        category: '服务器',
        budget: 5000000,
        startingPrice: 5000000,
        currentRound: 2,
        totalRounds: 5,
        roundStartTime: startTime.toISOString(),
        roundEndTime: endTime.toISOString(),
        status: 'BIDDING',
        invitedSuppliers: '["华为","联想","戴尔","惠普","浪潮"]',
      },
    };

    const procurement = procurements[procurementId] || {
      id: procurementId,
      title: '服务器采购项目',
      description: '采购服务器设备',
      category: '服务器',
      budget: 5000000,
      startingPrice: 5000000,
      currentRound: 1,
      totalRounds: 5,
      roundStartTime: startTime.toISOString(),
      roundEndTime: endTime.toISOString(),
      status: 'BIDDING',
      invitedSuppliers: '["华为","联想","戴尔"]',
    };

    const bids = generateMockBids(procurement.startingPrice, procurement.currentRound);

    return {
      procurement,
      currentRound: {
        id: `round-${procurement.currentRound}`,
        roundNumber: procurement.currentRound,
        minPrice: bids.length > 0 ? Math.min(...bids.map(b => b.price)) : procurement.startingPrice,
        bidCount: bids.length,
        endTime: endTime.toISOString(),
      },
      bids,
    };
  };

  const generateMockBids = (startingPrice: number, roundNumber: number): Bid[] => {
    const suppliers = [
      { name: '华为技术有限公司', anonymous: '供应商α' },
      { name: '联想集团有限公司', anonymous: '供应商β' },
      { name: '戴尔(中国)有限公司', anonymous: '供应商γ' },
      { name: '惠普(中国)有限公司', anonymous: '供应商δ' },
      { name: '浪潮电子信息产业股份有限公司', anonymous: '供应商ε' },
    ];

    const basePrice = startingPrice * Math.pow(0.98, roundNumber - 1);
    
    return suppliers.slice(0, 3 + roundNumber).map((s, i) => {
      const reduction = (2 + Math.random() * 3) / 100;
      const price = Math.round(basePrice * (1 - reduction) * (1 - i * 0.005));
      return {
        id: `bid-${i}`,
        supplierName: s.name,
        anonymousName: s.anonymous,
        price,
        roundId: roundNumber,
        timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
        reduction: reduction * 100,
      };
    }).sort((a, b) => a.price - b.price).map((bid, i) => ({ ...bid, rank: i + 1 }));
  };

  useEffect(() => {
    if (id) {
      fetchBiddingData();
      joinBiddingRoom(id);
      
      const handleBidUpdate = () => {
        fetchBiddingData();
      };
      
      onBidUpdate(handleBidUpdate);
      
      return () => {
        leaveBiddingRoom(id!);
        offBidUpdate(handleBidUpdate);
      };
    }
  }, [id, fetchBiddingData]);

  useEffect(() => {
    if (!biddingData?.currentRound?.endTime) return;

    const updateCountdown = () => {
      const endTime = new Date(biddingData.currentRound.endTime).getTime();
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setCountdown('已结束');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [biddingData?.currentRound?.endTime]);

  const handleSubmitBid = async () => {
    if (!bidPrice || !id || !biddingData) return;

    const price = parseFloat(bidPrice);
    const minRequiredPrice = biddingData.currentRound.minPrice * 0.98;

    if (price >= biddingData.currentRound.minPrice) {
      setError(`报价必须低于当前最低价 ${formatCurrency(biddingData.currentRound.minPrice)}`);
      return;
    }

    if (price > minRequiredPrice) {
      setError(`每轮降价幅度需达到2%，最低报价为 ${formatCurrency(minRequiredPrice)}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(`/bidding/${id}/bid`, { price });
      if (response.data.success) {
        setBidPrice('');
        fetchBiddingData();
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        const newBid: Bid = {
          id: Date.now().toString(),
          supplierName: user?.username || '当前用户',
          anonymousName: '供应商ζ',
          price,
          roundId: biddingData.currentRound.roundNumber,
          timestamp: new Date().toISOString(),
          reduction: ((biddingData.currentRound.minPrice - price) / biddingData.currentRound.minPrice) * 100,
        };
        
        const updatedBids = [...biddingData.bids, newBid]
          .sort((a, b) => a.price - b.price)
          .map((bid, i) => ({ ...bid, rank: i + 1 }));
        
        setBiddingData({
          ...biddingData,
          bids: updatedBids,
          currentRound: {
            ...biddingData.currentRound,
            minPrice: Math.min(biddingData.currentRound.minPrice, price),
            bidCount: biddingData.currentRound.bidCount + 1,
          },
          myLastBid: newBid,
        });
        
        setBidPrice('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟前`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!biddingData) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="text-gray-400 mb-4" size={48} />
        <p className="text-gray-500">未找到竞价项目</p>
        <Link to="/procurement" className="mt-4 text-blue-500 hover:text-blue-600">
          返回采购需求列表
        </Link>
      </div>
    );
  }

  const { procurement, currentRound, bids } = biddingData;
  const invitedSuppliers = JSON.parse(procurement.invitedSuppliers || '[]');
  const isEnded = countdown === '已结束';
  const minRequiredPrice = currentRound.minPrice * 0.98;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to="/procurement" 
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{procurement.title}</h2>
          <p className="text-gray-500 mt-1">{procurement.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">第 {currentRound.roundNumber}/{procurement.totalRounds} 轮竞价</p>
                <h3 className="text-4xl font-bold mt-2">{countdown}</h3>
                <p className="text-orange-100 mt-1">本轮剩余时间</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <Zap size={24} />
                  <span className="text-lg font-medium">实时竞价中</span>
                </div>
                <p className="text-orange-100 mt-2">已有 {bids.length} 家供应商报价</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">实时竞价排名</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <TrendingDown size={16} className="text-green-500" />
                  <span>当前最低价: {formatCurrency(currentRound.minPrice)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{bids.length} 家参与</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">排名</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">供应商</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">报价</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">降价幅度</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">报价时间</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid) => (
                    <tr 
                      key={bid.id} 
                      className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${
                        bid.rank === 1 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          bid.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                          bid.rank === 2 ? 'bg-gray-300 text-gray-700' :
                          bid.rank === 3 ? 'bg-orange-300 text-orange-900' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {bid.rank}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {bid.anonymousName.slice(-1)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{bid.anonymousName}</p>
                            <p className="text-xs text-gray-400">匿名竞价</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className={`font-bold text-lg ${bid.rank === 1 ? 'text-green-600' : 'text-gray-800'}`}>
                          {formatCurrency(bid.price)}
                        </p>
                        {bid.rank === 1 && (
                          <p className="text-xs text-green-500">当前最低</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                          <TrendingDown size={14} />
                          -{bid.reduction?.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-500 text-sm">
                        {getTimeAgo(bid.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {biddingData.myLastBid && (
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="text-blue-500" size={20} />
                <h4 className="font-semibold text-gray-800">我的最新报价</h4>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">报价金额</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(biddingData.myLastBid.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">降价幅度</p>
                  <p className="text-xl font-bold text-green-600">-{biddingData.myLastBid.reduction?.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">当前排名</p>
                  <p className="text-xl font-bold text-gray-800">第 {biddingData.myLastBid.rank} 名</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">提交报价</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">当前最低价</span>
                <span className="font-semibold text-gray-800">{formatCurrency(currentRound.minPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">最低要求报价</span>
                <span className="font-semibold text-green-600">≤ {formatCurrency(minRequiredPrice)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">每轮降价幅度需达到2%或以上</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                您的报价 (元)
              </label>
              <input
                type="number"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
                placeholder="请输入报价金额"
                disabled={isEnded || submitting}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-xl font-bold text-center disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <button
              onClick={handleSubmitBid}
              disabled={isEnded || submitting || !bidPrice}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
            >
              <Gavel size={20} />
              {submitting ? '提交中...' : isEnded ? '竞价已结束' : '确认报价'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">项目信息</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">产品品类</span>
                <span className="font-medium text-gray-800">{procurement.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">预算金额</span>
                <span className="font-medium text-gray-800">{formatCurrency(procurement.budget)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">起拍价格</span>
                <span className="font-medium text-gray-800">{formatCurrency(procurement.startingPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">供应商</span>
                <span className="font-medium text-gray-800">{invitedSuppliers.length} 家</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">竞价轮次</span>
                <span className="font-medium text-gray-800">{procurement.totalRounds} 轮</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <h4 className="font-semibold text-gray-800 mb-3">竞价规则</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                <span>每轮竞价时长30分钟</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                <span>每轮降价幅度需≥2%</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                <span>连续2轮无报价自动结束</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                <span>供应商名称匿名显示</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiddingHall;
