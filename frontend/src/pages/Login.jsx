import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff, Lock, User, ArrowRight, Sparkles, Shield, Zap, BookOpen } from 'lucide-react';
// import ErrorMessage from '../components/common/ErrorMessage'; // 保留原有组件
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
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);

  // 获取背景图URL
  const getBgUrl = (bg) => {
    if (!bg) return '';
    if (bg.startsWith('http')) return bg;
    if (bg.startsWith('/uploads/')) return bg;
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
   */
  useEffect(() => {
    if (isAuthenticated && !loading) {
      // 登录成功后会手动跳转
    }
  }, [isAuthenticated, loading]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
      toast.error(`账户已锁定，请${getRemainingLockoutTime()}分钟后再试`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(data);
      
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
      
      toast.success('登录成功！');
      
      // 根据角色分流
      setTimeout(() => {
        if (result.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 500);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || '登录失败，请重试';
      
      // 增加失败尝试次数
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());
      
      // 5次失败后锁定15分钟
      if (newAttempts >= 5) {
        const lockoutEndTime = Date.now() + 15 * 60 * 1000;
        setLockoutTime(lockoutEndTime);
        localStorage.setItem('lockoutTime', lockoutEndTime.toString());
        toast.error('登录失败次数过多，账户已锁定15分钟');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden ${
        !loginBg ? 'bg-gray-50 dark:bg-gray-900' : ''
      }`} 
      style={bgStyle}
    >
      {/* 背景装饰元素 */}
      {!loginBg && (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </>
      )}
      
      {/* 背景遮罩 */}
      {loginBg && (
        <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60 backdrop-blur-sm z-0" />
      )}
      
      <div className="max-w-6xl w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* 左侧：品牌介绍 */}
          <div className="hidden lg:block text-white">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold text-white">
                    Mio的日记本
                  </h1>
                </div>
                <p className="text-xl text-white/80 leading-relaxed max-w-md">
                  记录生活的每一个瞬间，留下成长的每一步脚印。
                </p>
              </div>
              
              {/* 功能特点 */}
              <div className="space-y-4">
                {[
                  { icon: Sparkles, text: '富文本编辑器，支持图片和表情' },
                  { icon: Shield, text: '端到端加密，保护您的隐私' },
                  { icon: Zap, text: '快速记录，自动保存草稿' },
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
              
              {/* 统计数据 */}
              <div className="flex gap-8 pt-4">
                {[
                  { value: '10K+', label: '活跃用户' },
                  { value: '100K+', label: '日记记录' },
                  { value: '99.9%', label: '服务可用性' },
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-white/60">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 右侧：登录表单 */}
          <div className="w-full max-w-md mx-auto">
            <div className="glass rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 dark:border-white/10">
              {/* 头部 */}
              <div className="text-center mb-8">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5 shadow-lg">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  欢迎回来
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  登录您的账户继续记录
                </p>
              </div>

              {/* 锁定提示 - 保留这个重要信息 */}
              {lockoutTime && Date.now() < lockoutTime && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    账户已锁定，请 {getRemainingLockoutTime()} 分钟后再试
                  </p>
                </div>
              )}

              {/* 登录表单 */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* 邮箱/用户名输入 */}
                <div className="group">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    邮箱或用户名
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      id="email"
                      type="text"
                      autoComplete="username"
                      {...register('email', { 
                        required: '请输入邮箱或用户名',
                        minLength: { value: 3, message: '用户名至少需要3个字符' }
                      })}
                      disabled={isLoading || (lockoutTime && Date.now() < lockoutTime)}
                      className="input-field pl-12"
                      placeholder="请输入邮箱或用户名"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* 密码输入 */}
                <div className="group">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    密码
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      {...register('password', { 
                        required: '请输入密码',
                        minLength: { value: 6, message: '密码至少需要6个字符' }
                      })}
                      disabled={isLoading || (lockoutTime && Date.now() < lockoutTime)}
                      className="input-field pl-12 pr-12"
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* 记住我和忘记密码 */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      {...register('rememberMe')}
                      disabled={isLoading || (lockoutTime && Date.now() < lockoutTime)}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded-lg focus:ring-indigo-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 transition-colors"
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                      记住我
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors hover:underline"
                  >
                    忘记密码？
                  </Link>
                </div>

                {/* 登录按钮 */}
                <button
                  type="submit"
                  disabled={isLoading || isSubmitting || (lockoutTime && Date.now() < lockoutTime)}
                  className="btn-primary w-full py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>登录中...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>立即登录</span>
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </button>
              </form>

              {/* 注册链接 */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-center text-gray-600 dark:text-gray-400">
                  还没有账号？{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors hover:underline"
                  >
                    免费注册
                  </Link>
                </p>
              </div>
            </div>

            {/* 底部信息 */}
            <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
              登录即表示您同意我们的{' '}
              <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
                服务条款
              </a>{' '}
              和{' '}
              <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
                隐私政策
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
