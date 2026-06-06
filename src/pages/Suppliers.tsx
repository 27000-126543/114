import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  TrendingUp, 
  Building2,
  ChevronDown,
  Eye,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import api from '../lib/api';

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  category: string;
  level: string;
  status: string;
  rating: number;
  performanceScore: number;
  totalBids: number;
  totalWins: number;
  createdAt: string;
  address: string;
  qualifications: string;
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?page=1&pageSize=100');
      const items = response.data.data?.items || [];
      
      if (items.length === 0) {
        const mockSuppliers: Supplier[] = [
          {
            id: '1',
            name: '华为技术有限公司',
            contactName: '张经理',
            contactPhone: '13800138001',
            contactEmail: 'zhang@huawei.com',
            category: '服务器,网络设备',
            level: 'STRATEGIC',
            status: 'ACTIVE',
            rating: 95,
            performanceScore: 94.5,
            totalBids: 28,
            totalWins: 15,
            createdAt: '2023-01-15T00:00:00Z',
            address: '广东省深圳市龙岗区坂田华为基地',
            qualifications: 'ISO9001,ISO27001,CMMI5',
          },
          {
            id: '2',
            name: '中兴通讯股份有限公司',
            contactName: '李经理',
            contactPhone: '13800138002',
            contactEmail: 'li@zte.com.cn',
            category: '网络设备',
            level: 'GOLD',
            status: 'ACTIVE',
            rating: 92,
            performanceScore: 91.2,
            totalBids: 22,
            totalWins: 10,
            createdAt: '2023-02-20T00:00:00Z',
            address: '广东省深圳市南山区高新技术产业园',
            qualifications: 'ISO9001,TL9000',
          },
          {
            id: '3',
            name: '联想集团有限公司',
            contactName: '王经理',
            contactPhone: '13800138003',
            contactEmail: 'wang@lenovo.com',
            category: '服务器,办公设备',
            level: 'GOLD',
            status: 'ACTIVE',
            rating: 90,
            performanceScore: 89.8,
            totalBids: 35,
            totalWins: 18,
            createdAt: '2023-03-10T00:00:00Z',
            address: '北京市海淀区上地信息产业基地',
            qualifications: 'ISO9001,ISO14001',
          },
          {
            id: '4',
            name: '戴尔(中国)有限公司',
            contactName: '赵经理',
            contactPhone: '13800138004',
            contactEmail: 'zhao@dell.com',
            category: '服务器,办公设备',
            level: 'SILVER',
            status: 'ACTIVE',
            rating: 88,
            performanceScore: 87.5,
            totalBids: 18,
            totalWins: 7,
            createdAt: '2023-04-05T00:00:00Z',
            address: '福建省厦门市湖里区',
            qualifications: 'ISO9001',
          },
          {
            id: '5',
            name: '惠普(中国)有限公司',
            contactName: '刘经理',
            contactPhone: '13800138005',
            contactEmail: 'liu@hp.com',
            category: '服务器,办公设备',
            level: 'SILVER',
            status: 'ACTIVE',
            rating: 87,
            performanceScore: 86.3,
            totalBids: 20,
            totalWins: 8,
            createdAt: '2023-05-12T00:00:00Z',
            address: '北京市朝阳区望京',
            qualifications: 'ISO9001,ISO27001',
          },
          {
            id: '6',
            name: '新华三技术有限公司',
            contactName: '陈经理',
            contactPhone: '13800138006',
            contactEmail: 'chen@h3c.com',
            category: '网络设备',
            level: 'GOLD',
            status: 'ACTIVE',
            rating: 91,
            performanceScore: 90.5,
            totalBids: 25,
            totalWins: 12,
            createdAt: '2023-06-08T00:00:00Z',
            address: '浙江省杭州市滨江区',
            qualifications: 'ISO9001,TL9000',
          },
          {
            id: '7',
            name: '思科系统(中国)网络技术有限公司',
            contactName: '周经理',
            contactPhone: '13800138007',
            contactEmail: 'zhou@cisco.com',
            category: '网络设备',
            level: 'STRATEGIC',
            status: 'ACTIVE',
            rating: 93,
            performanceScore: 92.8,
            totalBids: 15,
            totalWins: 9,
            createdAt: '2023-07-20T00:00:00Z',
            address: '北京市朝阳区东方广场',
            qualifications: 'ISO9001,ISO27001,CMMI5',
          },
          {
            id: '8',
            name: '浪潮电子信息产业股份有限公司',
            contactName: '吴经理',
            contactPhone: '13800138008',
            contactEmail: 'wu@inspur.com',
            category: '服务器',
            level: 'GOLD',
            status: 'ACTIVE',
            rating: 89,
            performanceScore: 88.7,
            totalBids: 30,
            totalWins: 14,
            createdAt: '2023-08-15T00:00:00Z',
            address: '山东省济南市浪潮路',
            qualifications: 'ISO9001,ISO14001',
          },
          {
            id: '9',
            name: '曙光信息产业股份有限公司',
            contactName: '郑经理',
            contactPhone: '13800138009',
            contactEmail: 'zheng@sugon.com',
            category: '服务器',
            level: 'SILVER',
            status: 'ACTIVE',
            rating: 86,
            performanceScore: 85.4,
            totalBids: 16,
            totalWins: 6,
            createdAt: '2023-09-25T00:00:00Z',
            address: '天津市华苑产业区',
            qualifications: 'ISO9001',
          },
          {
            id: '10',
            name: '宝德科技集团股份有限公司',
            contactName: '孙经理',
            contactPhone: '13800138010',
            contactEmail: 'sun@powerleader.com',
            category: '服务器',
            level: 'BRONZE',
            status: 'PENDING',
            rating: 84,
            performanceScore: 83.2,
            totalBids: 10,
            totalWins: 3,
            createdAt: '2023-10-30T00:00:00Z',
            address: '广东省深圳市龙华区',
            qualifications: 'ISO9001',
          },
        ];
        setSuppliers(mockSuppliers);
      } else {
        setSuppliers(items);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
  };

  const getLevelBadge = (level: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      STRATEGIC: { label: '战略级', color: 'bg-purple-100 text-purple-600 border-purple-200' },
      GOLD: { label: '金牌', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      SILVER: { label: '银牌', color: 'bg-gray-100 text-gray-600 border-gray-200' },
      BRONZE: { label: '铜牌', color: 'bg-orange-100 text-orange-600 border-orange-200' },
    };
    const badge = badges[level] || badges.BRONZE;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Award size={12} />
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      ACTIVE: { label: '合作中', color: 'bg-green-100 text-green-600', icon: CheckCircle },
      PENDING: { label: '待审核', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
      INACTIVE: { label: '已停用', color: 'bg-gray-100 text-gray-600', icon: X },
      BLACKLISTED: { label: '黑名单', color: 'bg-red-100 text-red-600', icon: AlertTriangle },
    };
    const badge = badges[status] || badges.INACTIVE;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating / 20);
    const hasHalfStar = rating % 20 >= 10;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={`${
              i < fullStars
                ? 'text-yellow-400 fill-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">{rating}</span>
      </div>
    );
  };

  const categories = ['all', ...Array.from(new Set(suppliers.flatMap(s => s.category.split(','))))];
  const levels = ['all', 'STRATEGIC', 'GOLD', 'SILVER', 'BRONZE'];

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.category.includes(categoryFilter);
    const matchesLevel = levelFilter === 'all' || s.level === levelFilter;
    return matchesSearch && matchesCategory && matchesLevel;
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
          <h2 className="text-2xl font-bold text-gray-800">供应商管理</h2>
          <p className="text-gray-500 mt-1">管理和查看所有合作供应商</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索供应商名称、联系人..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none cursor-pointer w-full lg:w-48"
            >
              <option value="all">全部品类</option>
              {categories.filter(c => c !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none cursor-pointer w-full lg:w-48"
            >
              <option value="all">全部等级</option>
              <option value="STRATEGIC">战略级</option>
              <option value="GOLD">金牌</option>
              <option value="SILVER">银牌</option>
              <option value="BRONZE">铜牌</option>
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">供应商信息</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">联系人</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">品类</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">等级/状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">信用评分</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">绩效</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">中标率</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{supplier.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{supplier.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-800">{supplier.contactName}</p>
                    <p className="text-xs text-gray-500">{supplier.contactPhone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {supplier.category.split(',').map((cat, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {getLevelBadge(supplier.level)}
                      {getStatusBadge(supplier.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRatingStars(supplier.rating)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-green-500" />
                      <span className="font-medium text-gray-800">{supplier.performanceScore}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">
                        {supplier.totalBids > 0 ? ((supplier.totalWins / supplier.totalBids) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {supplier.totalWins}/{supplier.totalBids} 次
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSupplier(supplier)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500">没有找到匹配的供应商</p>
          </div>
        )}
      </div>

      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">供应商详情</h3>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl">
                  {selectedSupplier.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-800">{selectedSupplier.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    {getLevelBadge(selectedSupplier.level)}
                    {getStatusBadge(selectedSupplier.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">信用评分</p>
                  {getRatingStars(selectedSupplier.rating)}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">绩效评分</p>
                  <p className="text-2xl font-bold text-gray-800">{selectedSupplier.performanceScore}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">总投标次数</p>
                  <p className="text-xl font-bold text-gray-800">{selectedSupplier.totalBids}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">中标次数</p>
                  <p className="text-xl font-bold text-gray-800">{selectedSupplier.totalWins}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">中标率</p>
                  <p className="text-xl font-bold text-green-600">
                    {selectedSupplier.totalBids > 0 ? ((selectedSupplier.totalWins / selectedSupplier.totalBids) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">加入时间</p>
                  <p className="text-lg font-bold text-gray-800">
                    {new Date(selectedSupplier.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">联系人</p>
                  <p className="font-medium text-gray-800">{selectedSupplier.contactName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">联系电话</p>
                  <p className="font-medium text-gray-800">{selectedSupplier.contactPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">联系邮箱</p>
                  <p className="font-medium text-gray-800">{selectedSupplier.contactEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">公司地址</p>
                  <p className="font-medium text-gray-800">{selectedSupplier.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">经营品类</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSupplier.category.split(',').map((cat, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">资质证书</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSupplier.qualifications.split(',').map((q, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-sm">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setSelectedSupplier(null)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
