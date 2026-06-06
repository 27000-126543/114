import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Gavel, 
  FileCheck, 
  Building2, 
  FileText, 
  History, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: '首页' },
    { path: '/procurement', icon: ShoppingCart, label: '采购需求' },
    { path: '/bidding', icon: Gavel, label: '竞价大厅' },
    { path: '/approvals', icon: FileCheck, label: '审批中心' },
    { path: '/suppliers', icon: Building2, label: '供应商管理' },
    { path: '/contracts', icon: FileText, label: '合同管理' },
    { path: '/history', icon: History, label: '历史查询' },
    { path: '/settings', icon: Settings, label: '系统设置' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } bg-slate-800 text-white transition-all duration-300 fixed lg:relative h-full z-30 overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className={`flex items-center gap-2 ${!sidebarOpen && 'lg:justify-center'}`}>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Gavel size={18} />
              </div>
              {sidebarOpen && <span className="font-bold text-lg">竞价系统</span>}
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          
          <nav className="flex-1 p-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  } ${!sidebarOpen && 'lg:justify-center lg:px-2'}`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span>{item.label}</span>}
                  {isActive && sidebarOpen && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors w-full ${
                !sidebarOpen && 'lg:justify-center lg:px-2'
              }`}
            >
              <LogOut size={20} />
              {sidebarOpen && <span>退出登录</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {menuItems.find(m => location.pathname.startsWith(m.path))?.label || '首页'}
              </h1>
              <p className="text-sm text-gray-500">
                欢迎回来，{user?.username}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <Bell size={20} />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{user?.username}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'ADMIN' ? '系统管理员' :
                   user?.role === 'DIRECTOR' ? '采购总监' :
                   user?.role === 'MANAGER' ? '采购经理' :
                   user?.role === 'STAFF' ? '采购专员' :
                   user?.role === 'SUPPLIER' ? '供应商' : user?.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
