import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import api from '../utils/api';
import { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import SuccessMessage from '../components/common/SuccessMessage';
import {
  FileText,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  AlertTriangle,
} from 'lucide-react';

/**
 * 日记审核页面
 * 管理员可以查看待审核日记并执行通过/拒绝操作
 */
const DiaryReview = () => {
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const fetchPendingDiaries = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        `/admin/reviews?page=${pagination.page}&limit=${pagination.limit}`
      );
      setDiaries(response.data.diaries);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('获取待审核日记失败:', err);
      setError(err.response?.data?.message || '获取待审核日记失败');
    } finally {
      setLoading(false);
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

      setSuccess(
        reviewAction === 'approved'
          ? `日记 "${selectedDiary.title}" 已通过审核`
          : `日记 "${selectedDiary.title}" 已拒绝`
      );

      setShowReviewModal(false);
      setSelectedDiary(null);
      setReviewAction('');
      setRejectReason('');
      fetchPendingDiaries();
    } catch (err) {
      console.error('审核日记失败:', err);
      setError(err.response?.data?.message || '审核失败');
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
            日记审核
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          审核用户提交的日记内容，维护社区质量
        </p>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {/* 待审核数量提示 */}
      {pagination.total > 0 && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm sm:text-base">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-medium">
              当前有 {pagination.total} 篇日记待审核
            </span>
          </div>
        </div>
      )}

      {/* 日记列表 */}
      <div className="space-y-4">
        {diaries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
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
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-4">
                {/* 作者信息 */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {diary.user.avatarUrl ? (
                      <img
                        src={getImageUrl(diary.user.avatarUrl)}
                        alt={diary.user.username}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {diary.user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {diary.user.username}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {diary.user.email}
                    </p>
                  </div>
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
                    onClick={() => openDetailModal(diary)}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>预览</span>
                  </button>
                  <button
                    onClick={() => openReviewModal(diary, 'approved')}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>通过</span>
                  </button>
                  <button
                    onClick={() => openReviewModal(diary, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>拒绝</span>
                  </button>
                </div>
              </div>
            </div>
          ))
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
            <span className="text-sm text-gray-700 dark:text-gray-300">
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

      {/* 审核模态框 */}
      {showReviewModal && selectedDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-full ${
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
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReview}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
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
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                日记详情
              </h3>
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
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
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
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    图片 ({JSON.parse(selectedDiary.images).length} 张)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedDiary.createdAt)}
                </span>
                {selectedDiary.mood && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                    心情: {selectedDiary.mood}
                  </span>
                )}
                {selectedDiary.tags && JSON.parse(selectedDiary.tags).length > 0 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                    标签: {JSON.parse(selectedDiary.tags).join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openReviewModal(selectedDiary, 'rejected');
                }}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                拒绝
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openReviewModal(selectedDiary, 'approved');
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
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