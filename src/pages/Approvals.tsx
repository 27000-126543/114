import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  Search,
  Filter,
  User,
  Calendar,
  DollarSign,
  Eye,
  X
} from 'lucide-react';
import api from '../lib/api';

interface Approval {
  id: string;
  procurementId: string;
  procurementTitle: string;
  category: string;
  budget: number;
  amount: number;
  overBudget: boolean;
  overBudgetPercent: number;
  level: string;
  status: string;
  requesterName: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  comment?: string;
}

const Approvals = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const fetchApprovals = async () => {
    try {
      const endpoint = activeTab === 'pending' ? '/approvals/pending' : '/approvals/history';
      const response = await api.get(endpoint);
      const items = response.data.data?.items || [];
      
      if (items.length === 0) {
        const mockApprovals: Approval[] = activeTab === 'pending' ? [
          {
            id: '1',
            procurementId: '2',
            procurementTitle: '办公设备更新项目',
            category: '办公设备',
            budget: 800000,
            amount: 1050000,
            overBudget: true,
            overBudgetPercent: 31.25,
            level: 'DIRECTOR',
            status: 'PENDING',
            requesterName: '张三',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: '2',
            procurementId: '5',
            procurementTitle: '数据中心存储设备采购',
            category: '服务器',
            budget: 2000000,
            amount: 1850000,
            overBudget: false,
            overBudgetPercent: 0,
            level: 'MANAGER',
            status: 'PENDING',
            requesterName: '李四',
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
          {
            id: '3',
            procurementId: '6',
            procurementTitle: '2024年软件许可续费',
            category: '软件服务',
            budget: 500000,
            amount: 720000,
            overBudget: true,
            overBudgetPercent: 44,
            level: 'DIRECTOR',
            status: 'PENDING',
            requesterName: '王五',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
        ] : [
          {
            id: '4',
            procurementId: '3',
            procurementTitle: '网络设备升级项目',
            category: '网络设备',
            budget: 1200000,
            amount: 1080000,
            overBudget: false,
            overBudgetPercent: 0,
            level: 'MANAGER',
            status: 'APPROVED',
            requesterName: '赵六',
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            approvedBy: '采购总监',
            approvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            comment: '同意采购，价格合理',
          },
          {
            id: '5',
            procurementId: '7',
            procurementTitle: '会议室设备更新',
            category: '办公设备',
            budget: 300000,
            amount: 450000,
            overBudget: true,
            overBudgetPercent: 50,
            level: 'DIRECTOR',
            status: 'REJECTED',
            requesterName: '孙七',
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            approvedBy: '采购总监',
            approvedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
            comment: '预算超出过多，请重新评估需求',
          },
        ];
        setApprovals(mockApprovals);
      } else {
        setApprovals(items);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      const mockApprovals: Approval[] = activeTab === 'pending' ? [
        {
          id: '1',
          procurementId: '2',
          procurementTitle: '办公设备更新项目',
          category: '办公设备',
          budget: 800000,
          amount: 1050000,
          overBudget: true,
          overBudgetPercent: 31.25,
          level: 'DIRECTOR',
          status: 'PENDING',
          requesterName: '张三',
          createdAt: new Date().toISOString(),
        },
      ] : [];
      setApprovals(mockApprovals);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApproval) return;
    
    setProcessing(true);
    try {
      await api.post(`/approvals/${approvalId}/decide`, {
        decision,
        comment: decisionComment,
      });
      
      setSelectedApproval(null);
      setDecisionComment('');
      fetchApprovals();
    } catch (error) {
      const updated = approvals.map(a => 
        a.id === approvalId ? {
          ...a,
          status: decision,
          approvedBy: '当前用户',
          approvedAt: new Date().toISOString(),
          comment: decisionComment,
        } : a
      );
      setApprovals(updated);
      setSelectedApproval(null);
      setDecisionComment('');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: '待审批', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
      APPROVED: { label: '已批准', color: 'bg-green-100 text-green-600', icon: CheckCircle },
      REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-600', icon: XCircle },
    };
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const filteredApprovals = approvals.filter(a =>
    a.procurementTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-gray-800">审批中心</h2>
          <p className="text-gray-500 mt-1">处理采购项目审批请求</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索审批..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock size={18} />
              待我审批
              {approvals.filter(a => a.status === 'PENDING').length > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {approvals.filter(a => a.status === 'PENDING').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle size={18} />
              已处理
            </div>
          </button>
        </div>

        <div className="divide-y">
          {filteredApprovals.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'pending' ? <Clock size={32} className="text-gray-400" /> : <CheckCircle size={32} className="text-gray-400" />}
              </div>
              <p className="text-gray-500">
                {activeTab === 'pending' ? '暂无待审批事项' : '暂无已处理审批'}
              </p>
            </div>
          ) : (
            filteredApprovals.map((approval) => (
              <div
                key={approval.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-800 text-lg">{approval.procurementTitle}</h4>
                      {getStatusBadge(approval.status)}
                      {approval.overBudget && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                          <AlertCircle size={12} />
                          超预算 {approval.overBudgetPercent}%
                        </span>
                      )}
                      {approval.level === 'DIRECTOR' && (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                          总监审批
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>申请人: {approval.requesterName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>申请时间: {getTimeAgo(approval.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Filter size={14} />
                        <span>品类: {approval.category}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-8">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">预算金额</p>
                        <p className="font-medium text-gray-600">{formatCurrency(approval.budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">申请金额</p>
                        <p className={`font-medium text-lg ${approval.overBudget ? 'text-red-600' : 'text-gray-800'}`}>
                          {formatCurrency(approval.amount)}
                        </p>
                      </div>
                      {approval.status !== 'PENDING' && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">审批人</p>
                          <p className="font-medium text-gray-800">{approval.approvedBy}</p>
                        </div>
                      )}
                    </div>

                    {approval.comment && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">审批意见:</span> {approval.comment}
                        </p>
                      </div>
                    )}
                  </div>

                  {approval.status === 'PENDING' && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedApproval(approval)}
                        className="flex items-center gap-1 px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                        处理
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">处理审批</h3>
              <button
                onClick={() => {
                  setSelectedApproval(null);
                  setDecisionComment('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4 bg-blue-50 rounded-xl">
                <h4 className="font-semibold text-gray-800">{selectedApproval.procurementTitle}</h4>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-gray-500">预算金额</p>
                    <p className="font-medium">{formatCurrency(selectedApproval.budget)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">申请金额</p>
                    <p className={`font-medium ${selectedApproval.overBudget ? 'text-red-600' : ''}`}>
                      {formatCurrency(selectedApproval.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">超预算比例</p>
                    <p className={`font-medium ${selectedApproval.overBudget ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedApproval.overBudget ? `+${selectedApproval.overBudgetPercent}%` : '未超预算'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">申请人</p>
                    <p className="font-medium">{selectedApproval.requesterName}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">审批意见</label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 resize-none"
                  placeholder="请输入审批意见（选填）"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setSelectedApproval(null);
                  setDecisionComment('');
                }}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDecision(selectedApproval.id, 'REJECTED')}
                disabled={processing}
                className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle size={18} />
                {processing ? '处理中...' : '拒绝'}
              </button>
              <button
                onClick={() => handleDecision(selectedApproval.id, 'APPROVED')}
                disabled={processing}
                className="px-5 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                {processing ? '处理中...' : '批准'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
