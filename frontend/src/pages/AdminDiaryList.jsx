import { useEffect, useState } from 'react';
import api from '../utils/api';
import { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import SuccessMessage from '../components/common/SuccessMessage';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * 管理员日记列表页面
 * 管理员可以查看所有日记并筛选状态
 */
const AdminDiaryList = () => {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const fetchDiaries = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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
      fetchDiaries();
    } catch (err) {
      console.error('删除日记失败:', err);
      setError(err.response?.data?.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && diaries.length === 0) {
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
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            日记管理
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          查看和管理所有用户的日记
        </p>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {/* 筛选栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索日记标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
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
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-4">
                  {/* 顶部：作者信息和状态 */}
                  <div className="flex items-center justify-between gap-3">
                    {/* 作者信息 */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {diary.user.avatarUrl ? (
                          <img
                            src={getImageUrl(diary.user.avatarUrl)}
                            alt={diary.user.username}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span 
                          className={`text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 ${diary.user.avatarUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
                        >
                          {diary.user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                          {diary.user.username}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {diary.user.email}
                        </p>
                      </div>
                    </div>

                    {/* 状态标签 */}
                    <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${statusBadge.color}`}>
                      {StatusIcon && <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />}
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* 日记内容 */}
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {diary.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {stripHtml(diary.content)}
                    </p>

                    {/* 元信息 */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatDate(diary.createdAt)}
                      </span>
                      {diary.mood && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                          {diary.mood}
                        </span>
                      )}
                      {diary.tags && JSON.parse(diary.tags).length > 0 && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-700 rounded-full truncate max-w-[100px] sm:max-w-none">
                          {JSON.parse(diary.tags).slice(0, 2).join(', ')}
                        </span>
                      )}
                      {diary.images && JSON.parse(diary.images).length > 0 && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                          {JSON.parse(diary.images).length} 张图片
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/diaries/${diary.id}`)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>查看</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDiary(diary.id, diary.title)}
                      disabled={deletingId === diary.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>删除</span>
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
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            显示 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共{' '}
            {pagination.total} 条
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiaryList;
