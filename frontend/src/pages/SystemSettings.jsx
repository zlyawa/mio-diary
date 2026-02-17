import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
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
  Search,
  X,
  Activity,
  Database,
  Server,
  Check,
  AlertCircle,
  RefreshCw,
  Download,
  FileUp,
  AlertTriangle,
  Bell,
  Info,
  CheckCircle,
  Palette,
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  BarChart3,
  Zap,
  Layout,
  Users,
  Lock,
  Eye,
  EyeOff,
  Code,
  Trash2,
  History,
  Wrench,
  ChevronRight,
  FileText,
  Sparkles,
  Monitor,
  Moon,
  Sun,
  Smartphone,
  Filter,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  FileJson,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  Pin,
  Edit3,
} from 'lucide-react';

/**
 * 验证函数
 */
const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  port: (value) => {
    const port = parseInt(value);
    return port >= 1 && port <= 65535;
  },
  url: (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  required: (value) => value && value.trim().length > 0,
  ip: (value) => {
    if (!value) return true;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipRegex.test(value);
  },
};

/**
 * 操作类型标签映射
 */
const ACTION_LABELS = {
  'CREATE_DIARY': '创建日记',
  'UPDATE_DIARY': '更新日记',
  'DELETE_DIARY': '删除日记',
  'REVIEW_DIARY': '审核日记',
  'PUBLISH_DIARY': '发布日记',
  'UNPUBLISH_DIARY': '取消发布日记',
  'BAN_USER': '封禁用户',
  'UNBAN_USER': '解封用户',
  'RESET_PASSWORD': '重置密码',
  'UPDATE_CONFIG': '更新配置',
  'DELETE_COMMENT': '删除评论',
  'REVIEW_COMMENT': '审核评论',
  'CREATE_CATEGORY': '创建分类',
  'UPDATE_CATEGORY': '更新分类',
  'DELETE_CATEGORY': '删除分类',
  'CLEAR_CACHE': '清理缓存',
  'EXPORT_DATA': '导出数据',
  'IMPORT_DATA': '导入数据',
  'LOGIN': '登录系统',
  'LOGOUT': '退出登录',
  'UPDATE_PROFILE': '更新资料',
  'UPDATE_AVATAR': '更新头像',
  'MAINTENANCE_MODE': '切换维护模式',
};

/**
 * 配置项名称映射
 */
const CONFIG_KEY_LABELS = {
  'siteName': '网站名称',
  'siteDescription': '网站描述',
  'siteIcon': '网站Logo',
  'siteIco': '网站Favicon',
  'loginBg': '登录页背景',
  'registerBg': '注册页背景',
  'forgotPasswordBg': '找回密码页背景',
  'primaryColor': '主题色',
  'defaultTheme': '默认主题',
  'showDiaryCount': '显示日记数量',
  'enableHeatmap': '启用热力图',
  'itemsPerPage': '每页显示数量',
  'enableComment': '评论功能',
  'enableCommentReview': '评论审核',
  'allowGuestComment': '允许游客评论',
  'commentMaxLength': '评论最大长度',
  'enableLike': '点赞功能',
  'enableFavorite': '收藏功能',
  'enableShare': '分享功能',
  'enableStatistics': '统计功能',
  'allowRegister': '允许注册',
  'requireEmailVerify': '需要邮箱验证',
  'enableUserReview': '用户发布审核',
  'defaultUserRole': '默认用户角色',
  'enableCaptcha': '启用验证码',
  'minPasswordLength': '最小密码长度',
  'enableContentFilter': '内容过滤',
  'enableIpBlacklist': 'IP黑名单',
  'ipBlacklist': '黑名单IP列表',
  'sensitiveWords': '敏感词列表',
  'smtp.host': 'SMTP服务器',
  'smtp.port': 'SMTP端口',
  'smtp.user': 'SMTP用户名',
  'smtp.pass': 'SMTP密码',
  'smtp.from': '发件人地址',
  'smtp.fromName': '发件人名称',
  'smtp.secure': 'SMTP加密',
  'aiModerationEnabled': 'AI审核',
  'zhipuApiKey': '智谱AI API Key',
  'zhipuModel': 'AI模型',
  'maintenanceMode': '维护模式',
  'maintenanceMessage': '维护提示信息',
};

/**
 * 变更类型标签映射
 */
const CHANGE_TYPE_LABELS = {
  'create': { label: '创建', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  'update': { label: '更新', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  'delete': { label: '删除', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

/**
 * 敏感配置项（需要隐藏真实值）
 */
const SENSITIVE_CONFIG_KEYS = ['smtp.pass', 'zhipuApiKey', 'smtp.user'];

/**
 * 获取配置项显示名称
 */
const getConfigKeyLabel = (key) => {
  return CONFIG_KEY_LABELS[key] || key;
};

/**
 * 邮件模板配置
 */
const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: '欢迎邮件',
    description: '新用户注册成功后发送',
    subject: '欢迎加入 {{siteName}}！',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #4f46e5;">您好，{{username}}！</h1>
  <p>欢迎加入 <strong>{{siteName}}</strong>，开始记录您的美好生活！</p>
  <p>我们很高兴您能加入我们，希望您能在这里找到属于自己的空间。</p>
  <div style="margin: 30px 0; text-align: center;">
    <a href="{{siteUrl}}" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">立即访问网站</a>
  </div>
  <p style="color: #6b7280; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
</div>`,
    variables: ['username', 'siteName', 'siteUrl'],
  },
  {
    id: 'verifyEmail',
    name: '邮箱验证邮件',
    description: '用户邮箱验证时发送',
    subject: '请验证您的邮箱 - {{siteName}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #4f46e5;">验证您的邮箱</h1>
  <p>您好 {{username}}，</p>
  <p>感谢您注册 {{siteName}}！请点击下方按钮验证您的邮箱地址：</p>
  <div style="margin: 30px 0; text-align: center;">
    <a href="{{verifyLink}}" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">验证邮箱</a>
  </div>
  <p>或者复制以下链接到浏览器：</p>
  <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">{{verifyLink}}</p>
  <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">此链接将在24小时后过期。</p>
</div>`,
    variables: ['username', 'siteName', 'verifyLink'],
  },
  {
    id: 'passwordReset',
    name: '密码重置邮件',
    description: '用户申请重置密码时发送',
    subject: '密码重置请求 - {{siteName}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #4f46e5;">重置您的密码</h1>
  <p>您好 {{username}}，</p>
  <p>我们收到了您的密码重置请求。请点击下方按钮重置密码：</p>
  <div style="margin: 30px 0; text-align: center;">
    <a href="{{resetLink}}" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">重置密码</a>
  </div>
  <p>或者复制以下链接到浏览器：</p>
  <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">{{resetLink}}</p>
  <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件。</p>
</div>`,
    variables: ['username', 'siteName', 'resetLink'],
  },
  {
    id: 'passwordChanged',
    name: '密码修改通知',
    description: '用户成功修改密码后发送',
    subject: '密码已修改 - {{siteName}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #4f46e5;">密码修改成功</h1>
  <p>您好 {{username}}，</p>
  <p>您的密码已成功修改。如果这不是您本人的操作，请立即联系我们。</p>
  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e;"><strong>安全提示：</strong>请定期更换密码以确保账户安全。</p>
  </div>
  <p style="color: #6b7280; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
</div>`,
    variables: ['username', 'siteName'],
  },
  {
    id: 'commentNotification',
    name: '评论通知邮件',
    description: '日记收到新评论时发送给作者',
    subject: '您的日记收到了新评论 - {{siteName}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #4f46e5;">新评论通知</h1>
  <p>您好 {{username}}，</p>
  <p>您的日记 <strong>《{{diaryTitle}}》</strong> 收到了一条新评论：</p>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #374151;">{{commentContent}}</p>
  </div>
  <div style="margin: 30px 0; text-align: center;">
    <a href="{{siteUrl}}" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">查看详情</a>
  </div>
  <p style="color: #6b7280; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
</div>`,
    variables: ['username', 'siteName', 'diaryTitle', 'commentContent', 'siteUrl'],
  },
  {
    id: 'reviewNotification',
    name: '审核通知邮件',
    description: '日记审核状态变更时发送',
    subject: '日记审核结果通知 - {{siteName}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #4f46e5;">审核结果通知</h1>
  <p>您好 {{username}}，</p>
  <p>您的日记 <strong>《{{diaryTitle}}》</strong> 审核已完成。</p>
  <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; color: #065f46;"><strong>审核通过</strong> - 您的日记已发布</p>
  </div>
  <div style="margin: 30px 0; text-align: center;">
    <a href="{{siteUrl}}" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">查看日记</a>
  </div>
  <p style="color: #6b7280; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
</div>`,
    variables: ['username', 'siteName', 'diaryTitle', 'siteUrl'],
  },
];

/**
 * Toast通知组件
 */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[type]}`}>
      {icons[type]}
      <span className="text-sm font-medium text-gray-900 dark:text-white">{message}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * 设置分类配置
 */
const SETTING_CATEGORIES = [
  {
    id: 'basic',
    name: '基础设置',
    icon: Layout,
    description: '网站信息、外观、界面配置',
    subCategories: [
      { id: 'site', name: '网站信息', icon: Globe },
      { id: 'appearance', name: '外观设置', icon: Palette },
      { id: 'display', name: '显示选项', icon: Monitor },
    ],
  },
  {
    id: 'features',
    name: '功能模块',
    icon: Zap,
    description: '日记、评论、互动功能开关',
    subCategories: [
      { id: 'diary', name: '日记功能', icon: FileText },
      { id: 'comment', name: '评论系统', icon: MessageCircle },
      { id: 'interaction', name: '互动功能', icon: Heart },
    ],
  },
  {
    id: 'security',
    name: '用户与安全',
    icon: Shield,
    description: '注册、审核、安全策略',
    subCategories: [
      { id: 'register', name: '注册设置', icon: UserCheck },
      { id: 'content', name: '内容审核', icon: Eye },
      { id: 'protection', name: '安全防护', icon: Lock },
    ],
  },
  {
    id: 'services',
    name: '系统服务',
    icon: Server,
    description: '邮件、AI、缓存服务配置',
    subCategories: [
      { id: 'email', name: '邮件服务', icon: Mail },
      { id: 'emailTemplates', name: '邮件模板', icon: Mail },
      { id: 'ai', name: 'AI审核', icon: Sparkles },
      { id: 'storage', name: '存储缓存', icon: Database },
    ],
  },
  {
    id: 'advanced',
    name: '高级设置',
    icon: Wrench,
    description: '维护模式、导入导出、系统监控、公告管理、配置历史、数据概览',
    subCategories: [
      { id: 'maintenance', name: '维护管理', icon: AlertTriangle },
      { id: 'backup', name: '备份恢复', icon: Download },
      { id: 'monitor', name: '系统监控', icon: Activity },
      { id: 'logs', name: '系统日志', icon: History },
      { id: 'announcements', name: '公告管理', icon: Bell },
      { id: 'configHistory', name: '配置历史', icon: History },
      { id: 'overview', name: '数据概览', icon: BarChart3 },
    ],
  },
];

/**
 * 切换开关组件
 */
const ToggleSwitch = ({ checked, onChange, label, description, disabled = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-3">
    <div className="flex-1">
      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{label}</h3>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      )}
    </div>
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`p-1 rounded-full transition-colors flex-shrink-0 ${
        checked
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-gray-400 dark:text-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {checked ? (
        <ToggleRight className="w-10 h-10 sm:w-12 sm:h-12" />
      ) : (
        <ToggleLeft className="w-10 h-10 sm:w-12 sm:h-12" />
      )}
    </button>
  </div>
);

/**
 * 输入框组件
 */
const InputField = ({ label, value, onChange, placeholder, type = 'text', error, helpText, disabled = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 sm:px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-colors ${
        error
          ? 'border-red-300 dark:border-red-600 focus:border-red-500'
          : 'border-gray-300 dark:border-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    {helpText && !error && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helpText}</p>}
  </div>
);

/**
 * 文本域组件
 */
const TextArea = ({ label, value, onChange, placeholder, rows = 3, helpText, disabled = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label}
    </label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm sm:text-base ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    />
    {helpText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helpText}</p>}
  </div>
);

/**
 * 图片上传组件
 */
const ImageUpload = ({ label, value, onChange, helpText, previewSize = 'w-20 h-12' }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onChange(response.data.data.imageUrl);
    } catch (err) {
      console.error('上传失败:', err);
      alert('上传失败: ' + (err.response?.data?.message || '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="输入图片URL或上传文件"
            className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
          />
          <label className={`flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm ${uploading ? 'opacity-50' : ''}`}>
            <Upload className="w-4 h-4" />
            <span>{uploading ? '上传中...' : '上传'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {value && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <img
              src={getImageUrl(value)}
              alt="预览"
              className={`${previewSize} object-cover rounded flex-shrink-0`}
              onError={(e) => e.target.style.display = 'none'}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
              {value}
            </span>
            <button
              onClick={() => onChange('')}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {helpText && <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>}
      </div>
    </div>
  );
};

/**
 * 设置卡片组件
 */
const SettingCard = ({ title, icon: Icon, children, description }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-4 sm:mb-6">
      {Icon && <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
    {children}
  </div>
);

/**
 * 日志详情弹窗组件
 */
const LogDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  let parsedDetails = {};
  try {
    parsedDetails = log.details ? JSON.parse(log.details) : {};
  } catch (e) {
    parsedDetails = { raw: log.details };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            日志详情
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">操作类型</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {ACTION_LABELS[log.action] || log.action}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">操作时间</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(log.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">管理员</label>
                <div className="flex items-center gap-2 mt-1">
                  {log.admin?.avatarUrl && (
                    <img
                      src={getImageUrl(log.admin.avatarUrl)}
                      alt={log.admin.username}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {log.admin?.username || '未知'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">日志ID</label>
                <p className="text-sm font-mono text-gray-600 dark:text-gray-400">{log.id}</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">操作详情</label>
              <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                {JSON.stringify(parsedDetails, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 配置变更详情弹窗组件
 */
const ConfigLogDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  // 格式化JSON显示
  const formatJson = (value) => {
    if (!value) return '';
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  // 判断是否为敏感字段
  const isSensitive = (key) => SENSITIVE_CONFIG_KEYS.includes(key);

  // 获取变更类型样式
  const changeTypeStyle = CHANGE_TYPE_LABELS[log.changeType] || CHANGE_TYPE_LABELS.update;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              配置变更详情
            </h3>
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${changeTypeStyle.bg} ${changeTypeStyle.text}`}>
              {changeTypeStyle.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">配置项</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getConfigKeyLabel(log.configKey || log.key)}
              </p>
              <p className="text-xs text-gray-400 font-mono">{log.configKey || log.key}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">变更时间</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(log.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">操作者</label>
              <div className="flex items-center gap-2 mt-1">
                {log.admin?.avatarUrl && (
                  <img
                    src={getImageUrl(log.admin.avatarUrl)}
                    alt={log.admin.username}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {log.admin?.username || '未知'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">IP地址</label>
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">{log.ipAddress || '-'}</p>
            </div>
          </div>

          {/* 值对比 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">值变更对比</h4>
            
            {isSensitive(log.configKey || log.key) ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  该配置项包含敏感信息，已隐藏具体值
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 旧值 */}
                <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">旧值</span>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900">
                    {log.oldValue ? (
                      <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
                        {formatJson(log.oldValue)}
                      </pre>
                    ) : (
                      <span className="text-gray-400 italic text-sm">无</span>
                    )}
                  </div>
                </div>

                {/* 新值 */}
                <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
                  <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b border-green-200 dark:border-green-800">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">新值</span>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900">
                    {log.newValue ? (
                      <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
                        {formatJson(log.newValue)}
                      </pre>
                    ) : (
                      <span className="text-gray-400 italic text-sm">无</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Agent */}
          {log.userAgent && (
            <div className="mt-6">
              <label className="text-xs text-gray-500 dark:text-gray-400">浏览器信息</label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono break-all">
                {log.userAgent}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 系统设置页面
 */
const SystemSettings = () => {
  const { refreshConfig } = useConfig();
  const [activeCategory, setActiveCategory] = useState('basic');
  const [activeSubCategory, setActiveSubCategory] = useState('site');
  
  // 配置状态
  const [config, setConfig] = useState({
    // 基础设置
    siteName: 'Mio日记',
    siteDescription: '',
    siteIcon: '',
    siteIco: '',
    loginBg: '',
    registerBg: '',
    forgotPasswordBg: '',
    // 外观
    primaryColor: 'indigo',
    defaultTheme: 'auto',
    showDiaryCount: false,
    enableHeatmap: false,
    itemsPerPage: 20,
    // 功能开关
    enableComment: false,
    enableCommentReview: false,
    allowGuestComment: false,
    commentMaxLength: 1000,
    enableLike: false,
    enableFavorite: false,
    enableShare: false,
    enableStatistics: false,
    // 用户安全
    allowRegister: true,
    requireEmailVerify: false,
    enableUserReview: false,
    defaultUserRole: 'user',
    enableCaptcha: false,
    minPasswordLength: 8,
    // 内容安全
    enableContentFilter: false,
    enableIpBlacklist: false,
    sensitiveWords: [],
    // 邮件
    smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '', fromName: '' },
    // AI
    aiModerationEnabled: false,
    zhipuApiKey: '',
    zhipuModel: 'glm-4.7-flash',
    aiModerationThreshold: 'medium',
    // 高级
    maintenanceMode: false,
    maintenanceMessage: '系统正在维护中，请稍后再试...',
  });
  
  // UI状态
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [originalConfig, setOriginalConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 系统健康
  const [systemHealth, setSystemHealth] = useState({});
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // 自动刷新开关
  
  // 邮件测试
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  // AI审核测试
  const [testingAI, setTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  // 日志相关状态
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [logsFilter, setLogsFilter] = useState({
    action: '',
    adminId: '',
    startDate: '',
    endDate: '',
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetail, setShowLogDetail] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  // 公告管理
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'info',
    priority: 0,
    isPinned: false,
    isActive: true,
    startAt: '',
    endAt: '',
  });

  // 配置历史相关状态
  const [configLogs, setConfigLogs] = useState([]);
  const [configLogsLoading, setConfigLogsLoading] = useState(false);
  const [configLogsPagination, setConfigLogsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [configLogsFilter, setConfigLogsFilter] = useState({
    key: '',
    changeType: '',
    startDate: '',
    endDate: '',
  });
  const [selectedConfigLog, setSelectedConfigLog] = useState(null);
  const [showConfigLogDetail, setShowConfigLogDetail] = useState(false);

  // 数据概览仪表盘
  const [dashboardStats, setDashboardStats] = useState({
    users: { total: 0, newToday: 0, newThisWeek: 0, newThisMonth: 0, activeToday: 0 },
    diaries: { total: 0, publishedToday: 0, publishedThisWeek: 0, publishedThisMonth: 0, pendingReview: 0 },
    comments: { total: 0, today: 0, pendingReview: 0 },
    interactions: { totalLikes: 0, totalFavorites: 0, totalShares: 0 },
    system: { diskUsage: 0, dbSize: '0 MB', uptime: 0 },
  });
  const [trends, setTrends] = useState({
    dates: [],
    users: [],
    diaries: [],
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardLastUpdated, setDashboardLastUpdated] = useState(null);
  const [dashboardAutoRefresh, setDashboardAutoRefresh] = useState(true);

  // 数据清理相关状态
  const [cleanupStats, setCleanupStats] = useState({
    logs: { total: 15420, oldCount: 8920, size: '256 MB' },
    tempFiles: { count: 156, size: '45 MB' },
    cache: { entries: 3420, size: '12 MB' },
    deletedDiaries: { count: 128, size: '8.5 MB' },
    oldNotifications: { count: 5230 },
    uploads: { totalFiles: 892, totalSize: '1.2 GB', orphanedFiles: 23 },
  });
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [cleanupType, setCleanupType] = useState(null);
  const [cleanupConfirmText, setCleanupConfirmText] = useState('');
  const [cleanupResult, setCleanupResult] = useState(null);

  // 是否有未保存的更改
  const hasUnsavedChanges = useMemo(() => {
    return originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);
  }, [config, originalConfig]);

  // 数字动画组件
  const AnimatedNumber = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(value);

    useEffect(() => {
      const startValue = previousValue.current;
      const endValue = value;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          previousValue.current = value;
        }
      };

      requestAnimationFrame(animate);
    }, [value, duration]);

    return <span>{displayValue.toLocaleString()}</span>;
  };

  // 条形图组件
  const BarChart = ({ data, labels, color = 'bg-indigo-500', height = 128 }) => {
    const max = Math.max(...data, 1);
    
    return (
      <div className="flex items-end gap-1 sm:gap-2" style={{ height: `${height}px` }}>
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className={`w-full ${color} rounded-t transition-all duration-500 hover:opacity-80`}
              style={{ height: `${(value / max) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
              title={`${labels[index]}: ${value}`}
            />
          </div>
        ))}
      </div>
    );
  };

  // 趋势线组件
  const TrendLine = ({ data, color = '#6366f1', width = 100, height = 40 }) => {
    if (data.length < 2) return null;
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          className="drop-shadow-sm"
        />
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
              className="hover:r-4 transition-all"
            />
          );
        })}
      </svg>
    );
  };

  // 获取仪表盘数据
  const fetchDashboardStats = async () => {
    try {
      setDashboardLoading(true);
      const response = await api.get('/admin/dashboard');
      if (response.data) {
        setDashboardStats(response.data.stats || dashboardStats);
        setTrends(response.data.trends || trends);
        setDashboardLastUpdated(new Date());
      }
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
      setToast({ message: '获取仪表盘数据失败', type: 'error' });
    } finally {
      setDashboardLoading(false);
    }
  };

  // 格式化运行时间
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  // 获取公告列表
  const fetchAnnouncements = async () => {
    try {
      setAnnouncementLoading(true);
      const response = await api.get('/admin/announcements');
      setAnnouncements(response.data.announcements || []);
    } catch (err) {
      console.error('获取公告列表失败:', err);
      setToast({ message: '获取公告列表失败', type: 'error' });
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // 打开创建公告模态框
  const openCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({
      title: '',
      content: '',
      type: 'info',
      priority: 0,
      isPinned: false,
      isActive: true,
      startAt: '',
      endAt: '',
    });
    setAnnouncementModalOpen(true);
  };

  // 打开编辑公告模态框
  const openEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
      isActive: announcement.isActive,
      startAt: announcement.startAt || '',
      endAt: announcement.endAt || '',
    });
    setAnnouncementModalOpen(true);
  };

  // 保存公告
  const saveAnnouncement = async () => {
    if (!announcementForm.title.trim()) {
      setToast({ message: '请输入公告标题', type: 'error' });
      return;
    }
    if (!announcementForm.content.trim()) {
      setToast({ message: '请输入公告内容', type: 'error' });
      return;
    }

    try {
      if (editingAnnouncement) {
        await api.put(`/admin/announcements/${editingAnnouncement.id}`, announcementForm);
        setToast({ message: '公告更新成功', type: 'success' });
      } else {
        await api.post('/admin/announcements', announcementForm);
        setToast({ message: '公告创建成功', type: 'success' });
      }
      setAnnouncementModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('保存公告失败:', err);
      setToast({ message: err.response?.data?.message || '保存公告失败', type: 'error' });
    }
  };

  // 删除公告
  const deleteAnnouncement = async (id) => {
    if (!confirm('确定要删除这个公告吗？')) return;

    try {
      await api.delete(`/admin/announcements/${id}`);
      setToast({ message: '公告删除成功', type: 'success' });
      fetchAnnouncements();
    } catch (err) {
      console.error('删除公告失败:', err);
      setToast({ message: '删除公告失败', type: 'error' });
    }
  };

  // 切换公告状态
  const toggleAnnouncementStatus = async (announcement) => {
    try {
      await api.put(`/admin/announcements/${announcement.id}`, {
        isActive: !announcement.isActive
      });
      setToast({ message: announcement.isActive ? '公告已禁用' : '公告已启用', type: 'success' });
      fetchAnnouncements();
    } catch (err) {
      console.error('更新公告状态失败:', err);
      setToast({ message: '更新公告状态失败', type: 'error' });
    }
  };

  // 获取日志列表
  const fetchLogs = async (page = 1, limit = logsPagination.limit) => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (logsFilter.action) params.append('action', logsFilter.action);
      if (logsFilter.adminId) params.append('adminId', logsFilter.adminId);
      if (logsFilter.startDate) params.append('startDate', logsFilter.startDate);
      if (logsFilter.endDate) params.append('endDate', logsFilter.endDate);

      const response = await api.get(`/admin/logs?${params.toString()}`);
      setLogs(response.data.logs || []);
      setLogsPagination(response.data.pagination || { page: 1, limit, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('获取日志失败:', err);
      setToast({ message: '获取日志失败', type: 'error' });
    } finally {
      setLogsLoading(false);
    }
  };

  // 获取配置历史
  const fetchConfigLogs = async (page = 1, limit = configLogsPagination.limit) => {
    try {
      setConfigLogsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (configLogsFilter.key) params.append('key', configLogsFilter.key);
      if (configLogsFilter.changeType) params.append('changeType', configLogsFilter.changeType);
      if (configLogsFilter.startDate) params.append('startDate', configLogsFilter.startDate);
      if (configLogsFilter.endDate) params.append('endDate', configLogsFilter.endDate);

      const response = await api.get(`/admin/settings/logs?${params.toString()}`);
      setConfigLogs(response.data.logs || []);
      setConfigLogsPagination(response.data.pagination || { page: 1, limit, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('获取配置历史失败:', err);
      setToast({ message: '获取配置历史失败', type: 'error' });
    } finally {
      setConfigLogsLoading(false);
    }
  };

  // 导出日志
  const exportLogs = (format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    if (format === 'json') {
      const exportData = {
        exportedAt: new Date().toISOString(),
        filter: logsFilter,
        logs: logs,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mio-diary-logs-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['ID', '时间', '管理员', '操作类型', '详情'];
      const rows = logs.map(log => [
        log.id,
        new Date(log.createdAt).toLocaleString('zh-CN'),
        log.admin?.username || '未知',
        log.action,
        log.details || '',
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mio-diary-logs-${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setToast({ message: `日志已导出为 ${format.toUpperCase()}`, type: 'success' });
  };

  // 初始化加载
  useEffect(() => {
    fetchConfig();
    fetchLogs(1);
    fetchAnnouncements();
  }, []);

  // 页面关闭前提示
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 仪表盘数据自动刷新
  useEffect(() => {
    if (activeSubCategory === 'overview') {
      fetchDashboardStats();
      
      let interval;
      if (dashboardAutoRefresh) {
        interval = setInterval(() => {
          fetchDashboardStats();
        }, 5 * 60 * 1000); // 5分钟
      }
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [activeSubCategory, dashboardAutoRefresh]);

  // 获取配置
  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/settings');
      const configData = response.data.config || {};
      setConfig((prev) => ({ ...prev, ...configData }));
      setOriginalConfig(JSON.parse(JSON.stringify({ ...config, ...configData })));
    } catch (err) {
      console.error('获取系统配置失败:', err);
      setError(err.response?.data?.message || '获取系统配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    // 验证
    const errors = {};
    if (config.smtp?.host && !validators.required(config.smtp.host)) {
      errors.smtpHost = 'SMTP服务器地址不能为空';
    }
    if (config.smtp?.port && !validators.port(config.smtp.port)) {
      errors.smtpPort = '端口范围应在1-65535之间';
    }
    if (config.smtp?.from && !validators.email(config.smtp.from)) {
      errors.smtpFrom = '发件人邮箱格式不正确';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setToast({ message: '请修正表单中的错误', type: 'error' });
      return;
    }

    setValidationErrors({});

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.put('/admin/settings', config);
      await refreshConfig();
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setToast({ message: '系统配置已保存', type: 'success' });
    } catch (err) {
      console.error('保存系统配置失败:', err);
      setError(err.response?.data?.message || '保存失败');
      setToast({ message: err.response?.data?.message || '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 更新配置字段
  const updateConfig = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 更新嵌套配置字段
  const updateNestedConfig = useCallback((parent, key, value) => {
    setConfig((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value },
    }));
  }, []);

  // 测试邮件
  const handleTestEmail = async () => {
    if (!testEmailAddress || !validators.email(testEmailAddress)) {
      setToast({ message: '请输入有效的测试邮箱地址', type: 'warning' });
      return;
    }

    try {
      setTestingEmail(true);
      await api.post('/admin/email/test', { to: testEmailAddress });
      setToast({ message: '测试邮件已发送', type: 'success' });
      setTestEmailAddress('');
    } catch (err) {
      console.error('发送测试邮件失败:', err);
      setToast({ message: err.response?.data?.message || '发送失败', type: 'error' });
    } finally {
      setTestingEmail(false);
    }
  };

  // 测试AI审核
  const handleTestAI = async () => {
    if (!config.zhipuApiKey) {
      setToast({ message: '请先配置智谱AI API Key', type: 'warning' });
      return;
    }

    try {
      setTestingAI(true);
      setAiTestResult(null);
      const response = await api.post('/admin/ai-moderation/test', {
        zhipuApiKey: config.zhipuApiKey,
        zhipuModel: config.zhipuModel,
        aiModerationThreshold: config.aiModerationThreshold,
      });
      setAiTestResult(response.data);
      setToast({ message: 'AI审核服务连接成功', type: 'success' });
    } catch (err) {
      console.error('AI审核测试失败:', err);
      setAiTestResult({
        error: true,
        message: err.response?.data?.message || '连接失败',
        results: err.response?.data?.data?.results || [],
      });
      setToast({ message: err.response?.data?.message || 'AI审核测试失败', type: 'error' });
    } finally {
      setTestingAI(false);
    }
  };

  // 系统健康检查
  const checkSystemHealth = async () => {
    try {
      setCheckingHealth(true);
      const response = await api.get('/admin/health');
      // 保存完整的状态信息，包括时间戳
      setSystemHealth({
        ...response.data.checks,
        timestamp: response.data.timestamp,
      });
      setToast({ message: '系统健康状态已更新', type: 'success' });
    } catch (err) {
      console.error('获取系统健康状态失败:', err);
      setToast({ message: err.response?.data?.message || '获取系统健康状态失败', type: 'error' });
    } finally {
      setCheckingHealth(false);
    }
  };

  // 系统健康自动刷新（60秒）
  useEffect(() => {
    if (!autoRefresh || activeSubCategory !== 'monitor') return;

    // 立即刷新一次
    const doRefresh = async () => {
      try {
        const response = await api.get('/admin/health');
        setSystemHealth({
          ...response.data.checks,
          timestamp: response.data.timestamp,
        });
      } catch (err) {
        console.error('自动刷新系统健康状态失败:', err);
      }
    };

    doRefresh();

    // 设置定时器
    const intervalId = setInterval(doRefresh, 60000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, activeSubCategory]);

  // 导出配置
  const handleExportConfig = () => {
    const exportData = {
      version: '2.0.2',
      exportedAt: new Date().toISOString(),
      config: config,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mio-diary-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ message: '配置已导出', type: 'success' });
  };

  // 导入配置
  const handleImportConfig = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm('导入配置将覆盖当前所有设置，确定要继续吗？')) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      if (!importData.config) {
        throw new Error('无效的配置文件');
      }
      await api.put('/admin/settings', importData.config);
      await fetchConfig();
      await refreshConfig();
      setToast({ message: '配置已导入', type: 'success' });
    } catch (err) {
      console.error('导入配置失败:', err);
      setToast({ message: err.message || '导入配置失败', type: 'error' });
    } finally {
      e.target.value = '';
    }
  };

  // 重置配置
  const handleReset = async () => {
    if (!window.confirm('确定要重置所有配置为默认值吗？此操作不可撤销。')) {
      return;
    }

    try {
      setSaving(true);
      await api.post('/admin/settings/reset');
      await fetchConfig();
      await refreshConfig();
      setToast({ message: '配置已重置为默认值', type: 'success' });
    } catch (err) {
      console.error('重置配置失败:', err);
      setToast({ message: '重置失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 显示配置变更详情
  const showConfigLogDetailModal = (log) => {
    setSelectedConfigLog(log);
    setShowConfigLogDetail(true);
  };

  // 格式化配置值显示
  const formatConfigValue = (value, key) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">空</span>;
    }

    // 敏感信息隐藏
    if (SENSITIVE_CONFIG_KEYS.includes(key)) {
      return <span className="text-gray-500">***</span>;
    }

    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'boolean') {
        return parsed ? (
          <span className="text-green-600 dark:text-green-400">启用</span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">禁用</span>
        );
      }
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return <span className="text-gray-400 italic">空数组</span>;
        return <span className="text-gray-600 dark:text-gray-400">[数组，{parsed.length}项]</span>;
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return <span className="text-gray-600 dark:text-gray-400">{JSON.stringify(parsed).slice(0, 50)}...</span>;
      }
      return String(parsed);
    } catch {
      // 不是JSON，直接显示
      if (value === 'true') return <span className="text-green-600 dark:text-green-400">启用</span>;
      if (value === 'false') return <span className="text-gray-500 dark:text-gray-400">禁用</span>;
      return String(value).slice(0, 100);
    }
  };

  // 切换日志展开状态
  const toggleLogExpand = (logId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // 显示日志详情
  const showLogDetailModal = (log) => {
    setSelectedLog(log);
    setShowLogDetail(true);
  };

  // 搜索过滤
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return SETTING_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    return SETTING_CATEGORIES.map((cat) => ({
      ...cat,
      subCategories: cat.subCategories.filter(
        (sub) =>
          sub.name.toLowerCase().includes(query) ||
          cat.name.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.subCategories.length > 0);
  }, [searchQuery]);

  // 获取所有可用的操作类型（用于日志筛选）
  const availableActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  // 获取所有可用的配置项（用于配置历史筛选）
  const availableConfigKeys = useMemo(() => {
    const keys = new Set(configLogs.map(log => log.configKey || log.key));
    return Array.from(keys).sort();
  }, [configLogs]);

  // 当切换到配置历史页面时加载配置历史
  useEffect(() => {
    if (activeSubCategory === 'configHistory' && configLogs.length === 0) {
      fetchConfigLogs(1);
    }
  }, [activeSubCategory]);

  // 渲染基础设置 - 网站信息
  const renderSiteInfo = () => (
    <div className="space-y-6">
      <SettingCard title="网站信息" icon={Globe} description="配置网站的基本信息">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="网站名称"
            value={config.siteName}
            onChange={(v) => updateConfig('siteName', v)}
            placeholder="Mio日记"
          />
          <div className="md:col-span-2">
            <TextArea
              label="网站描述"
              value={config.siteDescription}
              onChange={(v) => updateConfig('siteDescription', v)}
              placeholder="一个简洁优雅的个人日记应用..."
              helpText="网站描述将显示在浏览器标签页和分享链接中"
            />
          </div>
        </div>
      </SettingCard>

      <SettingCard title="网站标识" icon={Image} description="设置网站的Logo和图标">
        <div className="space-y-4">
          <ImageUpload
            label="网站Logo"
            value={config.siteIcon}
            onChange={(v) => updateConfig('siteIcon', v)}
            helpText="建议尺寸 200x200 像素，支持 PNG、JPG、SVG 格式"
            previewSize="w-12 h-12"
          />
          <ImageUpload
            label="网站Favicon"
            value={config.siteIco}
            onChange={(v) => updateConfig('siteIco', v)}
            helpText="浏览器标签页图标，建议尺寸 32x32 或 64x64 像素"
            previewSize="w-8 h-8"
          />
        </div>
      </SettingCard>

      <SettingCard title="登录页背景" icon={Layout} description="自定义登录、注册、找回密码页面的背景">
        <div className="space-y-4">
          <ImageUpload
            label="登录页背景"
            value={config.loginBg}
            onChange={(v) => updateConfig('loginBg', v)}
            previewSize="w-20 h-12"
          />
          <ImageUpload
            label="注册页背景"
            value={config.registerBg}
            onChange={(v) => updateConfig('registerBg', v)}
            previewSize="w-20 h-12"
          />
          <ImageUpload
            label="找回密码页背景"
            value={config.forgotPasswordBg}
            onChange={(v) => updateConfig('forgotPasswordBg', v)}
            previewSize="w-20 h-12"
          />
        </div>
      </SettingCard>
    </div>
  );

  // 渲染基础设置 - 外观
  const renderAppearance = () => (
    <div className="space-y-6">
      <SettingCard title="主题设置" icon={Palette} description="选择网站的主题颜色和默认模式">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              主题色
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'indigo', label: '靛蓝', color: 'bg-indigo-500' },
                { key: 'blue', label: '蓝色', color: 'bg-blue-500' },
                { key: 'green', label: '绿色', color: 'bg-green-500' },
                { key: 'purple', label: '紫色', color: 'bg-purple-500' },
                { key: 'red', label: '红色', color: 'bg-red-500' },
                { key: 'amber', label: '琥珀', color: 'bg-amber-500' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => updateConfig('primaryColor', item.key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    config.primaryColor === item.key
                      ? 'ring-2 ring-indigo-500 bg-gray-50 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              默认主题模式
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'light', label: '浅色', icon: Sun },
                { key: 'dark', label: '深色', icon: Moon },
                { key: 'auto', label: '跟随系统', icon: Smartphone },
              ].map((theme) => (
                <button
                  key={theme.key}
                  onClick={() => updateConfig('defaultTheme', theme.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.defaultTheme === theme.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <theme.icon className="w-4 h-4" />
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  // 渲染基础设置 - 显示选项
  const renderDisplay = () => (
    <div className="space-y-6">
      <SettingCard title="列表显示" icon={Monitor} description="配置日记列表的显示选项">
        <div className="space-y-4">
          <ToggleSwitch
            label="显示日记数量"
            description="在侧边栏显示用户的日记总数"
            checked={config.showDiaryCount}
            onChange={(v) => updateConfig('showDiaryCount', v)}
          />
          <ToggleSwitch
            label="启用热力图"
            description="在统计页面显示日记发布热力图"
            checked={config.enableHeatmap}
            onChange={(v) => updateConfig('enableHeatmap', v)}
          />
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              每页显示数量
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={config.itemsPerPage}
              onChange={(e) => updateConfig('itemsPerPage', parseInt(e.target.value) || 20)}
              className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              日记列表每页显示的条目数量（5-100）
            </p>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  // 渲染功能模块 - 日记功能
  const renderDiaryFeatures = () => (
    <div className="space-y-6">
      <SettingCard title="日记功能" icon={FileText} description="配置日记相关的功能选项">
        <div className="space-y-4">
          <ToggleSwitch
            label="启用分享功能"
            description="允许用户分享日记给他人"
            checked={config.enableShare}
            onChange={(v) => updateConfig('enableShare', v)}
          />
          <ToggleSwitch
            label="启用统计功能"
            description="显示日记统计数据和图表"
            checked={config.enableStatistics}
            onChange={(v) => updateConfig('enableStatistics', v)}
          />
        </div>
      </SettingCard>
    </div>
  );

  // 渲染功能模块 - 评论系统
  const renderCommentFeatures = () => (
    <div className="space-y-6">
      <SettingCard title="评论开关" icon={MessageCircle} description="启用或禁用评论功能">
        <div className="space-y-4">
          <ToggleSwitch
            label="启用评论功能"
            description="允许用户对日记发表评论"
            checked={config.enableComment}
            onChange={(v) => updateConfig('enableComment', v)}
          />
          {config.enableComment && (
            <>
              <ToggleSwitch
                label="评论需要审核"
                description="评论发表后需要管理员审核才能显示"
                checked={config.enableCommentReview}
                onChange={(v) => updateConfig('enableCommentReview', v)}
              />
              <ToggleSwitch
                label="允许游客评论"
                description="未登录用户也可以发表评论"
                checked={config.allowGuestComment}
                onChange={(v) => updateConfig('allowGuestComment', v)}
              />
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  评论最大长度
                </label>
                <input
                  type="number"
                  min={100}
                  max={5000}
                  value={config.commentMaxLength}
                  onChange={(e) => updateConfig('commentMaxLength', parseInt(e.target.value) || 1000)}
                  className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  单条评论允许的最大字符数
                </p>
              </div>
            </>
          )}
        </div>
      </SettingCard>
    </div>
  );

  // 渲染功能模块 - 互动功能
  const renderInteractionFeatures = () => (
    <div className="space-y-6">
      <SettingCard title="互动功能" icon={Heart} description="配置点赞、收藏等互动功能">
        <div className="space-y-4">
          <ToggleSwitch
            label="启用点赞功能"
            description="允许用户对日记点赞"
            checked={config.enableLike}
            onChange={(v) => updateConfig('enableLike', v)}
          />
          <ToggleSwitch
            label="启用收藏功能"
            description="允许用户收藏日记到个人收藏夹"
            checked={config.enableFavorite}
            onChange={(v) => updateConfig('enableFavorite', v)}
          />
        </div>
      </SettingCard>
    </div>
  );

  // 渲染用户与安全 - 注册设置
  const renderRegisterSettings = () => (
    <div className="space-y-6">
      <SettingCard title="注册控制" icon={UserCheck} description="配置用户注册相关的选项">
        <div className="space-y-4">
          <ToggleSwitch
            label="允许新用户注册"
            description="关闭后新用户将无法注册账号"
            checked={config.allowRegister}
            onChange={(v) => updateConfig('allowRegister', v)}
          />
          {config.allowRegister && (
            <>
              <ToggleSwitch
                label="注册需要邮箱验证"
                description="新用户需要通过邮箱验证才能激活账号"
                checked={config.requireEmailVerify}
                onChange={(v) => updateConfig('requireEmailVerify', v)}
              />
              <ToggleSwitch
                label="启用验证码"
                description="注册时要求输入图形验证码防止机器人"
                checked={config.enableCaptcha}
                onChange={(v) => updateConfig('enableCaptcha', v)}
              />
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  默认用户角色
                </label>
                <select
                  value={config.defaultUserRole}
                  onChange={(e) => updateConfig('defaultUserRole', e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  新注册用户默认分配的角色
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  最小密码长度
                </label>
                <input
                  type="number"
                  min={6}
                  max={32}
                  value={config.minPasswordLength}
                  onChange={(e) => updateConfig('minPasswordLength', parseInt(e.target.value) || 8)}
                  className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  用户密码最小长度要求（6-32位）
                </p>
              </div>
            </>
          )}
        </div>
      </SettingCard>
    </div>
  );

  // 渲染用户与安全 - 内容审核
  const renderContentReview = () => (
    <div className="space-y-6">
      <SettingCard title="内容审核" icon={Eye} description="配置日记和评论的审核策略">
        <div className="space-y-4">
          <ToggleSwitch
            label="启用日记审核"
            description="用户发布的日记需要管理员审核后才能公开"
            checked={config.enableUserReview}
            onChange={(v) => updateConfig('enableUserReview', v)}
          />
          <ToggleSwitch
            label="启用内容过滤"
            description="自动检测和过滤敏感词汇"
            checked={config.enableContentFilter}
            onChange={(v) => updateConfig('enableContentFilter', v)}
          />
        </div>
      </SettingCard>
    </div>
  );

  // 渲染用户与安全 - 安全防护
  const renderSecurityProtection = () => (
    <div className="space-y-6">
      <SettingCard title="IP黑名单" icon={Lock} description="管理被禁止访问的IP地址">
        <div className="space-y-4">
          <ToggleSwitch
            label="启用IP黑名单"
            description="阻止特定IP地址访问系统"
            checked={config.enableIpBlacklist}
            onChange={(v) => updateConfig('enableIpBlacklist', v)}
          />
          {config.enableIpBlacklist && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                黑名单IP列表
              </label>
              <textarea
                value={(config.ipBlacklist || []).join('\n')}
                onChange={(e) => updateConfig('ipBlacklist', e.target.value.split('\n').filter(ip => ip.trim()))}
                placeholder="每行一个IP地址&#10;例如：&#10;192.168.1.1&#10;10.0.0.1"
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                每行输入一个IP地址，支持 IPv4 格式
              </p>
            </div>
          )}
        </div>
      </SettingCard>
    </div>
  );

  // 渲染系统服务 - 邮件服务
  const renderEmailService = () => (
    <div className="space-y-6">
      <SettingCard title="SMTP配置" icon={Mail} description="配置邮件服务器用于发送系统邮件">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="SMTP服务器地址"
            value={config.smtp?.host}
            onChange={(v) => updateNestedConfig('smtp', 'host', v)}
            placeholder="smtp.example.com"
            helpText="邮件服务器主机地址"
          />
          <InputField
            label="端口"
            value={config.smtp?.port}
            onChange={(v) => updateNestedConfig('smtp', 'port', parseInt(v) || 587)}
            placeholder="587"
            helpText="常用端口：25(无加密)、587(TLS)、465(SSL)"
          />
          <InputField
            label="用户名"
            value={config.smtp?.user}
            onChange={(v) => updateNestedConfig('smtp', 'user', v)}
            placeholder="your@email.com"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              密码
            </label>
            <input
              type="password"
              value={config.smtp?.pass?.startsWith('enc:') ? '' : (config.smtp?.pass || '')}
              onChange={(e) => updateNestedConfig('smtp', 'pass', e.target.value)}
              placeholder={config.smtp?.pass?.startsWith('enc:') ? '•••••••• (已保存，输入新密码以修改)' : '••••••••'}
              className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
            />
            {config.smtp?.pass?.startsWith('enc:') && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                密码已加密保存，留空保持不变，输入新密码以修改
              </p>
            )}
          </div>
          <InputField
            label="发件人地址"
            value={config.smtp?.from}
            onChange={(v) => updateNestedConfig('smtp', 'from', v)}
            placeholder="noreply@example.com"
            helpText="发件人邮箱，域名应与SMTP服务器一致"
          />
          <InputField
            label="发件人名称"
            value={config.smtp?.fromName}
            onChange={(v) => updateNestedConfig('smtp', 'fromName', v)}
            placeholder="Mio日记"
            helpText="显示在邮件中的发件人名称"
          />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.smtp?.secure || false}
              onChange={(e) => updateNestedConfig('smtp', 'secure', e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              使用SSL/TLS加密连接
            </span>
          </label>
        </div>
      </SettingCard>

      <SettingCard title="邮件测试" icon={Send} description="测试邮件发送功能是否正常">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="输入测试邮箱地址"
            className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
          />
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors whitespace-nowrap text-sm"
          >
            {testingEmail ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
            发送测试
          </button>
        </div>
      </SettingCard>
    </div>
  );

  // 邮件模板编辑状态
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ subject: '', content: '' });

  // 渲染系统服务 - 邮件模板
  const renderEmailTemplates = () => {
    // 获取已保存的模板配置，如果没有则使用默认模板
    const savedTemplates = config.emailTemplates || {};

    const handleEditTemplate = (template) => {
      const saved = savedTemplates[template.id] || {};
      setEditingTemplate(template.id);
      setTemplateForm({
        subject: saved.subject || template.subject,
        content: saved.content || template.content,
      });
    };

    const handleSaveTemplate = (templateId) => {
      updateNestedConfig('emailTemplates', templateId, { ...templateForm });
      setEditingTemplate(null);
      setTemplateForm({ subject: '', content: '' });
    };

    const handleResetTemplate = (template) => {
      // 删除自定义配置，恢复默认
      const newTemplates = { ...config.emailTemplates };
      delete newTemplates[template.id];
      updateConfig('emailTemplates', newTemplates);
    };

    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                邮件模板说明
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                自定义邮件模板内容。使用双花括号 <code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">{'{{变量名}}'}</code> 插入动态内容。
                修改后需要点击保存按钮才能生效。
              </p>
            </div>
          </div>
        </div>

        {EMAIL_TEMPLATES.map((template) => {
          const saved = savedTemplates[template.id] || {};
          const isEditing = editingTemplate === template.id;
          const hasChanges = saved.subject || saved.content;

          return (
            <SettingCard
              key={template.id}
              title={template.name}
              icon={Mail}
              description={template.description}
            >
              <div className="space-y-4">
                {/* 可用变量 */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">可用变量：</span>
                  {template.variables.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>

                {isEditing ? (
                  <>
                    {/* 编辑模式 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        邮件主题
                      </label>
                      <input
                        type="text"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        邮件内容 (HTML)
                      </label>
                      <textarea
                        value={templateForm.content}
                        onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                        rows={12}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveTemplate(template.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Save className="w-4 h-4" />
                        保存修改
                      </button>
                      <button
                        onClick={() => {
                          setEditingTemplate(null);
                          setTemplateForm({ subject: '', content: '' });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 预览模式 */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">邮件主题：</div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {saved.subject || template.subject}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">邮件内容：</div>
                      <div
                        className="text-sm text-gray-900 dark:text-white prose prose-sm dark:prose-invert max-w-none overflow-x-auto"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(saved.content || template.content),
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        编辑模板
                      </button>
                      {hasChanges && (
                        <button
                          onClick={() => handleResetTemplate(template)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          恢复默认
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </SettingCard>
          );
        })}
      </div>
    );
  };

  // 渲染系统服务 - AI审核
  const renderAIService = () => (
    <div className="space-y-6">
      <SettingCard title="AI内容审核" icon={Sparkles} description="使用AI自动审核评论内容">
        <div className="space-y-4">
          {/* 审核说明 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              审核说明
            </h4>
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
              <p><strong>审核对象：</strong>用户提交的评论内容</p>
              <p><strong>审核内容：</strong>暴力恐怖、色情淫秽、政治敏感、广告垃圾、人身攻击、谣言虚假、违法犯罪、侵犯隐私</p>
              <p><strong>审核流程：</strong>AI审核通过 → 直接发布；AI审核不通过 → 进入待审核状态，等待管理员审核</p>
              <p><strong>注意事项：</strong>需要配置智谱AI API Key，若未配置或服务不可用，评论将直接进入待审核状态</p>
            </div>
          </div>

          <ToggleSwitch
            label="启用AI审核"
            description="开启后将使用AI自动检测评论中的违规内容"
            checked={config.aiModerationEnabled}
            onChange={(v) => updateConfig('aiModerationEnabled', v)}
          />
          {config.aiModerationEnabled && (
            <>
              <InputField
                label="智谱AI API Key"
                type="password"
                value={config.zhipuApiKey}
                onChange={(v) => updateConfig('zhipuApiKey', v)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                helpText="从智谱AI开放平台 (open.bigmodel.cn) 获取的API密钥"
              />
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI模型
                </label>
                <select
                  value={config.zhipuModel}
                  onChange={(e) => updateConfig('zhipuModel', e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="glm-4.7-flash">GLM-4.7-Flash（文本，免费）</option>
                  <option value="glm-4.5-flash">GLM-4.5-Flash（文本，免费）</option>
                  <option value="glm-4-flash-250414">GLM-4-Flash-250414（文本，免费）</option>
                  <option value="glm-4.6v-flash">GLM-4.6V-Flash（图文，免费）</option>
                  <option value="glm-4v-flash">GLM-4V-Flash（图文，免费）</option>
                  <option value="glm-4-flash">GLM-4-Flash（文本）</option>
                  <option value="glm-4">GLM-4（标准）</option>
                  <option value="glm-4-plus">GLM-4-Plus（高级）</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  图文审核自动使用GLM-4.6V-Flash视觉模型，纯文本使用GLM-4.7-Flash
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  审核阈值
                </label>
                <select
                  value={config.aiModerationThreshold}
                  onChange={(e) => updateConfig('aiModerationThreshold', e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="low">宽松 - 仅拒绝明显违规</option>
                  <option value="medium">适中 - 平衡审核力度</option>
                  <option value="high">严格 - 严格审核所有可疑内容</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  阈值越低越严格，更多内容会被标记为待审核
                </p>
              </div>

              {/* AI审核测试 */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  连接测试
                </label>
                <button
                  onClick={handleTestAI}
                  disabled={testingAI || !config.zhipuApiKey}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  {testingAI ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                  {testingAI ? '测试中...' : '测试连接'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  测试AI审核服务是否配置正确
                </p>

                {/* 测试结果 */}
                {aiTestResult && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    aiTestResult.error
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  }`}>
                    <div className="font-medium mb-2">
                      {aiTestResult.error ? '测试失败' : '测试成功'}
                    </div>
                    {aiTestResult.results && aiTestResult.results.length > 0 && (
                      <div className="space-y-2 text-xs">
                        {aiTestResult.results.map((result, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              result.error ? 'bg-red-500' : result.passed ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></span>
                            <div>
                              <div className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                {result.type === 'image' && (
                                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                )}
                                {result.content}
                                {result.type === 'image' && result.model && (
                                  <span className="text-indigo-500 text-[10px]">({result.model})</span>
                                )}
                              </div>
                              {result.error ? (
                                <div className="text-red-600 dark:text-red-400">{result.error}</div>
                              ) : (
                                <div className="text-gray-500 dark:text-gray-400">
                                  {result.passed ? '通过' : '待审核'} - {result.reason}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SettingCard>
    </div>
  );

  // 渲染系统服务 - 存储缓存
  const renderStorageService = () => (
    <div className="space-y-6">
      <SettingCard title="存储配置" icon={Database} description="文件存储和缓存设置">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                存储配置说明
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                文件存储路径和缓存配置需要在服务端配置文件中进行修改。
                如需调整，请修改后端 .env 文件并重启服务。
              </p>
            </div>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  // 渲染高级设置 - 维护管理
  const renderMaintenance = () => (
    <div className="space-y-6">
      <SettingCard title="维护模式" icon={AlertTriangle} description="系统维护时使用，普通用户无法访问">
        <div className="space-y-4">
          <ToggleSwitch
            label="启用维护模式"
            description="开启后仅管理员可以访问系统"
            checked={config.maintenanceMode}
            onChange={(v) => updateConfig('maintenanceMode', v)}
          />
          {config.maintenanceMode && (
            <TextArea
              label="维护提示信息"
              value={config.maintenanceMessage}
              onChange={(v) => updateConfig('maintenanceMessage', v)}
              placeholder="系统正在维护中，请稍后再试..."
              helpText="用户访问时显示的提示信息"
            />
          )}
        </div>
      </SettingCard>

      <SettingCard title="缓存管理" icon={Database} description="清理系统缓存数据">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            清理系统缓存可以解决一些显示异常的问题
          </p>
          <button
            onClick={async () => {
              try {
                await api.post('/admin/settings/cache/clear');
                setToast({ message: '缓存已清理', type: 'success' });
              } catch (err) {
                setToast({ message: '清理缓存失败', type: 'error' });
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            清理系统缓存
          </button>
        </div>
      </SettingCard>
    </div>
  );

  // 渲染高级设置 - 备份恢复
  const renderBackup = () => (
    <div className="space-y-6">
      <SettingCard title="配置备份" icon={Download} description="导出或导入系统配置">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              导出配置
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              将当前系统配置导出为JSON文件，用于备份或迁移
            </p>
            <button
              onClick={handleExportConfig}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              导出配置
            </button>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              导入配置
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              从JSON文件导入配置，将覆盖当前所有设置
            </p>
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer text-sm inline-flex">
              <FileUp className="w-4 h-4" />
              选择配置文件
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportConfig}
              />
            </label>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
              重置配置
            </h4>
            <p className="text-xs text-red-700 dark:text-red-400 mb-3">
              将所有配置恢复为默认值，此操作不可撤销
            </p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              恢复默认配置
            </button>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  // 渲染高级设置 - 系统监控
  const renderMonitor = () => {
    // 状态配置映射
    const getStatusConfig = (status) => {
      const configs = {
        healthy: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', iconBg: 'bg-green-100 dark:bg-green-800', iconColor: 'text-green-600 dark:text-green-400', label: '正常' },
        configured: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', iconBg: 'bg-blue-100 dark:bg-blue-800', iconColor: 'text-blue-600 dark:text-blue-400', label: '已配置' },
        unhealthy: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', iconBg: 'bg-red-100 dark:bg-red-800', iconColor: 'text-red-600 dark:text-red-400', label: '异常' },
        error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', iconBg: 'bg-red-100 dark:bg-red-800', iconColor: 'text-red-600 dark:text-red-400', label: '错误' },
        not_configured: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', iconBg: 'bg-amber-100 dark:bg-amber-800', iconColor: 'text-amber-600 dark:text-amber-400', label: '未配置' },
        unknown: { bg: 'bg-gray-50 dark:bg-gray-700/50', border: 'border-gray-200 dark:border-gray-600', iconBg: 'bg-gray-200 dark:bg-gray-600', iconColor: 'text-gray-500 dark:text-gray-400', label: '未知' },
      };
      return configs[status] || configs.unknown;
    };

    const services = [
      { key: 'database', name: '数据库', icon: Database, description: 'SQLite 数据库连接状态' },
      { key: 'redis', name: 'Redis缓存', icon: Database, description: 'Redis 缓存服务状态' },
      { key: 'email', name: '邮件服务', icon: Mail, description: 'SMTP 邮件发送服务' },
      { key: 'ai', name: 'AI服务', icon: Sparkles, description: '智谱AI 审核服务' },
    ];

    return (
      <div className="space-y-6">
        <SettingCard title="系统健康检查" icon={Activity} description="查看系统各组件运行状态">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">自动刷新</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-1 rounded-full transition-colors ${
                  autoRefresh
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {autoRefresh ? (
                  <ToggleRight className="w-10 h-10 sm:w-12 sm:h-12" />
                ) : (
                  <ToggleLeft className="w-10 h-10 sm:w-12 sm:h-12" />
                )}
              </button>
              {autoRefresh && (
                <span className="text-xs text-gray-500 dark:text-gray-400">每60秒自动刷新</span>
              )}
            </div>
            <button
              onClick={checkSystemHealth}
              disabled={checkingHealth}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${checkingHealth ? 'animate-spin' : ''}`} />
              {checkingHealth ? '检查中...' : '立即刷新'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service) => {
              const healthInfo = systemHealth[service.key] || {};
              const status = healthInfo.status || 'unknown';
              const cfg = getStatusConfig(status);

              return (
                <div key={service.key} className={`p-4 rounded-lg border ${cfg.bg} ${cfg.border} transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cfg.iconBg}`}>
                      <service.icon className={`w-5 h-5 ${cfg.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">{service.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${cfg.bg} ${cfg.iconColor}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {healthInfo.message || (healthInfo.responseTime ? `${healthInfo.responseTime}ms` : service.description)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SettingCard>

        {/* 系统资源监控 */}
        <SettingCard title="系统资源" icon={Server} description="查看系统资源使用情况">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 内存使用 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">系统内存</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {systemHealth.memory?.used || 0} MB / {systemHealth.memory?.total || 0} MB
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (systemHealth.memory?.usagePercent || 0) > 80
                      ? 'bg-red-500'
                      : (systemHealth.memory?.usagePercent || 0) > 60
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${systemHealth.memory?.usagePercent || 0}%` }}
                />
              </div>
              {systemHealth.memory?.process && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {systemHealth.memory.process.message}
                </p>
              )}
            </div>

            {/* 磁盘空间 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">磁盘空间</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {systemHealth.disk?.diskUsed || 0} MB / {systemHealth.disk?.diskTotal || 0} MB
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (systemHealth.disk?.diskPercent || 0) > 90
                      ? 'bg-red-500'
                      : (systemHealth.disk?.diskPercent || 0) > 70
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${systemHealth.disk?.diskPercent || 0}%` }}
                />
              </div>
              {systemHealth.disk?.dbSize !== undefined && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  数据库大小: {systemHealth.disk.dbSize} MB
                </p>
              )}
            </div>
          </div>

          {/* 系统信息 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">系统版本</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">v2.0.2</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">数据库响应</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemHealth.database?.responseTime ? `${systemHealth.database.responseTime}ms` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Redis响应</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemHealth.redis?.responseTime ? `${systemHealth.redis.responseTime}ms` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">检查时间</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemHealth.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString('zh-CN') : '-'}
                </p>
              </div>
            </div>
          </div>
        </SettingCard>
      </div>
    );
  };

  // 渲染高级设置 - 公告管理
  const renderAnnouncements = () => {
    const typeConfig = {
      info: { label: '信息', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      warning: { label: '警告', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      success: { label: '成功', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
      error: { label: '错误', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
    };

    return (
      <div className="space-y-6">
        <SettingCard
          title="公告列表"
          icon={Bell}
          description="管理系统公告，支持定时发布和置顶"
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={openCreateAnnouncement}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              新建公告
            </button>
          </div>

          {announcementLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无公告</p>
              <p className="text-sm mt-1">点击上方按钮创建第一条公告</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">标题</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">类型</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">状态</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">优先级</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">时间范围</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((announcement) => {
                    const typeStyle = typeConfig[announcement.type] || typeConfig.info;
                    return (
                      <tr
                        key={announcement.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {announcement.isPinned && (
                              <span className="text-amber-500" title="置顶">
                                <Pin className="w-4 h-4" />
                              </span>
                            )}
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                              {announcement.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border} border`}>
                            {typeStyle.label}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => toggleAnnouncementStatus(announcement)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              announcement.isActive
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {announcement.isActive ? (
                              <><Check className="w-3 h-3" /> 启用</>
                            ) : (
                              <><X className="w-3 h-3" /> 禁用</>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                          {announcement.priority}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                          {announcement.startAt || announcement.endAt ? (
                            <div className="text-xs">
                              {announcement.startAt && (
                                <div>开始: {new Date(announcement.startAt).toLocaleString()}</div>
                              )}
                              {announcement.endAt && (
                                <div>结束: {new Date(announcement.endAt).toLocaleString()}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">不限</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditAnnouncement(announcement)}
                              className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="编辑"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAnnouncement(announcement.id)}
                              className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SettingCard>

        {/* 公告编辑弹窗 */}
        {announcementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingAnnouncement ? '编辑公告' : '新建公告'}
                </h3>
                <button
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* 标题 */}
                <InputField
                  label="公告标题"
                  value={announcementForm.title}
                  onChange={(v) => setAnnouncementForm((prev) => ({ ...prev, title: v }))}
                  placeholder="请输入公告标题"
                />

                {/* 内容 */}
                <TextArea
                  label="公告内容"
                  value={announcementForm.content}
                  onChange={(v) => setAnnouncementForm((prev) => ({ ...prev, content: v }))}
                  placeholder="请输入公告内容，支持HTML标签"
                  rows={5}
                  helpText="支持使用HTML标签进行简单格式化"
                />

                {/* 实时预览 */}
                {announcementForm.content && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      预览效果
                    </label>
                    <div
                      className={`p-3 rounded-lg border ${typeConfig[announcementForm.type].bg} ${typeConfig[announcementForm.type].border} border`}
                    >
                      <div className="font-medium text-sm mb-1 text-gray-900 dark:text-white">
                        {announcementForm.title || '公告标题'}
                      </div>
                      <div
                        className={`text-sm ${typeConfig[announcementForm.type].text}`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcementForm.content, { ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'a', 'br'], ALLOWED_ATTR: ['href', 'target', 'rel'] }) }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 类型 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      公告类型
                    </label>
                    <select
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="info">信息</option>
                      <option value="warning">警告</option>
                      <option value="success">成功</option>
                      <option value="error">错误</option>
                    </select>
                  </div>

                  {/* 优先级 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      优先级
                    </label>
                    <input
                      type="number"
                      value={announcementForm.priority}
                      onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">数值越大，排序越靠前</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 开始时间 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      开始时间（可选）
                    </label>
                    <input
                      type="datetime-local"
                      value={announcementForm.startAt}
                      onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, startAt: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* 结束时间 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      结束时间（可选）
                    </label>
                    <input
                      type="datetime-local"
                      value={announcementForm.endAt}
                      onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, endAt: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>

                {/* 开关选项 */}
                <div className="space-y-3">
                  <ToggleSwitch
                    label="置顶公告"
                    description="置顶公告将显示在最前面"
                    checked={announcementForm.isPinned}
                    onChange={(v) => setAnnouncementForm((prev) => ({ ...prev, isPinned: v }))}
                  />
                  <ToggleSwitch
                    label="立即启用"
                    description="关闭后公告不会显示给用户"
                    checked={announcementForm.isActive}
                    onChange={(v) => setAnnouncementForm((prev) => ({ ...prev, isActive: v }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={saveAnnouncement}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  {editingAnnouncement ? '保存' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染高级设置 - 系统日志
  const renderLogs = () => {
    return (
      <div className="space-y-6">
        <SettingCard title="日志筛选" icon={Filter} description="筛选和搜索系统操作日志">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                操作类型
              </label>
              <select
                value={logsFilter.action}
                onChange={(e) => setLogsFilter(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">全部类型</option>
                {availableActions.map(action => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action] || action}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={logsFilter.startDate}
                onChange={(e) => setLogsFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={logsFilter.endDate}
                onChange={(e) => setLogsFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchLogs(1)}
                disabled={logsLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
              >
                <Search className="w-4 h-4" />
                {logsLoading ? '加载中...' : '筛选'}
              </button>
            </div>
          </div>
        </SettingCard>

        <SettingCard title="操作日志" icon={History} description="查看系统管理员操作记录">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {logsPagination.total} 条记录
              {logsPagination.totalPages > 0 && `，第 ${logsPagination.page}/${logsPagination.totalPages} 页`}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={logsPagination.limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  setLogsPagination(prev => ({ ...prev, limit: newLimit }));
                  fetchLogs(1, newLimit);
                }}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value={10}>每页 10 条</option>
                <option value={20}>每页 20 条</option>
                <option value={50}>每页 50 条</option>
                <option value={100}>每页 100 条</option>
              </select>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                  <Download className="w-4 h-4" />
                  导出
                </button>
                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => exportLogs('json')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg"
                  >
                    <FileJson className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    onClick={() => exportLogs('csv')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无操作日志</p>
            </div>
          ) : (
            <>
              {/* 桌面端表格 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">时间</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">管理员</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">操作类型</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">详情</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {log.admin?.avatarUrl && (
                              <img
                                src={getImageUrl(log.admin.avatarUrl)}
                                alt={log.admin.username}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {log.admin?.username || '未知'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                            {log.details ? JSON.parse(log.details || '{}').summary || '查看详情' : '-'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => showLogDetailModal(log)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm"
                          >
                            详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 移动端卡片 */}
              <div className="sm:hidden space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.admin?.avatarUrl && (
                          <img
                            src={getImageUrl(log.admin.avatarUrl)}
                            alt={log.admin.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.admin?.username || '未知'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </div>
                    {expandedLogs.has(log.id) && log.details && (
                      <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                          {JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <button
                        onClick={() => toggleLogExpand(log.id)}
                        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {expandedLogs.has(log.id) ? (
                          <><ChevronUp className="w-4 h-4" /> 收起</>
                        ) : (
                          <><ChevronDown className="w-4 h-4" /> 展开</>
                        )}
                      </button>
                      <button
                        onClick={() => showLogDetailModal(log)}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {logsPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => fetchLogs(logsPagination.page - 1)}
                    disabled={logsPagination.page <= 1 || logsLoading}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    上一页
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {logsPagination.page} / {logsPagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchLogs(logsPagination.page + 1)}
                    disabled={logsPagination.page >= logsPagination.totalPages || logsLoading}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </SettingCard>

        {/* 日志详情弹窗 */}
        {showLogDetail && (
          <LogDetailModal
            log={selectedLog}
            onClose={() => {
              setShowLogDetail(false);
              setSelectedLog(null);
            }}
          />
        )}
      </div>
    );
  };

  // 渲染高级设置 - 配置历史
  const renderConfigHistory = () => {
    return (
      <div className="space-y-6">
        <SettingCard title="配置筛选" icon={Filter} description="筛选配置变更记录">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                配置项
              </label>
              <select
                value={configLogsFilter.key}
                onChange={(e) => setConfigLogsFilter(prev => ({ ...prev, key: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">全部配置项</option>
                {availableConfigKeys.map(key => (
                  <option key={key} value={key}>
                    {getConfigKeyLabel(key)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                变更类型
              </label>
              <select
                value={configLogsFilter.changeType}
                onChange={(e) => setConfigLogsFilter(prev => ({ ...prev, changeType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">全部类型</option>
                <option value="create">创建</option>
                <option value="update">更新</option>
                <option value="delete">删除</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={configLogsFilter.startDate}
                onChange={(e) => setConfigLogsFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={configLogsFilter.endDate}
                onChange={(e) => setConfigLogsFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchConfigLogs(1)}
                disabled={configLogsLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
              >
                <Search className="w-4 h-4" />
                {configLogsLoading ? '加载中...' : '筛选'}
              </button>
            </div>
          </div>
        </SettingCard>

        <SettingCard title="配置变更历史" icon={History} description="查看系统配置的变更记录">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {configLogsPagination.total} 条记录
              {configLogsPagination.totalPages > 0 && `，第 ${configLogsPagination.page}/${configLogsPagination.totalPages} 页`}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={configLogsPagination.limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  setConfigLogsPagination(prev => ({ ...prev, limit: newLimit }));
                  fetchConfigLogs(1, newLimit);
                }}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value={10}>每页 10 条</option>
                <option value={20}>每页 20 条</option>
                <option value={50}>每页 50 条</option>
                <option value={100}>每页 100 条</option>
              </select>
            </div>
          </div>

          {configLogsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : configLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无配置变更记录</p>
              <p className="text-sm mt-1">配置发生变更后将显示在这里</p>
            </div>
          ) : (
            <>
              {/* 桌面端表格 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">时间</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">操作者</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">配置项</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">类型</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">变更摘要</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configLogs.map((log) => {
                      const changeTypeStyle = CHANGE_TYPE_LABELS[log.changeType] || CHANGE_TYPE_LABELS.update;
                      return (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {log.admin?.avatarUrl && (
                                <img
                                  src={getImageUrl(log.admin.avatarUrl)}
                                  alt={log.admin.username}
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                              <span className="text-sm text-gray-900 dark:text-white">
                                {log.admin?.username || '未知'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {getConfigKeyLabel(log.configKey || log.key)}
                            </span>
                            <p className="text-xs text-gray-400 font-mono">{log.configKey || log.key}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${changeTypeStyle.bg} ${changeTypeStyle.text}`}>
                              {changeTypeStyle.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              <span className="text-red-600 dark:text-red-400 line-through">
                                {formatConfigValue(log.oldValue, log.configKey || log.key)}
                              </span>
                              <span className="mx-2 text-gray-400">→</span>
                              <span className="text-green-600 dark:text-green-400">
                                {formatConfigValue(log.newValue, log.configKey || log.key)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => showConfigLogDetailModal(log)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm"
                            >
                              查看详情
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 移动端卡片 */}
              <div className="sm:hidden space-y-3">
                {configLogs.map((log) => {
                  const changeTypeStyle = CHANGE_TYPE_LABELS[log.changeType] || CHANGE_TYPE_LABELS.update;
                  return (
                    <div key={log.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {log.admin?.avatarUrl && (
                            <img
                              src={getImageUrl(log.admin.avatarUrl)}
                              alt={log.admin.username}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.admin?.username || '未知'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(log.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${changeTypeStyle.bg} ${changeTypeStyle.text}`}>
                          {changeTypeStyle.label}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getConfigKeyLabel(log.configKey || log.key)}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{log.configKey || log.key}</p>
                      </div>
                      <div className="mt-2 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-red-600 dark:text-red-400 line-through">
                            {formatConfigValue(log.oldValue, log.configKey || log.key)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 dark:text-green-400">
                            {formatConfigValue(log.newValue, log.configKey || log.key)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 text-right">
                        <button
                          onClick={() => showConfigLogDetailModal(log)}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              {configLogsPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => fetchConfigLogs(configLogsPagination.page - 1)}
                    disabled={configLogsPagination.page <= 1 || configLogsLoading}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    上一页
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {configLogsPagination.page} / {configLogsPagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchConfigLogs(configLogsPagination.page + 1)}
                    disabled={configLogsPagination.page >= configLogsPagination.totalPages || configLogsLoading}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </SettingCard>

        {/* 配置变更详情弹窗 */}
        {showConfigLogDetail && (
          <ConfigLogDetailModal
            log={selectedConfigLog}
            onClose={() => {
              setShowConfigLogDetail(false);
              setSelectedConfigLog(null);
            }}
          />
        )}
      </div>
    );
  };

  // 渲染高级设置 - 数据概览
  const renderOverview = () => {
    const { users = {}, diaries = {}, comments = {}, interactions = {}, system = {} } = dashboardStats || {};

    // 统计卡片配置
    const statCards = [
      {
        id: 'users',
        title: '用户统计',
        icon: Users,
        color: 'blue',
        total: users.total || 0,
        today: users.newToday || 0,
        week: users.newThisWeek || 0,
        month: users.newThisMonth || 0,
        extra: { label: '今日活跃', value: users.activeToday || 0 },
        trend: trends?.users || [],
      },
      {
        id: 'diaries',
        title: '日记统计',
        icon: FileText,
        color: 'indigo',
        total: diaries.total || 0,
        today: diaries.publishedToday || 0,
        week: diaries.publishedThisWeek || 0,
        month: diaries.publishedThisMonth || 0,
        extra: { label: '待审核', value: diaries.pendingReview || 0, alert: (diaries.pendingReview || 0) > 0 },
        trend: trends?.diaries || [],
      },
      {
        id: 'interactions',
        title: '互动统计',
        icon: Heart,
        color: 'pink',
        total: (interactions.totalLikes || 0) + (interactions.totalFavorites || 0) + (interactions.totalShares || 0),
        likes: interactions.totalLikes || 0,
        favorites: interactions.totalFavorites || 0,
        shares: interactions.totalShares || 0,
        isInteraction: true,
      },
    ];

    const colorMap = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
      indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', icon: 'text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500' },
      pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', icon: 'text-pink-600 dark:text-pink-400', bar: 'bg-pink-500' },
    };

    return (
      <div className="space-y-6">
        {/* 快捷操作栏 */}
        <SettingCard title="快捷操作" icon={Zap} description="快速访问常用功能">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveSubCategory('logs')}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-full">
                <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">系统日志</span>
            </button>
            <button
              onClick={() => setActiveSubCategory('monitor')}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">系统健康</span>
            </button>
            <button
              onClick={() => setActiveSubCategory('announcements')}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="p-3 bg-amber-100 dark:bg-amber-800 rounded-full">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">公告管理</span>
            </button>
            <button
              onClick={() => window.open('/admin/diaries/review', '_blank')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
                (diaries.pendingReview || 0) > 0 || (comments.pendingReview || 0) > 0
                  ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className={`p-3 rounded-full ${
                (diaries.pendingReview || 0) > 0 || (comments.pendingReview || 0) > 0
                  ? 'bg-red-100 dark:bg-red-800'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}>
                <Eye className={`w-5 h-5 ${
                  (diaries.pendingReview || 0) > 0 || (comments.pendingReview || 0) > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                待审核
                {((diaries.pendingReview || 0) > 0 || (comments.pendingReview || 0) > 0) && (
                  <span className="ml-1 text-red-600 dark:text-red-400">
                    ({(diaries.pendingReview || 0) + (comments.pendingReview || 0)})
                  </span>
                )}
              </span>
            </button>
          </div>
        </SettingCard>

        {/* 刷新控制 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">自动刷新</span>
            <button
              onClick={() => setDashboardAutoRefresh(!dashboardAutoRefresh)}
              className={`p-1 rounded-full transition-colors ${
                dashboardAutoRefresh
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {dashboardAutoRefresh ? (
                <ToggleRight className="w-10 h-10 sm:w-12 sm:h-12" />
              ) : (
                <ToggleLeft className="w-10 h-10 sm:w-12 sm:h-12" />
              )}
            </button>
            {dashboardAutoRefresh && (
              <span className="text-xs text-gray-500 dark:text-gray-400">每5分钟自动刷新</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardStats}
              disabled={dashboardLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
              {dashboardLoading ? '刷新中...' : '刷新数据'}
            </button>
            {dashboardLastUpdated && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {dashboardLastUpdated.toLocaleTimeString('zh-CN')}
              </span>
            )}
          </div>
        </div>

        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {statCards.map((card) => {
            const colors = colorMap[card.color];
            
            return (
              <div
                key={card.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow`}
              >
                {/* 卡片头部 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${colors.bg} ${colors.border} border`}>
                      <card.icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{card.title}</h3>
                  </div>
                  <TrendLine 
                    data={card.trend || [0, 0, 0, 0, 0, 0, 0]} 
                    color={card.color === 'blue' ? '#3b82f6' : card.color === 'indigo' ? '#6366f1' : '#ec4899'}
                    width={80}
                    height={32}
                  />
                </div>

                {/* 卡片内容 */}
                {card.isInteraction ? (
                  // 互动统计卡片
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        <AnimatedNumber value={card.total} />
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">总互动</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <Heart className="w-4 h-4 text-pink-500 mx-auto mb-1" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          <AnimatedNumber value={card.likes} />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">点赞</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <Bookmark className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          <AnimatedNumber value={card.favorites} />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">收藏</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Share2 className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          <AnimatedNumber value={card.shares} />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">分享</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 普通统计卡片
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        <AnimatedNumber value={card.total} />
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        总{card.id === 'users' ? '用户' : '日记'}
                      </span>
                    </div>
                    
                    {/* 统计数据网格 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <TrendLine data={[0, card.today]} color="#10b981" width={20} height={12} />
                          今日
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          +{card.today}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <TrendLine data={[0, 0, card.week]} color="#3b82f6" width={20} height={12} />
                          本周
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          +{card.week}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <TrendLine data={[0, 0, 0, card.month]} color="#8b5cf6" width={20} height={12} />
                          本月
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          +{card.month}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${card.extra?.alert ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : colors.bg + ' ' + colors.border} border`}>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{card.extra?.label}</div>
                        <p className={`text-lg font-semibold ${card.extra?.alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {card.extra?.value}
                        </p>
                      </div>
                    </div>

                    {/* 7天趋势条形图 */}
                    {card.trend && card.trend.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">最近7天趋势</p>
                        <BarChart
                          data={card.trend}
                          labels={trends.dates}
                          color={colors.bar}
                          height={64}
                        />
                        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                          <span>{trends.dates[0]?.slice(5)}</span>
                          <span>{trends.dates[trends.dates.length - 1]?.slice(5)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 评论统计卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">评论统计</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber value={comments.total} />
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">总评论</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                +<AnimatedNumber value={comments.today} />
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">今日新增</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${comments.pendingReview > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
              <p className={`text-2xl sm:text-3xl font-bold ${comments.pendingReview > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                <AnimatedNumber value={comments.pendingReview} />
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">待审核</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {comments.total > 0 ? ((comments.today / comments.total) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">日增长率</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 获取清理类型显示名称
  const getCleanupTypeLabel = (type) => {
    const labels = {
      logs: '30天前的系统日志',
      tempFiles: '所有临时文件',
      cache: '过期缓存数据',
      deletedDiaries: '已删除的日记',
      oldNotifications: '60天前的已读通知',
      uploads: '未使用的上传文件',
      all: '所有可清理数据',
    };
    return labels[type] || type;
  };

  // 执行清理操作
  const executeCleanup = async () => {
    try {
      setCleanupLoading(true);
      setCleanupProgress({ current: 0, total: 100, message: '正在准备清理...' });

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setCleanupProgress(prev => {
          if (!prev || prev.current >= 90) return prev;
          return {
            ...prev,
            current: prev.current + Math.floor(Math.random() * 15) + 5,
            message: getProgressMessage(prev.current),
          };
        });
      }, 300);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setCleanupProgress({ current: 100, total: 100, message: '清理完成！' });

      // 模拟清理结果
      const result = simulateCleanupResult(cleanupType);
      setCleanupResult(result);

      // 更新统计数据
      setCleanupStats(prev => updateStatsAfterCleanup(prev, cleanupType));

      setToast({ message: '数据清理完成', type: 'success' });
    } catch (err) {
      console.error('清理失败:', err);
      setToast({ message: '清理失败: ' + (err.message || '未知错误'), type: 'error' });
    } finally {
      setCleanupLoading(false);
      setCleanupProgress(null);
      setShowCleanupConfirm(false);
      setCleanupConfirmText('');
    }
  };

  // 获取进度消息
  const getProgressMessage = (progress) => {
    if (progress < 20) return '正在扫描数据...';
    if (progress < 40) return '正在分析文件...';
    if (progress < 60) return '正在清理数据...';
    if (progress < 80) return '正在释放空间...';
    return '正在完成清理...';
  };

  // 模拟清理结果
  const simulateCleanupResult = (type) => {
    const results = {
      logs: { deleted: 8920, freedSpace: '156 MB' },
      tempFiles: { deleted: 156, freedSpace: '45 MB' },
      cache: { deleted: 3420, freedSpace: '12 MB' },
      deletedDiaries: { deleted: 128, freedSpace: '8.5 MB' },
      oldNotifications: { deleted: 5230, freedSpace: '2.1 MB' },
      uploads: { deleted: 23, freedSpace: '45 MB' },
      all: { deleted: 18877, freedSpace: '268.6 MB' },
    };
    return results[type] || { deleted: 0, freedSpace: '0 MB' };
  };

  // 更新统计状态
  const updateStatsAfterCleanup = (prev, type) => {
    const newStats = { ...prev };
    switch (type) {
      case 'logs':
        newStats.logs = { total: 6500, oldCount: 0, size: '100 MB' };
        break;
      case 'tempFiles':
        newStats.tempFiles = { count: 0, size: '0 MB' };
        break;
      case 'cache':
        newStats.cache = { entries: 0, size: '0 MB' };
        break;
      case 'deletedDiaries':
        newStats.deletedDiaries = { count: 0, size: '0 MB' };
        break;
      case 'oldNotifications':
        newStats.oldNotifications = { count: 0 };
        break;
      case 'uploads':
        newStats.uploads = { ...newStats.uploads, orphanedFiles: 0 };
        break;
      case 'all':
        newStats.logs = { total: 6500, oldCount: 0, size: '100 MB' };
        newStats.tempFiles = { count: 0, size: '0 MB' };
        newStats.cache = { entries: 0, size: '0 MB' };
        newStats.deletedDiaries = { count: 0, size: '0 MB' };
        newStats.oldNotifications = { count: 0 };
        newStats.uploads = { ...newStats.uploads, orphanedFiles: 0 };
        break;
      default:
        break;
    }
    return newStats;
  };

  // 打开清理确认弹窗
  const openCleanupConfirm = (type) => {
    setCleanupType(type);
    setCleanupConfirmText('');
    setCleanupResult(null);
    setShowCleanupConfirm(true);
  };

  // 渲染高级设置 - 数据清理
  const renderCleanup = () => {
    const statCards = [
      {
        id: 'logs',
        title: '系统日志',
        icon: History,
        count: cleanupStats.logs.total,
        subCount: cleanupStats.logs.oldCount,
        subLabel: '30天前的',
        size: cleanupStats.logs.size,
        color: 'blue',
      },
      {
        id: 'tempFiles',
        title: '临时文件',
        icon: FileText,
        count: cleanupStats.tempFiles.count,
        size: cleanupStats.tempFiles.size,
        color: 'amber',
      },
      {
        id: 'cache',
        title: '缓存数据',
        icon: Database,
        count: cleanupStats.cache.entries,
        size: cleanupStats.cache.size,
        color: 'purple',
      },
      {
        id: 'deletedDiaries',
        title: '已删除日记',
        icon: Trash2,
        count: cleanupStats.deletedDiaries.count,
        size: cleanupStats.deletedDiaries.size,
        color: 'red',
      },
      {
        id: 'oldNotifications',
        title: '旧通知',
        icon: Bell,
        count: cleanupStats.oldNotifications.count,
        subCount: cleanupStats.oldNotifications.count,
        subLabel: '60天前的',
        color: 'green',
      },
      {
        id: 'uploads',
        title: '上传文件',
        icon: Upload,
        count: cleanupStats.uploads.totalFiles,
        subCount: cleanupStats.uploads.orphanedFiles,
        subLabel: '未使用的',
        size: cleanupStats.uploads.totalSize,
        color: 'indigo',
      },
    ];

    const colorMap = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-600 dark:text-blue-400', btn: 'bg-blue-600 hover:bg-blue-700' },
      amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-600 dark:text-amber-400', btn: 'bg-amber-600 hover:bg-amber-700' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', icon: 'text-purple-600 dark:text-purple-400', btn: 'bg-purple-600 hover:bg-purple-700' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: 'text-red-600 dark:text-red-400', btn: 'bg-red-600 hover:bg-red-700' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: 'text-green-600 dark:text-green-400', btn: 'bg-green-600 hover:bg-green-700' },
      indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', icon: 'text-indigo-600 dark:text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-700' },
    };

    return (
      <div className="space-y-6">
        {/* 数据概览卡片 */}
        <SettingCard title="数据概览" icon={BarChart3} description="各类数据的统计信息">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card) => {
              const colors = colorMap[card.color];
              return (
                <div
                  key={card.id}
                  className={`p-4 rounded-lg border ${colors.bg} ${colors.border} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${colors.icon}`}>
                        <card.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">{card.title}</h3>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {card.count.toLocaleString()}
                        </p>
                        {card.subCount !== undefined && (
                          <p className={`text-xs mt-0.5 ${card.id === 'deletedDiaries' || card.id === 'uploads' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {card.subLabel}: {card.subCount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {card.size && (
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                        {card.size}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openCleanupConfirm(card.id)}
                    disabled={cleanupLoading || (card.subCount !== undefined ? card.subCount === 0 : card.count === 0)}
                    className={`w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 ${colors.btn} disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm`}
                  >
                    <Trash2 className="w-4 h-4" />
                    清理{card.id === 'logs' ? '旧日志' : card.id === 'oldNotifications' ? '旧通知' : ''}
                  </button>
                </div>
              );
            })}
          </div>
        </SettingCard>

        {/* 一键清理区域 */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-800 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">一键清理所有数据</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                此操作将清理所有可清理的数据，包括30天前的日志、临时文件、过期缓存、已删除的日记、60天前的通知以及未使用的上传文件。
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="text-sm text-red-700 dark:text-red-400">
                  <span className="font-medium">预计释放空间:</span> 约 268.6 MB
                </div>
                <button
                  onClick={() => openCleanupConfirm('all')}
                  disabled={cleanupLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  一键清理
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 清理确认弹窗 */}
        {showCleanupConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  确认清理操作
                </h3>
              </div>

              <div className="p-4 space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    您即将清理: <span className="font-medium">{getCleanupTypeLabel(cleanupType)}</span>
                  </p>
                </div>

                {cleanupType === 'all' || cleanupType === 'deletedDiaries' ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      这是一个危险操作，清理的数据将无法恢复。请确认您了解此操作的影响。
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        请输入 "确认删除" 以继续
                      </label>
                      <input
                        type="text"
                        value={cleanupConfirmText}
                        onChange={(e) => setCleanupConfirmText(e.target.value)}
                        placeholder="确认删除"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    此操作将删除选中的数据，清理后无法恢复。确定要继续吗？
                  </p>
                )}

                {/* 清理进度 */}
                {cleanupLoading && cleanupProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{cleanupProgress.message}</span>
                      <span>{cleanupProgress.current}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${cleanupProgress.current}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 清理结果 */}
                {cleanupResult && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-800 dark:text-green-300">清理完成</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      已删除 {cleanupResult.deleted.toLocaleString()} 条数据，释放 {cleanupResult.freedSpace} 空间
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowCleanupConfirm(false);
                    setCleanupConfirmText('');
                    setCleanupResult(null);
                  }}
                  disabled={cleanupLoading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                  {cleanupResult ? '关闭' : '取消'}
                </button>
                {!cleanupResult && (
                  <button
                    onClick={executeCleanup}
                    disabled={
                      cleanupLoading ||
                      ((cleanupType === 'all' || cleanupType === 'deletedDiaries') && cleanupConfirmText !== '确认删除')
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    {cleanupLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        清理中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        确认清理
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染内容区域
  const renderContent = () => {
    const renderers = {
      // 基础设置
      site: renderSiteInfo,
      appearance: renderAppearance,
      display: renderDisplay,
      // 功能模块
      diary: renderDiaryFeatures,
      comment: renderCommentFeatures,
      interaction: renderInteractionFeatures,
      // 用户与安全
      register: renderRegisterSettings,
      content: renderContentReview,
      protection: renderSecurityProtection,
      // 系统服务
      email: renderEmailService,
      emailTemplates: renderEmailTemplates,
      ai: renderAIService,
      storage: renderStorageService,
      // 高级设置
      maintenance: renderMaintenance,
      backup: renderBackup,
      monitor: renderMonitor,
      announcements: renderAnnouncements,
      logs: renderLogs,
      configHistory: renderConfigHistory,
      overview: renderOverview,
    };

    const renderer = renderers[activeSubCategory];
    return renderer ? renderer() : renderSiteInfo();
  };

  // 获取当前子分类信息
  const currentSubCategory = useMemo(() => {
    for (const cat of SETTING_CATEGORIES) {
      const sub = cat.subCategories.find((s) => s.id === activeSubCategory);
      if (sub) return { category: cat, subCategory: sub };
    }
    return null;
  }, [activeSubCategory]);

  // 获取当前分类的子分类列表
  const currentCategorySubCategories = useMemo(() => {
    const cat = SETTING_CATEGORIES.find((c) => c.id === activeCategory);
    return cat?.subCategories || [];
  }, [activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast通知 */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 顶部头部区域 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题行 */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">系统设置</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* 搜索框 */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索设置..."
                  className="w-48 lg:w-64 pl-9 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* 保存按钮 */}
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
              >
                {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">{saving ? '保存中...' : hasUnsavedChanges ? '保存更改' : '已保存'}</span>
              </button>
            </div>
          </div>

          {/* 主分类标签页 */}
          <div className="flex gap-1 overflow-x-auto pb-px -mb-px scrollbar-thin">
            {SETTING_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setActiveCategory(category.id);
                  setActiveSubCategory(category.subCategories[0]?.id);
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeCategory === category.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <category.icon className="w-4 h-4" />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 子分类标签页和内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />

        {/* 未保存提示 */}
        {hasUnsavedChanges && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>有未保存的更改</span>
          </div>
        )}

        {/* 子分类标签页 */}
        {currentCategorySubCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
            {currentCategorySubCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSubCategory(sub.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSubCategory === sub.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <sub.icon className="w-4 h-4" />
                <span>{sub.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* 内容区域 */}
        <div className="max-w-4xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
