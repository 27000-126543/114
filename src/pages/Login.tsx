import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Gavel, Eye, EyeOff, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!username || !password) {
      return;
    }

    try {
      await login(username, password);
      
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the store
    }
  };

  const quickLogin = async (user: string) => {
    setUsername(user);
    setPassword('123456');
    clearError();
    
    try {
      await login(user, '123456');
      
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', user);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Gavel className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">供应商竞价管理系统</h1>
            <p className="text-gray-500">企业级反向拍卖自动化平台</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">记住我</span>
              </label>
              <Link to="#" className="text-sm text-blue-500 hover:text-blue-600">
                忘记密码？
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  登录中...
                </span>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-3">快速登录（测试账号）</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => quickLogin('admin')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                管理员
              </button>
              <button
                onClick={() => quickLogin('director')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                总监
              </button>
              <button
                onClick={() => quickLogin('manager')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                经理
              </button>
              <button
                onClick={() => quickLogin('staff1')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                专员1
              </button>
              <button
                onClick={() => quickLogin('staff2')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                专员2
              </button>
              <button
                onClick={() => quickLogin('supplier1')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                供应商
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          © 2024 供应商竞价管理系统 · 企业版
        </p>
      </div>
    </div>
  );
};

export default Login;
