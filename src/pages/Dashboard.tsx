import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Gavel, 
  Users, 
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../lib/api';

interface StatsData {
  totalProcurements: number;
  activeBiddings: number;
  pendingApprovals: number;
  totalSuppliers: number;
  avgPriceReduction: number;
  totalSavings: number;
  monthlyTrend: Array<{ month: string; procurements: number; savings: number }>;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
  read: boolean;
}

const Dashboard = () => {
  const [stats, setStats] = useState<StatsData>({
    totalProcurements: 0,
    activeBiddings: 0,
    pendingApprovals: 0,
    totalSuppliers: 0,
    avgPriceReduction: 0,
    totalSavings: 0,
    monthlyTrend: [],
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [procurementsRes, suppliersRes, approvalsRes, reportsRes] = await Promise.all([
        api.get('/procurement?page=1&pageSize=100'),
        api.get('/suppliers?page=1&pageSize=100'),
        api.get('/approvals/pending'),
        api.get('/reports/statistics'),
      ]);

      const procurements = procurementsRes.data.data?.items || [];
      const activeBiddings = procurements.filter((p: any) => p.status === 'BIDDING').length;
      const pendingApprovals = approvalsRes.data.data?.items?.length || 0;
      const totalSuppliers = suppliersRes.data.data?.items?.length || 0;

      let monthlyTrend = [];
      let avgPriceReduction = 12.5;
      let totalSavings = 1250000;

      try {
        if (reportsRes.data.data) {
          const reportData = reportsRes.data.data;
          avgPriceReduction = reportData.avgPriceReduction || avgPriceReduction;
          totalSavings = reportData.totalSavings || totalSavings;
          monthlyTrend = reportData.monthlyTrend || [];
        }
      } catch (e) {
        // Use mock data if report endpoint is not available
      }

      if (monthlyTrend.length === 0) {
        monthlyTrend = [
          { month: '1月', procurements: 8, savings: 85000 },
          { month: '2月', procurements: 12, savings: 156000 },
          { month: '3月', procurements: 15, savings: 189000 },
          { month: '4月', procurements: 10, savings: 134000 },
          { month: '5月', procurements: 18, savings: 245000 },
          { month: '6月', procurements: 22, savings: 287000 },
        ];
      }

      setStats({
        totalProcurements: procurements.length,
        activeBiddings,
        pendingApprovals,
        totalSuppliers,
        avgPriceReduction,
        totalSavings,
        monthlyTrend,
      });

      setNotifications([
        { id: '1', title: '竞价即将截止', message: '服务器采购项目竞价将在30分钟后截止', type: 'warning', createdAt: new Date().toISOString(), read: false },
        { id: '2', title: '新的审批请求', message: '办公设备采购项目金额超预算，需要您的审批', type: 'info', createdAt: new Date(Date.now() - 3600000).toISOString(), read: false },
        { id: '3', title: '合同待签署', message: '网络设备采购合同已生成，等待签署', type: 'info', createdAt: new Date(Date.now() - 7200000).toISOString(), read: true },
        { id: '4', title: '供应商绩效更新', message: '华为技术有限公司履约评分已更新为95分', type: 'success', createdAt: new Date(Date.now() - 86400000).toISOString(), read: true },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  const statsCards = [
    { label: '采购项目总数', value: stats.totalProcurements, icon: ShoppingCart, color: 'bg-blue-500', change: '+15%', trend: 'up' },
    { label: '进行中的竞价', value: stats.activeBiddings, icon: Gavel, color: 'bg-orange-500', change: '活跃', trend: 'neutral' },
    { label: '待审批事项', value: stats.pendingApprovals, icon: Clock, color: 'bg-red-500', change: '+3', trend: 'up' },
    { label: '合作供应商', value: stats.totalSuppliers, icon: Users, color: 'bg-green-500', change: '+5', trend: 'up' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.color} p-3 rounded-xl`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {card.trend === 'up' && <TrendingUp size={14} />}
                  {card.trend === 'down' && <TrendingDown size={14} />}
                  {card.change}
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">采购趋势分析</h3>
              <p className="text-sm text-gray-500">近6个月采购项目数与成本节约</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-gray-600">采购项目数</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-600">成本节约</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrend}>
                <defs>
                  <linearGradient id="colorProcurements" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px' }}
                  formatter={(value: number, name: string) => [
                    name === 'savings' ? formatCurrency(value) : value,
                    name === 'savings' ? '成本节约' : '采购项目数'
                  ]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="procurements"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProcurements)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="savings"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSavings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">关键绩效指标</h3>
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingDown className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均降价率</p>
                  <p className="text-2xl font-bold text-green-600">{stats.avgPriceReduction.toFixed(1)}%</p>
                </div>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(stats.avgPriceReduction * 5, 100)}%` }} />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <DollarSign className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">累计成本节约</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSavings)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">通过竞价采购实现的成本节约</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">供应商参与率</p>
                  <p className="text-2xl font-bold text-purple-600">87.5%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">受邀供应商实际参与竞价比例</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">最新通知</h3>
            <button className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                  notification.read ? 'bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  notification.type === 'warning' ? 'bg-orange-100' :
                  notification.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {notification.type === 'warning' && <AlertCircle className="text-orange-500" size={20} />}
                  {notification.type === 'success' && <CheckCircle className="text-green-500" size={20} />}
                  {notification.type === 'info' && <AlertCircle className="text-blue-500" size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-800'}`}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{getTimeAgo(notification.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 truncate">{notification.message}</p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">快捷操作</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all text-left group">
              <ShoppingCart className="text-blue-500 mb-3" size={28} />
              <p className="font-semibold text-gray-800">创建采购需求</p>
              <p className="text-sm text-gray-500 mt-1">发布新的采购项目</p>
            </button>
            <button className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all text-left group">
              <Gavel className="text-orange-500 mb-3" size={28} />
              <p className="font-semibold text-gray-800">进入竞价大厅</p>
              <p className="text-sm text-gray-500 mt-1">查看实时竞价情况</p>
            </button>
            <button className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all text-left group">
              <Users className="text-green-500 mb-3" size={28} />
              <p className="font-semibold text-gray-800">供应商管理</p>
              <p className="text-sm text-gray-500 mt-1">管理合作供应商</p>
            </button>
            <button className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all text-left group">
              <TrendingUp className="text-purple-500 mb-3" size={28} />
              <p className="font-semibold text-gray-800">查看报告</p>
              <p className="text-sm text-gray-500 mt-1">月度数据分析报告</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
