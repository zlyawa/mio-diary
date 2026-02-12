import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, User, Lock, Check, X, UserPlus } from 'lucide-react';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * 密码强度等级
 */
const PASSWORD_STRENGTH = {
  WEAK: { level: 1, color: 'red', text: '弱' },
  MEDIUM: { level: 2, color: 'yellow', text: '中' },
  STRONG: { level: 3, color: 'green', text: '强' },
};

/**
 * 注册页面组件
 * 提供用户注册功能，包含邮箱、用户名、密码等字段验证
 */
const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, isAuthenticated, loading } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(PASSWORD_STRENGTH.WEAK);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);

  /**
   * 已登录用户自动跳转到总览页
   */
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm({
    mode: 'onChange',
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const username = watch('username');
  const email = watch('email');

  /**
   * 检查密码强度（与后端校验规则一致）
   */
  const checkPasswordStrength = (pwd) => {
    if (!pwd) {
      setPasswordStrength(PASSWORD_STRENGTH.WEAK);
      return;
    }

    let strength = 0;
    // 基础要求：8-100字符
    if (pwd.length >= 8 && pwd.length <= 100) strength++;
    // 包含字母
    if (/[a-zA-Z]/.test(pwd)) strength++;
    // 包含数字
    if (/\d/.test(pwd)) strength++;
    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;

    if (strength >= 4) {
      setPasswordStrength(PASSWORD_STRENGTH.STRONG);
    } else if (strength >= 2) {
      setPasswordStrength(PASSWORD_STRENGTH.MEDIUM);
    } else {
      setPasswordStrength(PASSWORD_STRENGTH.WEAK);
    }
  };

  /**
   * 监听密码变化
   */
  useEffect(() => {
    checkPasswordStrength(password);
  }, [password]);

  /**
   * 获取密码强度样式
   */
  const getStrengthColor = (strength) => {
    switch (strength.level) {
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  /**
   * 获取密码强度文本颜色
   */
  const getStrengthTextColor = (strength) => {
    switch (strength.level) {
      case 1:
        return 'text-red-600 dark:text-red-400';
      case 2:
        return 'text-yellow-600 dark:text-yellow-400';
      case 3:
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-500';
    }
  };

  /**
   * 处理注册提交
   */
  const onSubmit = async (data) => {
    setError('');
    setIsLoading(true);

    try {
      console.log('[注册] 开始注册流程，数据:', JSON.stringify({ ...data, password: '***' }));
      await registerUser(data);
      console.log('[注册] 注册成功');
      setSuccess(true);
      // 3秒后跳转到登录页
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('[注册] 注册失败:', err);
      console.error('[注册] 错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code
      });
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || '注册失败，请重试';
      const debugInfo = import.meta.env.DEV ? ` (状态码: ${err.response?.status || '未知'})` : '';
      setError(errorMessage + debugInfo);
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
   * 切换确认密码显示/隐藏
   */
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* 注册卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
          {/* 头部 */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              创建账号
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              加入Mio的日记本
            </p>
          </div>

          {/* 错误提示 */}
          <ErrorMessage message={error} />

          {/* 成功提示 */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200 text-sm font-medium flex items-center gap-2">
                <Check className="w-5 h-5" />
                注册成功！正在跳转到登录页面...
              </p>
            </div>
          )}

          {/* 注册表单 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 邮箱输入 */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                邮箱
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email', {
                    required: '请输入邮箱',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '请输入有效的邮箱地址',
                    },
                  })}
                  disabled={isLoading || success}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请输入邮箱"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* 用户名输入 */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  {...register('username', {
                    required: '请输入用户名',
                    minLength: {
                      value: 3,
                      message: '用户名至少需要3个字符',
                    },
                    maxLength: {
                      value: 20,
                      message: '用户名最多20个字符',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: '用户名只能包含字母、数字和下划线',
                    },
                  })}
                  disabled={isLoading || success}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请输入用户名"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.username.message}
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
                  autoComplete="new-password"
                  {...register('password', {
                    required: '请输入密码',
                    minLength: {
                      value: 8,
                      message: '密码至少需要8个字符',
                    },
                    maxLength: {
                      value: 100,
                      message: '密码不能超过100个字符',
                    },
                    validate: (value) => {
                      const errors = [];
                      if (!/[a-zA-Z]/.test(value)) errors.push('至少一个字母');
                      if (!/\d/.test(value)) errors.push('至少一个数字');
                      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push('至少一个特殊字符');
                      const weakPasswords = ['password', '123456', 'qwerty', 'admin'];
                      if (weakPasswords.some(weak => value.toLowerCase().includes(weak))) {
                        errors.push('不能包含常见弱密码');
                      }
                      return errors.length === 0 || `密码要求: ${errors.join(', ')}`;
                    },
                  })} 
                  disabled={isLoading || success}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请输入密码"
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
              
              {/* 密码强度指示器 */}
              {password && !errors.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStrengthColor(passwordStrength)} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getStrengthTextColor(passwordStrength)}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    密码要求：8-100个字符，包含字母、数字和特殊字符
                  </p>
                </div>
              )}
            </div>

            {/* 确认密码输入 */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                确认密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: '请确认密码',
                    validate: (value) =>
                      value === password || '两次输入的密码不一致',
                  })}
                  disabled={isLoading || success}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请再次输入密码"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={isLoading || isSubmitting || success}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>注册中...</span>
                </>
              ) : success ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>注册成功</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>注册</span>
                </>
              )}
            </button>
          </form>

          {/* 登录链接 */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              已有账号？{' '}
              <Link
                to="/login"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>

        {/* 底部信息 */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          注册即表示您同意我们的{' '}
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

export default Register;