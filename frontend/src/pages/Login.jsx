import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConfig } from '../context/ConfigContext';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * 登录页面组件
 * 提供用户登录功能，支持邮箱/用户名登录、记住我、密码显示切换等功能
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();
  const { isDark } = useTheme();
  const { loginBg } = useConfig();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);

  // 获取背景图URL
  const getBgUrl = (bg) => {
    if (!bg) return '';
    if (bg.startsWith('http')) return bg;
    // 如果已经是 /uploads/ 开头，直接返回
    if (bg.startsWith('/uploads/')) return bg;
    // 否则添加 /uploads/ 前缀
    return `/uploads/${bg}`;
  };

  const bgStyle = loginBg ? {
    backgroundImage: `url(${getBgUrl(loginBg)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  /**
   * 已登录用户自动跳转
   * 只在页面初次加载时检查，避免重复跳转
   */
  useEffect(() => {
    // 如果已经在登录页面且已登录，跳转到首页或管理员页面
    if (isAuthenticated && !loading) {
      // 登录成功后会手动跳转，这里不需要自动跳转
      // 避免与登录成功后的跳转冲突
    }
  }, [isAuthenticated, loading]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    defaultValues: {
      email: localStorage.getItem('rememberedEmail') || '',
      password: '',
      rememberMe: localStorage.getItem('rememberMe') === 'true',
    },
  });

  /**
   * 检查账户锁定状态
   */
  useEffect(() => {
    const savedAttempts = localStorage.getItem('loginAttempts');
    const savedLockoutTime = localStorage.getItem('lockoutTime');
    
    if (savedAttempts) {
      setAttempts(parseInt(savedAttempts, 10));
    }
    
    if (savedLockoutTime) {
      const lockoutEndTime = parseInt(savedLockoutTime, 10);
      if (Date.now() < lockoutEndTime) {
        setLockoutTime(lockoutEndTime);
      } else {
        localStorage.removeItem('lockoutTime');
        localStorage.removeItem('loginAttempts');
      }
    }
  }, []);

  /**
   * 倒计时锁定时间
   */
  useEffect(() => {
    if (lockoutTime) {
      const interval = setInterval(() => {
        if (Date.now() >= lockoutTime) {
          setLockoutTime(null);
          localStorage.removeItem('lockoutTime');
          localStorage.removeItem('loginAttempts');
          setAttempts(0);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutTime]);

  /**
   * 获取剩余锁定时间（分钟）
   */
  const getRemainingLockoutTime = () => {
    if (!lockoutTime) return 0;
    const remaining = Math.ceil((lockoutTime - Date.now()) / 60000);
    return Math.max(0, remaining);
  };

  /**
   * 处理登录提交
   */
  const onSubmit = async (data) => {
    // 检查锁定状态
    if (lockoutTime && Date.now() < lockoutTime) {
      setError(`账户已锁定，请${getRemainingLockoutTime()}分钟后再试`);
      return;
    }

    setError('');
    setIsLoading(true);
    console.log('[登录] 开始登录流程，数据:', JSON.stringify({ ...data, password: '***' }));

    try {
      const result = await login(data);
      console.log('[登录] 登录成功', result);
      
      // 登录成功，清除尝试次数和锁定信息
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lockoutTime');
      
      // 处理"记住我"功能
      if (data.rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }
      
      // 根据角色分流：管理员跳转到/admin，普通用户跳转到/
      if (result.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('[登录] 登录失败:', err);
      console.error('[登录] 错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code
      });
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || '登录失败，请重试';
      const debugInfo = import.meta.env.DEV ? ` (状态码: ${err.response?.status || '未知'})` : '';
      setError(errorMessage + debugInfo);
      
      // 增加失败尝试次数
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());
      
      // 5次失败后锁定15分钟
      if (newAttempts >= 5) {
        const lockoutEndTime = Date.now() + 15 * 60 * 1000; // 15分钟
        setLockoutTime(lockoutEndTime);
        localStorage.setItem('lockoutTime', lockoutEndTime.toString());
        setError(`登录失败次数过多，账户已锁定15分钟`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 切换密码显示/隐藏
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  /**
   * 处理键盘事件（Enter提交）
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isSubmitting && !isLoading) {
      handleSubmit(onSubmit)();
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 ${!loginBg ? 'bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900' : ''}`} style={bgStyle}>
      {/* 背景遮罩，确保文字可读 */}
      {loginBg && (
        <div className="fixed inset-0 bg-black/40 z-0" />
      )}
      <div className="max-w-md w-full relative z-10">
        {/* 登录卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
          {/* 头部 */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              欢迎回来
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              登录到Mio的日记本
            </p>
          </div>

          {/* 错误提示 */}
          <ErrorMessage message={error} />

          {/* 锁定提示 */}
          {lockoutTime && Date.now() < lockoutTime && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                ⚠️ 账户已锁定，请 {getRemainingLockoutTime()} 分钟后再试
              </p>
            </div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 邮箱/用户名输入 */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                邮箱或用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  {...register('email', { 
                    required: '请输入邮箱或用户名',
                    minLength: {
                      value: 3,
                      message: '用户名至少需要3个字符'
                    }
                  })}
                  disabled={isLoading || (lockoutTime && Date.now() < lockoutTime)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请输入邮箱或用户名"
                  onKeyDown={handleKeyDown}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', { 
                    required: '请输入密码',
                    minLength: {
                      value: 6,
                      message: '密码至少需要6个字符'
                    }
                  })}
                  disabled={isLoading || (lockoutTime && Date.now() < lockoutTime)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请输入密码"
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 记住我和忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  disabled={isLoading || (lockoutTime && Date.now() < lockoutTime)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  记住我
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
              >
                忘记密码？
              </Link>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading || isSubmitting || (lockoutTime && Date.now() < lockoutTime)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>登录中...</span>
                </>
              ) : (
                <>
                  <span>登录</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              还没有账号？{' '}
              <Link
                to="/register"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                立即注册
              </Link>
            </p>
          </div>
        </div>

        {/* 底部信息 */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          登录即表示您同意我们的{' '}
          <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            服务条款
          </a>{' '}
          和{' '}
          <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            隐私政策
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;