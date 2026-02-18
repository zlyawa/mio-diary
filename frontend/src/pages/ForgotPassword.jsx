import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, KeyRound, ArrowLeft, Check, RefreshCw, Send } from 'lucide-react';
// import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api, { getImageUrl } from '../utils/api';
import { sanitizeText, sanitizeSVG } from '../utils/security';

/**
 * 忘记密码页面
 * 仅在启用邮箱验证时可用
 */
const ForgotPassword = () => {
  const navigate = useNavigate();
  const { enableEmailVerify, forgotPasswordBg, loading: configLoading } = useConfig();
  const toast = useToast();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  
  // 图片验证码相关
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
  });

  const email = watch('email');

  // 如果未启用邮箱验证，显示不可用提示
  useEffect(() => {
    if (!configLoading && !enableEmailVerify) {
      setError('忘记密码功能需要先开启邮箱验证。请联系管理员。');
    }
  }, [configLoading, enableEmailVerify]);

  // 获取图片验证码
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await api.get('/auth/captcha', {
        responseType: 'text',
      });
      const id = response.headers['x-captcha-id'];
      setCaptchaId(id);
      setCaptchaSvg(response.data);
    } catch (err) {
      console.error('获取验证码失败:', err);
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // 页面加载时获取验证码
  useEffect(() => {
    if (enableEmailVerify) {
      fetchCaptcha();
    }
  }, [fetchCaptcha, enableEmailVerify]);

  // 发送验证码
  const sendCode = async () => {
    if (!email) {
      toast.error('请先输入邮箱');
      return;
    }

    const captchaInput = watch('captchaInput');
    if (!captchaInput) {
      toast.error('请先输入图片验证码');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/send-verification-code', { 
        email,
        captchaId,
        captchaInput,
        purpose: 'reset-password'
      });
      setCountdown(60);
      // 更新验证码
      if (response.data.newCaptcha) {
        setCaptchaId(response.data.newCaptcha.id);
        setCaptchaSvg(response.data.newCaptcha.svg);
      }
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
      toast.error(err.response?.data?.message || '发送验证码失败');
      fetchCaptcha(); // 刷新验证码
    } finally {
      setIsLoading(false);
    }
  };

  // 提交重置密码
  const onSubmit = async (data) => {
    if (!enableEmailVerify) {
      toast.error('忘记密码功能需要先开启邮箱验证');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        email: data.email,
        verificationCode: data.verificationCode,
        newPassword: data.newPassword,
      });
      setNewPassword(response.data.newPassword || data.newPassword);
      toast.success('密码重置成功！');
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || '重置密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 配置加载中
  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const bgStyle = forgotPasswordBg ? {
    backgroundImage: `url(${getImageUrl(forgotPasswordBg)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden ${!forgotPasswordBg ? 'bg-gray-50 dark:bg-gray-900' : ''}`} style={bgStyle}>
      {/* 背景装饰 - 纯色 */}
      {!forgotPasswordBg && (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </>
      )}
      
      {/* 背景遮罩，确保文字可读 */}
      {forgotPasswordBg && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-0" />
      )}
      
      <div className="max-w-md w-full relative z-10">
        {/* 重置密码卡片 - 玻璃拟态 */}
        <div className="glass rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/50 dark:border-white/10">
          {/* 返回按钮 - 放在卡片内 */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回登录
          </Link>
          {/* 头部 */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5 shadow-lg">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              重置密码
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              输入您的邮箱，我们将发送验证码
            </p>
          </div>

          {/* 错误提示 - XSS防护 */}
          {/* {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{sanitizeText(error)}</p>
            </div>
          )} */}

          {/* 成功提示 */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200 text-sm font-medium flex items-center gap-2 mb-2">
                <Check className="w-5 h-5" />
                密码重置成功！
              </p>
              <p className="text-green-700 dark:text-green-300 text-sm">
                请使用新密码登录
              </p>
              <Link
                to="/login"
                className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                前往登录
              </Link>
            </div>
          )}

          {/* 未启用邮箱验证提示 */}
          {!enableEmailVerify && !success && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                忘记密码功能需要管理员开启邮箱验证功能后才能使用。
              </p>
            </div>
          )}

          {/* 重置密码表单 */}
          {enableEmailVerify && !success && (
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
                    {...register('email', {
                      required: '请输入邮箱',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: '请输入有效的邮箱地址',
                      },
                    })}
                    disabled={isLoading}
                    className="input-field pl-10"
                    placeholder="请输入注册邮箱"
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
                <div className="flex gap-2 sm:gap-3">
                  <input
                    id="captchaInput"
                    type="text"
                    {...register('captchaInput', {
                      required: '请输入验证码',
                      minLength: { value: 4, message: '验证码为4位' },
                      maxLength: { value: 4, message: '验证码为4位' },
                    })}
                    disabled={isLoading}
                    className="flex-1 min-w-0 input-field"
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
                      <div dangerouslySetInnerHTML={{ __html: sanitizeSVG(captchaSvg) }} className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-[120px] [&_svg]:max-h-[48px]" />
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

              {/* 邮箱验证码 */}
              <div>
                <label
                  htmlFor="verificationCode"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  邮箱验证码
                </label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    id="verificationCode"
                    type="text"
                    {...register('verificationCode', {
                      required: '请输入验证码',
                      minLength: { value: 6, message: '验证码为6位' },
                    })}
                    disabled={isLoading}
                    className="flex-1 min-w-0 input-field"
                    placeholder="请输入验证码"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={countdown > 0 || isLoading}
                    className="px-3 sm:px-4 py-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 whitespace-nowrap text-sm sm:text-base flex-shrink-0"
                  >
                    {countdown > 0 ? (
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
                {errors.verificationCode && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.verificationCode.message}
                  </p>
                )}
              </div>

              {/* 新密码 */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  新密码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    type="password"
                    {...register('newPassword', {
                      required: '请输入新密码',
                      minLength: {
                        value: 8,
                        message: '密码至少需要8个字符',
                      },
                      validate: (value) => {
                        const errors = [];
                        if (!/[a-zA-Z]/.test(value)) errors.push('至少一个字母');
                        if (!/\d/.test(value)) errors.push('至少一个数字');
                        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push('至少一个特殊字符');
                        return errors.length === 0 || `密码要求: ${errors.join(', ')}`;
                      },
                    })}
                    disabled={isLoading}
                    className="input-field pl-10"
                    placeholder="请输入新密码"
                  />
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.newPassword.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  密码要求：8-100个字符，包含字母、数字和特殊字符
                </p>
              </div>

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>重置中...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    <span>重置密码</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
