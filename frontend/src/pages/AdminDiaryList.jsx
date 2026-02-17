import { useEffect, useState } from 'react';
import api from '../utils/api';
import { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
// import ErrorMessage from '../components/common/ErrorMessage';
// import SuccessMessage from '../components/common/SuccessMessage';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * 管理员日记列表页面
 * 管理员可以查看所有日记并筛选状态
 */
const AdminDiaryList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchDiaries();
  }, [pagination.page, searchQuery, statusFilter]);

  const fetchDiaries = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/admin/diaries?${params.toString()}`);
      setDiaries(response.data.diaries);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('获取日记列表失败:', err);
      setError(err.response?.data?.message || '获取日记列表失败');
      toast.error(err.response?.data?.message || '获取日记列表失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: '待审核', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Clock },
      approved: { label: '已通过', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle },
      rejected: { label: '已拒绝', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const handleDeleteDiary = async (diaryId, diaryTitle) => {
    if (!window.confirm(`确定要删除日记 "${diaryTitle}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      setDeletingId(diaryId);
      setError('');
      setSuccess('');

      await api.delete(`/admin/diaries/${diaryId}`);
      setSuccess('日记已删除');
      toast.success('日记已删除');
      fetchDiaries();
    } catch (err) {
      console.error('删除日记失败:', err);
      setError(err.response?.data?.message || '删除失败');
      toast.error(err.response?.data?.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && diaries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">日记管理</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total > 0 ? `共 ${pagination.total} 篇日记` : '查看和管理所有日记'}
          </p>
        </div>
        <button
          onClick={() => fetchDiaries(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* <ErrorMessage message={error} /> */}
      {/* <SuccessMessage message={success} /> */}

      {/* 筛选栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索日记标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Filter className="w-5 h-5" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-w-[140px]"
            >
              <option value="">所有状态</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>
        </div>
      </div>

      {/* 日记列表 */}
      <div className="space-y-4">
        {diaries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              暂无日记
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              没有找到符合条件的日记
            </p>
          </div>
        ) : (
          diaries.map((diary) => {
            const statusBadge = getStatusBadge(diary.status);
            const StatusIcon = statusBadge.icon;
            return (
              <div
                key={diary.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all overflow-hidden"
              >
                {/* 头部 - 作者信息和状态 */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
                        {diary.user.avatarUrl ? (
                          <img
                            src={getImageUrl(diary.user.avatarUrl)}
                            alt={diary.user.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            {diary.user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {diary.user.username}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {diary.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusBadge.color}`}>
                        {StatusIcon && <StatusIcon className="w-4 h-4" />}
                        {statusBadge.label}
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(diary.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 内容区域 */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {diary.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {stripHtml(diary.content)}
                  </p>

                  {/* 标签和元信息 */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {diary.mood && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {diary.mood}
                      </span>
                    )}
                    {diary.tags && JSON.parse(diary.tags).length > 0 && (
                      <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                        {JSON.parse(diary.tags).slice(0, 2).join(', ')}
                        {JSON.parse(diary.tags).length > 2 && ` +${JSON.parse(diary.tags).length - 2}`}
                      </span>
                    )}
                    {diary.images && JSON.parse(diary.images).length > 0 && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {JSON.parse(diary.images).length} 张图片
                      </span>
                    )}
                    <span className="sm:hidden px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(diary.createdAt)}
                    </span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/diaries/${diary.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      查看详情
                    </button>
                    <button
                      onClick={() => handleDeleteDiary(diary.id, diary.title)}
                      disabled={deletingId === diary.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            显示 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiaryList;
