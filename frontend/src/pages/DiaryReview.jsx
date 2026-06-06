import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
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
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';

/**
 * 日记审核页面
 * 管理员可以查看待审核日记并执行通过/拒绝操作
 */
const DiaryReview = () => {
  const toast = useToast();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 模态框状态
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState(null);
  const [reviewAction, setReviewAction] = useState(''); // 'approved' or 'rejected'
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingDiaries();
  }, [pagination.page]);

  const fetchPendingDiaries = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const response = await api.get(
        `/admin/reviews?page=${pagination.page}&limit=${pagination.limit}`
      );
      setDiaries(response.data.diaries);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('获取待审核日记失败:', err);
      setError(err.response?.data?.message || '获取待审核日记失败');
      toast.error(err.response?.data?.message || '获取待审核日记失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReview = async () => {
    if (!selectedDiary || !reviewAction) return;

    try {
      setError('');
      setSuccess('');

      await api.put(`/admin/reviews/${selectedDiary.id}`, {
        status: reviewAction,
        reason: reviewAction === 'rejected' ? rejectReason : undefined,
      });

      const successMsg =
        reviewAction === 'approved'
          ? `日记 "${selectedDiary.title}" 已通过审核`
          : `日记 "${selectedDiary.title}" 已拒绝`;
      setSuccess(successMsg);
      toast.success(successMsg);

      setShowReviewModal(false);
      setSelectedDiary(null);
      setReviewAction('');
      setRejectReason('');
      fetchPendingDiaries();
    } catch (err) {
      console.error('审核日记失败:', err);
      setError(err.response?.data?.message || '审核失败');
      toast.error(err.response?.data?.message || '审核失败');
    }
  };

  const openReviewModal = (diary, action) => {
    setSelectedDiary(diary);
    setReviewAction(action);
    setRejectReason('');
    setShowReviewModal(true);
  };

  const openDetailModal = (diary) => {
    setSelectedDiary(diary);
    setShowDetailModal(true);
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

  // 处理富文本内容中的图片路径
  const processContentImages = (content) => {
    if (!content) return '';
    // 替换相对路径的图片为完整路径
    return content.replace(
      /src="(?!http|https|data:)([^"]+)"/g,
      (match, path) => `src="${getImageUrl(path)}"`
    );
  };

  if (loading && diaries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">日记审核</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total > 0 ? `${pagination.total} 篇待审核` : '审核用户提交的日记'}
          </p>
        </div>
        <button
          onClick={() => fetchPendingDiaries(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* <ErrorMessage message={error} /> */}
      {/* <SuccessMessage message={success} /> */}

      {/* 待审核数量提示 */}
      {pagination.total > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              当前有 {pagination.total} 篇日记待审核
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              请及时处理用户提交的日记内容
            </p>
          </div>
        </div>
      )}

      {/* 日记列表 */}
      <div className="space-y-4">
        {diaries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              没有待审核的日记
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              所有日记都已审核完毕，干得漂亮！
            </p>
          </div>
        ) : (
          diaries.map((diary) => (
            <div
              key={diary.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all overflow-hidden"
            >
              {/* 头部 - 作者信息 */}
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
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => openDetailModal(diary)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    预览详情
                  </button>
                  <button
                    onClick={() => openReviewModal(diary, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    通过
                  </button>
                  <button
                    onClick={() => openReviewModal(diary, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          ))
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

      {/* 审核模态框 */}
      {showReviewModal && selectedDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  reviewAction === 'approved'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}
              >
                {reviewAction === 'approved' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {reviewAction === 'approved' ? '通过审核' : '拒绝审核'}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              您确定要{reviewAction === 'approved' ? '通过' : '拒绝'}日记 "
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedDiary.title}
              </span>
              " 吗？
            </p>

            {reviewAction === 'rejected' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  拒绝原因（可选）
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请输入拒绝原因..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedDiary(null);
                  setReviewAction('');
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleReview}
                className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                  reviewAction === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                确认{reviewAction === 'approved' ? '通过' : '拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 头部 */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  日记详情
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDiary(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 作者信息 */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
                  {selectedDiary.user.avatarUrl ? (
                    <img
                      src={getImageUrl(selectedDiary.user.avatarUrl)}
                      alt={selectedDiary.user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                      {selectedDiary.user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedDiary.user.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedDiary.user.email}
                  </p>
                </div>
              </div>

              {/* 日记标题 */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedDiary.title}
              </h2>

              {/* 日记内容 */}
              <div
                className="prose dark:prose-invert max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processContentImages(selectedDiary.content)) }}
              />

              {/* 图片 */}
              {selectedDiary.images && JSON.parse(selectedDiary.images).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    图片 ({JSON.parse(selectedDiary.images).length} 张)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {JSON.parse(selectedDiary.images).map((image, index) => (
                      <img
                        key={index}
                        src={getImageUrl(image)}
                        alt={`图片 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 元信息 */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedDiary.createdAt)}
                </span>
                {selectedDiary.mood && (
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                    心情: {selectedDiary.mood}
                  </span>
                )}
                {selectedDiary.tags && JSON.parse(selectedDiary.tags).length > 0 && (
                  <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                    {JSON.parse(selectedDiary.tags).join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-700/30">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openReviewModal(selectedDiary, 'rejected');
                }}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
              >
                拒绝
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openReviewModal(selectedDiary, 'approved');
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                通过
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryReview;