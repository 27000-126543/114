import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Clock, Users, Search, Filter, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface Procurement {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  startingPrice: number;
  currentRound: number;
  totalRounds: number;
  status: string;
  deadline: string;
  invitedSuppliers: string;
}

const BiddingList = () => {
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProcurements();
  }, []);

  const fetchProcurements = async () => {
    try {
      const response = await api.get('/procurement?page=1&pageSize=100');
      let items = response.data.data?.items || [];
      
      if (items.length === 0) {
        items = [
          {
            id: '1',
            title: '2024年服务器采购项目',
            description: '采购高性能计算服务器50台，用于数据中心扩容',
            category: '服务器',
            budget: 5000000,
            startingPrice: 5000000,
            currentRound: 2,
            totalRounds: 5,
            status: 'BIDDING',
            deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
            invitedSuppliers: '["华为","联想","戴尔","惠普","浪潮"]',
          },
          {
            id: '2',
            title: '办公设备更新项目',
            description: '采购办公电脑100台，打印机20台',
            category: '办公设备',
            budget: 800000,
            startingPrice: 800000,
            currentRound: 1,
            totalRounds: 5,
            status: 'BIDDING',
            deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
            invitedSuppliers: '["联想","戴尔","惠普"]',
          },
          {
            id: '3',
            title: '网络设备升级项目',
            description: '核心交换机、路由器、防火墙采购',
            category: '网络设备',
            budget: 1200000,
            startingPrice: 1200000,
            currentRound: 5,
            totalRounds: 5,
            status: 'EVALUATING',
            deadline: new Date(Date.now() - 86400000 * 2).toISOString(),
            invitedSuppliers: '["华为","中兴","新华三","思科"]',
          },
        ];
      }
      
      setProcurements(items.filter((p: any) => 
        p.status === 'BIDDING' || p.status === 'PUBLISHED' || p.status === 'EVALUATING'
      ));
    } catch (error) {
      console.error('Failed to fetch procurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
  };

  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return '已截止';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}天${hours}小时`;
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}小时${minutes}分钟`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      PUBLISHED: { label: '已发布', color: 'bg-blue-100 text-blue-600' },
      BIDDING: { label: '竞价中', color: 'bg-orange-100 text-orange-600' },
      EVALUATING: { label: '评标中', color: 'bg-purple-100 text-purple-600' },
    };
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const filteredProcurements = procurements.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">竞价大厅</h2>
          <p className="text-gray-500 mt-1">查看和参与正在进行的竞价项目</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索竞价项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none cursor-pointer w-full sm:w-48"
            >
              <option value="all">全部状态</option>
              <option value="PUBLISHED">已发布</option>
              <option value="BIDDING">竞价中</option>
              <option value="EVALUATING">评标中</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredProcurements.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gavel size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500">暂无进行中的竞价项目</p>
          </div>
        ) : (
          filteredProcurements.map((procurement) => {
            const suppliers = JSON.parse(procurement.invitedSuppliers || '[]');
            const isUrgent = getTimeRemaining(procurement.deadline).includes('小时') && 
                            !getTimeRemaining(procurement.deadline).includes('天');
            
            return (
              <div
                key={procurement.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-blue-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{procurement.title}</h3>
                      {getStatusBadge(procurement.status)}
                      {isUrgent && procurement.status === 'BIDDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                          <AlertCircle size={12} />
                          即将截止
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{procurement.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-sm">
                          {procurement.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Gavel size={14} />
                        <span>第 {procurement.currentRound}/{procurement.totalRounds} 轮</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Users size={14} />
                        <span>{suppliers.length} 家供应商</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Clock size={14} />
                        <span>{getTimeRemaining(procurement.deadline)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">起拍价:</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(procurement.startingPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">预算:</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(procurement.budget)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    to={`/bidding/${procurement.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    进入竞价
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BiddingList;
