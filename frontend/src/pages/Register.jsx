import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { Eye, EyeOff, Mail, Lock, Check, UserPlus, Sparkles, RefreshCw, Send } from 'lucide-react';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api from '../utils/api';

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
 * 简化版：仅需要邮箱和密码，用户名自动生成
 */
const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, isAuthenticated, loading } = useAuth();
  const { enableEmailVerify, loading: configLoading } = useConfig();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(PASSWORD_STRENGTH.WEAK);
  
  // 图片验证码相关
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  
  // 邮箱验证码相关
  const [emailCode, setEmailCode] = useState('');
  const [sendCodeLoading, setSendCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailForCode, setEmailForCode] = useState('');

  /**
   * 注册成功后不需要自动跳转
   * 注册成功后会显示成功提示，用户可以手动点击登录
   */
  useEffect(() => {
    // 不再自动跳转，避免与手动跳转冲突
  }, [isAuthenticated, loading, navigate]);

  /**
   * 获取图片验证码
   */
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await api.get('/auth/captcha', {
        responseType: 'text',
      });
      // 从响应头获取 captchaId
      const id = response.headers['x-captcha-id'];
      console.log('[验证码] 响应头:', response.headers);
      console.log('[验证码] captchaId:', id);
      setCaptchaId(id);
      setCaptchaSvg(response.data);
    } catch (err) {
      console.error('获取验证码失败:', err);
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  /**
   * 页面加载时获取验证码
   */
  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  /**
   * 发送邮箱验证码
   */
  const sendEmailCode = async () => {
    const email = watch('email');
    if (!email) {
      setError('请先输入邮箱');
      return;
    }

    const captchaInput = watch('captchaInput');
    if (!captchaInput) {
      setError('请先输入图片验证码');
      return;
    }

    setSendCodeLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/send-verification-code', { 
        email,
        captchaId,
        captchaInput 
      });
      setEmailForCode(email);
      setCountdown(60);
      
      // 更新图片验证码（后端返回了新的验证码）
      if (response.data.newCaptcha) {
        setCaptchaId(response.data.newCaptcha.id);
        setCaptchaSvg(response.data.newCaptcha.svg);
        // 清空之前输入的图片验证码
        setValue('captchaInput', '');
      }
      
      // 开始倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || '发送验证码失败');
      fetchCaptcha(); // 刷新验证码
    } finally {
      setSendCodeLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onChange',
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

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
    
    // 验证图片验证码
    if (!data.captchaInput) {
      setError('请输入图片验证码');
      return;
    }

    // 如果启用了邮箱验证，检查邮箱验证码
    if (enableEmailVerify && !emailCode) {
      setError('请输入邮箱验证码');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[注册] 开始注册流程，数据:', JSON.stringify({ email: data.email, password: '***' }));
      console.log('[注册] captchaId:', captchaId, 'captchaInput:', data.captchaInput);
      // 传递完整数据，包括验证码
      await registerUser({
        email: data.email,
        password: data.password,
        captchaId: captchaId,
        captchaInput: data.captchaInput,
        verificationCode: enableEmailVerify ? emailCode : undefined,
      });
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
      // 刷新验证码
      fetchCaptcha();
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

          {/* 提示信息 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200 text-sm flex items-start gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                注册更简单啦！只需邮箱和密码，我们会为您自动生成一个可爱的用户名，之后可以在设置中修改。
              </span>
            </p>
          </div>

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

            {/* 图片验证码 */}
            <div>
              <label
                htmlFor="captchaInput"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                图片验证码
              </label>
              <div className="flex gap-2 sm:gap-3 items-start">
                <input
                  id="captchaInput"
                  type="text"
                  {...register('captchaInput', {
                    required: '请输入验证码',
                    minLength: { value: 4, message: '验证码为4位' },
                    maxLength: { value: 4, message: '验证码为4位' },
                  })}
                  disabled={isLoading || success}
                  className="flex-1 min-w-0 px-3 sm:px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请输入验证码"
                  maxLength={4}
                />
                <div 
                  className="w-24 sm:w-28 h-12 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer overflow-hidden flex-shrink-0"
                  onClick={fetchCaptcha}
                  title="点击刷新验证码"
                >
                  {captchaLoading ? (
                    <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : captchaSvg ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: captchaSvg }} 
                      className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto" 
                    />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              {errors.captchaInput && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.captchaInput.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                点击图片可刷新验证码
              </p>
            </div>

            {/* 邮箱验证码（仅在启用邮箱验证时显示） */}
            {enableEmailVerify && (
              <div>
                <label
                  htmlFor="emailCode"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  邮箱验证码
                </label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    id="emailCode"
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    disabled={isLoading || success}
                    className="flex-1 min-w-0 px-3 sm:px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="请输入邮箱验证码"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    disabled={countdown > 0 || sendCodeLoading || isLoading || success}
                    className="px-3 sm:px-4 py-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 whitespace-nowrap text-sm sm:text-base flex-shrink-0"
                  >
                    {sendCodeLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">发送</span>
                        <span className="sm:hidden">发送</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  验证码将发送到您的邮箱
                </p>
              </div>
            )}

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