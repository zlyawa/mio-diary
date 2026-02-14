import { useState, useEffect } from 'react';
import {
  Github,
  ExternalLink,
  Server,
  Code,
  Database,
  Shield,
  Calendar,
  Tag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import api from '../utils/api';

/**
 * 关于页面
 * 展示系统版本、技术栈、项目信息等
 */
const AboutPage = () => {
  const [versionInfo, setVersionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVersionInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/config/version');
      setVersionInfo(response.data);
    } catch (err) {
      console.error('获取版本信息失败:', err);
      setError('获取版本信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersionInfo();
  }, []);

  const openGithub = () => {
    window.open('https://github.com/zlyawa/mio-diary', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">关于系统</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            了解 Mio的日记本 的版本信息和技术栈
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchVersionInfo}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              重试
            </button>
          </div>
        )}

        {/* 主要信息卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          {/* 头部 Logo 区域 */}
          <div className="bg-white dark:bg-gray-800 px-6 py-8 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{versionInfo?.name || 'Mio的日记本'}</h2>
            </div>
          </div>

          {/* 版本信息 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">版本号</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  v{versionInfo?.version || '2.0.0'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">许可证</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {versionInfo?.license || 'MIT'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">运行环境</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {versionInfo?.environment || 'development'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">最后更新</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  2026年2月12日 13:43
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 技术栈卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-600" />
            技术栈
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 后端技术 */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                后端
              </h4>
              <div className="flex flex-wrap gap-2">
                {versionInfo?.techStack?.backend?.map((tech, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* 前端技术 */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <Code className="w-4 h-4" />
                前端
              </h4>
              <div className="flex flex-wrap gap-2">
                {versionInfo?.techStack?.frontend?.map((tech, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 数据库信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            数据库
          </h3>
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Database className="w-8 h-8 text-orange-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">SQLite</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                轻量级嵌入式数据库，使用 Prisma ORM 管理
              </p>
            </div>
          </div>
        </div>

        {/* GitHub 链接 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Github className="w-5 h-5 text-indigo-600" />
            项目链接
          </h3>
          
          <button
            onClick={openGithub}
            className="w-full flex items-center justify-between p-4 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Github className="w-6 h-6" />
              <div className="text-left">
                <p className="font-medium">GitHub 仓库</p>
                <p className="text-sm text-gray-400">查看源码、提交 Issue、参与贡献</p>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* 刷新按钮 */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchVersionInfo}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新信息
          </button>
        </div>

        {/* 版权信息 */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2024-2026 Mio的日记本. All rights reserved.</p>
          <p className="mt-1">
            Made with ❤️ by{' '}
            <a
              href="https://github.com/zlyawa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              zlyawa
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;