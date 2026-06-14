import { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { FileText, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { error: showError } = useToast();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Redirect if already logged in
  if (isAuthenticated && !isLoading) {
    const from = location.state?.from ? `${location.state.from.pathname}${location.state.from.search}` : '/';
    return <Navigate to={from} replace />;
  }

  const validate = () => {
    const newErrors = {};
    if (!username.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập';
    }
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    const result = await login(username, password);

    if (result.success) {
      const from = location.state?.from ? `${location.state.from.pathname}${location.state.from.search}` : '/';
      navigate(from, { replace: true });
    } else {
      showError(result.error || 'Đăng nhập thất bại');
      
      if (result.error === 'Tên đăng nhập không tồn tại') {
        setErrors({ username: result.error });
      } else if (result.error === 'Mật khẩu không chính xác') {
        setErrors({ password: result.error });
      } else {
        setErrors({ form: result.error });
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-900/30 via-slate-900 to-teal-900/30" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-8 text-center bg-gradient-to-b from-slate-800 to-slate-800/50">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-6 shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Docupedia
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Hệ thống quản lý tài liệu thông minh
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full bg-slate-700 border ${errors.username ? 'border-rose-500' : 'border-slate-600 hover:border-slate-500'} rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors`}
                  placeholder="Nhập tên đăng nhập..."
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-xs text-rose-400">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-700 border ${errors.password ? 'border-rose-500' : 'border-slate-600 hover:border-slate-500'} rounded-xl pl-12 pr-12 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors`}
                  placeholder="Nhập mật khẩu..."
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-xs text-rose-400">{errors.password}</p>
              )}
            </div>

            {errors.form && (
              <div className="text-sm text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 py-3 px-4 rounded-xl">
                {errors.form}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>

        {/* Version badge */}
        <div className="text-center mt-6">
          <span className="text-xs text-slate-500">
            Được phát triển bởi <a href="https://telua.vn" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]">Telua</a> @06-2026
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
