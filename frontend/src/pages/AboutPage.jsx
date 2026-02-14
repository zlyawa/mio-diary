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
  Users,
  FileText,
  Image,
  Bell,
  Clock,
  Download,
  Upload,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/**
 * 关于页面
 * 展示系统版本、技术栈、项目信息、系统统计、数据库管理等
 */
const AboutPage = () => {
  const { user } = useAuth();
  const [versionInfo, setVersionInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const fetchVersionInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const [versionRes, statsRes, updateRes] = await Promise.all([
        api.get('/config/version'),
        api.get('/config/stats'),
        api.get('/config/check-update')
      ]);
      setVersionInfo(versionRes.data);
      setStats(statsRes.data);
      setUpdateInfo(updateRes.data);
    } catch (err) {
      console.error('获取信息失败:', err);
      setError('获取信息失败');
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const response = await api.get('/config/check-update');
      setUpdateInfo(response.data);
    } catch (err) {
      console.error('检查更新失败:', err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    fetchVersionInfo();
  }, []);

  const openGithub = () => {
    window.open('https://github.com/zlyawa/mio-diary', '_blank');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/config/export', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mio-diary-backup-${new Date().toISOString().slice(0, 10)}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('导入数据库将覆盖现有所有数据！此操作不可恢复，建议先导出备份。确定继续吗？')) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    setImportStatus(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('database', file);

    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setImporting(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          setImportStatus({ success: true, message: response.message || '数据库导入成功，请重启服务' });
        } catch {
          setImportStatus({ success: true, message: '数据库导入成功，请重启服务' });
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          setImportStatus({ success: false, message: response.message || '导入失败，请重试' });
        } catch {
          setImportStatus({ success: false, message: '导入失败，请重试' });
        }
      }
      e.target.value = '';
    };

    xhr.onerror = () => {
      setImporting(false);
      setImportStatus({ success: false, message: '网络错误，导入失败' });
      e.target.value = '';
    };

    xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/config/import`);
    xhr.send(formData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

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
                  {versionInfo?.license || 'ISC'}
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
                  2026年2月14日
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 版本更新检测 */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 text-indigo-600 ${checkingUpdate ? 'animate-spin' : ''}`} />
              版本检测
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {checkingUpdate ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : updateInfo?.updateAvailable ? (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  ) : updateInfo?.error ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      当前版本: v{updateInfo?.currentVersion || versionInfo?.version}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {checkingUpdate 
                        ? '正在连接 GitHub...' 
                        : updateInfo?.updateAvailable 
                          ? `发现新版本: v${updateInfo.latestVersion}`
                          : updateInfo?.error
                            ? updateInfo.error
                            : '已是最新版本'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkForUpdates}
                  disabled={checkingUpdate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  {checkingUpdate ? '检测中...' : '检查更新'}
                </button>
              </div>

              {/* 检测结果提示 */}
              {!checkingUpdate && updateInfo && (
                <div className={`p-3 rounded-lg text-sm ${
                  updateInfo.updateAvailable 
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                    : updateInfo.error
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                }`}>
                  {updateInfo.updateAvailable ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>发现新版本 v{updateInfo.latestVersion}，请访问 GitHub 下载更新</span>
                    </div>
                  ) : updateInfo.error ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>检测失败：{updateInfo.error}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>检测完成，当前已是最新版本</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 系统统计 */}
        {isAdmin && stats && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              系统统计
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">用户数</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{stats.users}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">日记数</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{stats.diaries}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">管理员</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{stats.admins}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Image className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">含图片日记</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{stats.diariesWithImages}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">通知数</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{stats.notifications}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">运行天数</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{stats.daysRunning}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 数据库管理 */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              数据库管理
            </h3>
            
            <div className="space-y-4">
              {/* 导出 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">导出数据库</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">下载当前数据库备份</p>
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? '导出中...' : '导出'}
                </button>
              </div>

              {/* 导入 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">导入数据库</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">从备份文件恢复数据（将覆盖现有数据）</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* 上传进度条 */}
                  {importing && (
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>上传中</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <label className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {importing ? '导入中...' : '导入'}
                    <input
                      type="file"
                      accept=".db,.sqlite,.sqlite3,.sql"
                      onChange={handleImport}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 导入状态提示 */}
              {importStatus && (
                <div className={`p-4 rounded-lg ${importStatus.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                  <p className={importStatus.success 
                    ? 'text-green-700 dark:text-green-400' 
                    : 'text-red-700 dark:text-red-400'}>
                    {importStatus.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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
