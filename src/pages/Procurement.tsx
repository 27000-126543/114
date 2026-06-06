import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Gavel, 
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  X
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface ProcurementRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  startingPrice: number;
  deadline: string;
  status: string;
  invitedSuppliers: string;
  createdAt: string;
  createdBy: string;
  currentRound?: number;
  totalRounds?: number;
}

const Procurement = () => {
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedProcurement, setSelectedProcurement] = useState<ProcurementRequest | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invitedSuppliers, setInvitedSuppliers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '服务器',
    budget: '',
    startingPrice: '',
    deadline: '',
    items: '[]',
  });

  useEffect(() => {
    fetchProcurements();
    fetchSuppliers();
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
            deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
            status: 'BIDDING',
            invitedSuppliers: '["华为","联想","戴尔","惠普"]',
            createdAt: new Date().toISOString(),
            createdBy: user?.id || '',
            currentRound: 2,
            totalRounds: 5,
          },
          {
            id: '2',
            title: '办公设备更新项目',
            description: '采购办公电脑100台，打印机20台',
            category: '办公设备',
            budget: 800000,
            startingPrice: 800000,
            deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
            status: 'PENDING_APPROVAL',
            invitedSuppliers: '["联想","戴尔","惠普"]',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            createdBy: user?.id || '',
          },
          {
            id: '3',
            title: '网络设备升级项目',
            description: '核心交换机、路由器、防火墙采购',
            category: '网络设备',
            budget: 1200000,
            startingPrice: 1200000,
            deadline: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: 'COMPLETED',
            invitedSuppliers: '["华为","中兴","新华三","思科"]',
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            createdBy: user?.id || '',
          },
          {
            id: '4',
            title: '软件开发服务项目',
            description: '企业管理系统定制开发服务',
            category: '软件服务',
            budget: 3000000,
            startingPrice: 3000000,
            deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
            status: 'DRAFT',
            invitedSuppliers: '[]',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            createdBy: user?.id || '',
          },
        ];
      }
      
      setProcurements(items);
    } catch (error) {
      console.error('Failed to fetch procurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?page=1&pageSize=100&status=ACTIVE');
      const items = response.data.data?.items || [];
      
      if (items.length === 0) {
        const mockSuppliers = [
          { id: '1', name: '华为技术有限公司', category: '服务器,网络设备', level: 'STRATEGIC', rating: 95 },
          { id: '2', name: '中兴通讯股份有限公司', category: '网络设备', level: 'GOLD', rating: 92 },
          { id: '3', name: '联想集团有限公司', category: '服务器,办公设备', level: 'GOLD', rating: 90 },
          { id: '4', name: '戴尔(中国)有限公司', category: '服务器,办公设备', level: 'SILVER', rating: 88 },
          { id: '5', name: '惠普(中国)有限公司', category: '服务器,办公设备', level: 'SILVER', rating: 87 },
          { id: '6', name: '新华三技术有限公司', category: '网络设备', level: 'GOLD', rating: 91 },
          { id: '7', name: '思科系统(中国)网络技术有限公司', category: '网络设备', level: 'STRATEGIC', rating: 93 },
          { id: '8', name: '浪潮电子信息产业股份有限公司', category: '服务器', level: 'GOLD', rating: 89 },
          { id: '9', name: '曙光信息产业股份有限公司', category: '服务器', level: 'SILVER', rating: 86 },
          { id: '10', name: '宝德科技集团股份有限公司', category: '服务器', level: 'BRONZE', rating: 84 },
        ];
        setSuppliers(mockSuppliers);
      } else {
        setSuppliers(items);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.budget || !formData.startingPrice || !formData.deadline) {
      alert('请填写所有必填字段');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/procurement', {
        ...formData,
        budget: parseFloat(formData.budget),
        startingPrice: parseFloat(formData.startingPrice),
        invitedSupplierIds: invitedSuppliers,
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          category: '服务器',
          budget: '',
          startingPrice: '',
          deadline: '',
          items: '[]',
        });
        setInvitedSuppliers([]);
        fetchProcurements();
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        // Mock creation
        const newProcurement: ProcurementRequest = {
          id: Date.now().toString(),
          title: formData.title,
          description: formData.description,
          category: formData.category,
          budget: parseFloat(formData.budget),
          startingPrice: parseFloat(formData.startingPrice),
          deadline: formData.deadline,
          status: 'DRAFT',
          invitedSuppliers: JSON.stringify(invitedSuppliers),
          createdAt: new Date().toISOString(),
          createdBy: user?.id || '',
        };
        setProcurements([newProcurement, ...procurements]);
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          category: '服务器',
          budget: '',
          startingPrice: '',
          deadline: '',
          items: '[]',
        });
        setInvitedSuppliers([]);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleAutoFilter = async () => {
    try {
      const response = await api.post('/procurement/filter-suppliers', {
        category: formData.category,
        budget: parseFloat(formData.budget),
      });
      
      if (response.data.data?.supplierIds) {
        setInvitedSuppliers(response.data.data.supplierIds);
      } else {
        const categoryMap: Record<string, string[]> = {
          '服务器': ['1', '3', '4', '5', '8', '9', '10'],
          '网络设备': ['1', '2', '6', '7'],
          '办公设备': ['3', '4', '5'],
          '软件服务': ['1', '3'],
        };
        setInvitedSuppliers(categoryMap[formData.category] || []);
      }
    } catch (error) {
      const categoryMap: Record<string, string[]> = {
        '服务器': ['1', '3', '4', '5', '8', '9', '10'],
        '网络设备': ['1', '2', '6', '7'],
        '办公设备': ['3', '4', '5'],
        '软件服务': ['1', '3'],
      };
      setInvitedSuppliers(categoryMap[formData.category] || []);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/procurement/${id}/publish`);
      fetchProcurements();
    } catch (error) {
      const updated = procurements.map(p => 
        p.id === id ? { ...p, status: 'BIDDING', currentRound: 1, totalRounds: 5 } : p
      );
      setProcurements(updated);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-600', icon: Clock },
      PUBLISHED: { label: '已发布', color: 'bg-blue-100 text-blue-600', icon: Eye },
      BIDDING: { label: '竞价中', color: 'bg-orange-100 text-orange-600', icon: Gavel },
      EVALUATING: { label: '评标中', color: 'bg-purple-100 text-purple-600', icon: Users },
      PENDING_APPROVAL: { label: '待审批', color: 'bg-yellow-100 text-yellow-600', icon: AlertCircle },
      APPROVED: { label: '已批准', color: 'bg-green-100 text-green-600', icon: CheckCircle },
      REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-600', icon: XCircle },
      COMPLETED: { label: '已完成', color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
      CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-600', icon: XCircle },
    };
    const badge = badges[status] || badges.DRAFT;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} />
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
          <h2 className="text-2xl font-bold text-gray-800">采购需求管理</h2>
          <p className="text-gray-500 mt-1">管理所有采购项目和竞价需求</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={20} />
          创建采购需求
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索采购项目..."
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
              className="pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none cursor-pointer"
            >
              <option value="all">全部状态</option>
              <option value="DRAFT">草稿</option>
              <option value="PUBLISHED">已发布</option>
              <option value="BIDDING">竞价中</option>
              <option value="EVALUATING">评标中</option>
              <option value="PENDING_APPROVAL">待审批</option>
              <option value="APPROVED">已批准</option>
              <option value="COMPLETED">已完成</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">项目信息</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">品类</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">预算</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">供应商</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProcurements.map((procurement) => {
                const suppliers = JSON.parse(procurement.invitedSuppliers || '[]');
                return (
                  <tr key={procurement.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{procurement.title}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{procurement.description}</p>
                        {procurement.currentRound && (
                          <p className="text-xs text-blue-500 mt-1">
                            第 {procurement.currentRound}/{procurement.totalRounds} 轮竞价
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm">
                        {procurement.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <DollarSign size={16} className="text-green-500" />
                        <span className="font-medium text-gray-800">{formatCurrency(procurement.budget)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        起拍价: {formatCurrency(procurement.startingPrice)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users size={16} className="text-gray-400" />
                        <span className="text-gray-800">{suppliers.length} 家</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(procurement.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/procurement/${procurement.id}`}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </Link>
                        {procurement.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublish(procurement.id)}
                            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                            title="发布"
                          >
                            <Gavel size={18} />
                          </button>
                        )}
                        {procurement.status === 'BIDDING' && (
                          <Link
                            to={`/bidding/${procurement.id}`}
                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="进入竞价大厅"
                          >
                            <Gavel size={18} />
                          </Link>
                        )}
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProcurements.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500">没有找到匹配的采购项目</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">创建采购需求</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目名称 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="请输入项目名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 resize-none"
                  placeholder="请输入项目详细描述"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品品类 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  >
                    <option value="服务器">服务器</option>
                    <option value="网络设备">网络设备</option>
                    <option value="办公设备">办公设备</option>
                    <option value="软件服务">软件服务</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">竞价截止时间 *</label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">预算金额 (元) *</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    placeholder="请输入预算金额"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">起拍价 (元) *</label>
                  <input
                    type="number"
                    value={formData.startingPrice}
                    onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    placeholder="请输入起拍价"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">邀请供应商</label>
                  <button
                    onClick={handleAutoFilter}
                    type="button"
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    智能筛选
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 max-h-48 overflow-y-auto">
                  {suppliers.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">暂无可用供应商</p>
                  ) : (
                    <div className="space-y-2">
                      {suppliers.map((supplier) => (
                        <label
                          key={supplier.id}
                          className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={invitedSuppliers.includes(supplier.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInvitedSuppliers([...invitedSuppliers, supplier.id]);
                              } else {
                                setInvitedSuppliers(invitedSuppliers.filter(id => id !== supplier.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{supplier.name}</p>
                            <p className="text-xs text-gray-500">
                              {supplier.category} · {supplier.level} · {supplier.rating}分
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  已选择 {invitedSuppliers.length} 家供应商
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {creating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                创建需求
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procurement;
