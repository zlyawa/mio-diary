import { useEffect, useState } from 'react';
import api from '../utils/api';
import { getImageUrl } from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import SuccessMessage from '../components/common/SuccessMessage';
import {
  Settings,
  Mail,
  Shield,
  UserCheck,
  Save,
  Send,
  ToggleLeft,
  ToggleRight,
  Globe,
  Image,
  Upload,
} from 'lucide-react';

/**
 * 系统设置页面
 * 管理员可以配置系统功能开关和邮件服务
 */
const SystemSettings = () => {
  const { refreshConfig } = useConfig();
  const [config, setConfig] = useState({
    siteName: 'Mio日记',
    siteDescription: '',
    siteIcon: '',
    siteIco: '',
    loginBg: '',
    registerBg: '',
    forgotPasswordBg: '',
    enableEmailVerify: false,
    enableUserReview: false,
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      from: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/settings');
      setConfig(response.data.config);
    } catch (err) {
      console.error('获取系统配置失败:', err);
      setError(err.response?.data?.message || '获取系统配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.put('/admin/settings', config);
      // 刷新全局配置
      await refreshConfig();
      setSuccess('系统配置已保存');
    } catch (err) {
      console.error('保存系统配置失败:', err);
      setError(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      setError('请输入测试邮箱地址');
      return;
    }

    try {
      setTestingEmail(true);
      setError('');
      setSuccess('');

      await api.post('/admin/email/test', { to: testEmailAddress });
      setSuccess('测试邮件已发送');
      setTestEmailAddress('');
    } catch (err) {
      console.error('发送测试邮件失败:', err);
      setError(err.response?.data?.message || '发送失败');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleToggle = (key) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSmtpChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      smtp: {
        ...prev.smtp,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
      {/* 页面标题 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            系统设置
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          配置系统功能开关和邮件服务
        </p>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <div className="space-y-4 sm:space-y-6">
        {/* 网站基本信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              网站信息
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站名称
              </label>
              <input
                type="text"
                value={config.siteName || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, siteName: e.target.value }))}
                placeholder="Mio日记"
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站Logo
              </label>
              <div className="space-y-3">
                {/* URL输入 */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={config.siteIcon || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, siteIcon: e.target.value }))}
                    placeholder="输入Logo URL或上传文件"
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm">
                    <Upload className="w-4 h-4" />
                    <span>上传</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const response = await api.post('/upload/image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            setConfig((prev) => ({ ...prev, siteIcon: response.data.data.imageUrl }));
                            setSuccess('Logo上传成功');
                          } catch (err) {
                            console.error('上传Logo失败:', err);
                            setError('上传Logo失败: ' + (err.response?.data?.message || '未知错误'));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {/* Logo预览 */}
                {config.siteIcon && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <img 
                      src={getImageUrl(config.siteIcon)} 
                      alt="网站Logo预览" 
                      className="w-8 h-8 object-contain rounded flex-shrink-0"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                      {config.siteIcon}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站Favicon (ICO)
              </label>
              <div className="space-y-3">
                {/* URL输入 */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={config.siteIco || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, siteIco: e.target.value }))}
                    placeholder="输入Favicon URL或上传文件"
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm">
                    <Upload className="w-4 h-4" />
                    <span>上传</span>
                    <input
                      type="file"
                      accept="image/*,.ico"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const response = await api.post('/upload/image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            setConfig((prev) => ({ ...prev, siteIco: response.data.data.imageUrl }));
                            setSuccess('Favicon上传成功');
                          } catch (err) {
                            console.error('上传Favicon失败:', err);
                            setError('上传Favicon失败: ' + (err.response?.data?.message || '未知错误'));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {/* Favicon预览 */}
                {config.siteIco && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <img 
                      src={getImageUrl(config.siteIco)} 
                      alt="Favicon预览" 
                      className="w-8 h-8 object-contain rounded flex-shrink-0"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                      {config.siteIco}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 登录页背景图 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                登录页背景图
              </label>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={config.loginBg || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, loginBg: e.target.value }))}
                    placeholder="输入背景图URL或上传文件"
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm">
                    <Upload className="w-4 h-4" />
                    <span>上传</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const response = await api.post('/upload/image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            setConfig((prev) => ({ ...prev, loginBg: response.data.data.imageUrl }));
                            setSuccess('背景图上传成功');
                          } catch (err) {
                            console.error('上传背景图失败:', err);
                            setError('上传背景图失败: ' + (err.response?.data?.message || '未知错误'));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {config.loginBg && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <img 
                      src={getImageUrl(config.loginBg)} 
                      alt="登录页背景预览" 
                      className="w-20 h-12 object-cover rounded flex-shrink-0"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                      {config.loginBg}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 注册页背景图 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                注册页背景图
              </label>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={config.registerBg || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, registerBg: e.target.value }))}
                    placeholder="输入背景图URL或上传文件"
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm">
                    <Upload className="w-4 h-4" />
                    <span>上传</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const response = await api.post('/upload/image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            setConfig((prev) => ({ ...prev, registerBg: response.data.data.imageUrl }));
                            setSuccess('背景图上传成功');
                          } catch (err) {
                            console.error('上传背景图失败:', err);
                            setError('上传背景图失败: ' + (err.response?.data?.message || '未知错误'));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {config.registerBg && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <img 
                      src={getImageUrl(config.registerBg)} 
                      alt="注册页背景预览" 
                      className="w-20 h-12 object-cover rounded flex-shrink-0"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                      {config.registerBg}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 忘记密码页背景图 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                忘记密码页背景图
              </label>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={config.forgotPasswordBg || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, forgotPasswordBg: e.target.value }))}
                    placeholder="输入背景图URL或上传文件"
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm">
                    <Upload className="w-4 h-4" />
                    <span>上传</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const response = await api.post('/upload/image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            setConfig((prev) => ({ ...prev, forgotPasswordBg: response.data.data.imageUrl }));
                            setSuccess('背景图上传成功');
                          } catch (err) {
                            console.error('上传背景图失败:', err);
                            setError('上传背景图失败: ' + (err.response?.data?.message || '未知错误'));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {config.forgotPasswordBg && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <img 
                      src={getImageUrl(config.forgotPasswordBg)} 
                      alt="忘记密码页背景预览" 
                      className="w-20 h-12 object-cover rounded flex-shrink-0"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                      {config.forgotPasswordBg}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站描述
              </label>
              <textarea
                value={config.siteDescription || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, siteDescription: e.target.value }))}
                placeholder="一个简洁优雅的个人日记应用..."
                rows={3}
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                网站描述将显示在浏览器标签页和分享链接中
              </p>
            </div>
          </div>
        </div>

        {/* 功能开关 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              功能开关
            </h2>
          </div>

          <div className="space-y-4">
            {/* 邮箱验证开关 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                  注册需邮箱验证
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  开启后，新用户注册需要通过邮箱验证才能使用
                </p>
              </div>
              <button
                onClick={() => handleToggle('enableEmailVerify')}
                className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                  config.enableEmailVerify
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {config.enableEmailVerify ? (
                  <ToggleRight className="w-10 h-10 sm:w-12 sm:h-12" />
                ) : (
                  <ToggleLeft className="w-10 h-10 sm:w-12 sm:h-12" />
                )}
              </button>
            </div>

            {/* 用户审核开关 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                  内容审核
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  开启后，所有用户发布的日记都需要管理员审核通过后才会公开显示。
                </p>
              </div>
              <button
                onClick={() => handleToggle('enableUserReview')}
                className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                  config.enableUserReview
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {config.enableUserReview ? (
                  <ToggleRight className="w-10 h-10 sm:w-12 sm:h-12" />
                ) : (
                  <ToggleLeft className="w-10 h-10 sm:w-12 sm:h-12" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SMTP配置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              邮件服务配置
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SMTP服务器地址
              </label>
              <input
                type="text"
                value={config.smtp?.host || ''}
                onChange={(e) => handleSmtpChange('host', e.target.value)}
                placeholder="smtp.example.com"
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                端口
              </label>
              <input
                type="number"
                value={config.smtp?.port || ''}
                onChange={(e) => handleSmtpChange('port', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="587"
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                常用端口：25(无加密)、587(TLS)、465(SSL)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={config.smtp?.user || ''}
                onChange={(e) => handleSmtpChange('user', e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <input
                type="password"
                value={config.smtp?.pass || ''}
                onChange={(e) => handleSmtpChange('pass', e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                发件人地址
              </label>
              <input
                type="email"
                value={config.smtp?.from || ''}
                onChange={(e) => handleSmtpChange('from', e.target.value)}
                placeholder="noreply@example.com"
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                发件人地址域名需要与SMTP服务器域名一致，否则可能被拒收
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                发件人名称
              </label>
              <input
                type="text"
                value={config.smtp?.fromName || ''}
                onChange={(e) => handleSmtpChange('fromName', e.target.value)}
                placeholder="Mio日记系统"
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                显示在邮件发件人栏的名称
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.smtp?.secure || false}
                  onChange={(e) => handleSmtpChange('secure', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  使用SSL/TLS加密连接
                </span>
              </label>
            </div>
          </div>

          {/* 测试邮件 */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              发送测试邮件
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="输入测试邮箱地址"
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
              />
              <button
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors whitespace-nowrap text-sm"
              >
                {testingEmail ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                发送测试
              </button>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-center sm:justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;