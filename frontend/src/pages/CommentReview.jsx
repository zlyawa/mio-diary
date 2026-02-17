import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  Search,
  Eye,
  User,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * 评论审核页面
 * 管理员可以审核待审核的评论
 */
const CommentReview = () => {
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);

  useEffect(() => {
    fetchComments();
  }, [pagination.page, searchQuery, statusFilter]);

  const fetchComments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/comments/admin/list?${params.toString()}`);
      // 后端返回: { success, message, data: [...comments], pagination }
      setComments(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        ...(response.data.pagination || {}),
      }));
    } catch (err) {
      console.error('获取评论列表失败:', err);
      toast.error(err.response?.data?.message || '获取评论列表失败');
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

  // 从 content 中提取 Markdown 图片
  const extractImagesFromContent = (content) => {
    if (!content) return [];
    const regex = /!\[.*?\]\((.*?)\)/g;
    const images = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      images.push(match[1]);
    }
    return images;
  };

  // 获取评论的所有图片（支持 images 字段和 content 中的 Markdown）
  const getCommentImages = (comment) => {
    const images = [];
    // 从 images 字段获取
    if (comment.images && Array.isArray(comment.images)) {
      images.push(...comment.images);
    }
    // 从 content 中提取
    const contentImages = extractImagesFromContent(comment.content);
    images.push(...contentImages);
    return [...new Set(images)]; // 去重
  };

  // 获取纯文本内容（移除 Markdown 图片语法）
  const getPlainContent = (content) => {
    if (!content) return '';
    return content.replace(/!\[.*?\]\(.*?\)/g, '').trim();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: '待审核', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Clock },
      approved: { label: '已通过', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle },
      rejected: { label: '已拒绝', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const handleApprove = async (commentId) => {
    try {
      setReviewingId(commentId);
      await api.patch(`/comments/${commentId}/review`, {
        status: 'approved',
      });
      toast.success('评论已通过审核');
      fetchComments();
    } catch (err) {
      console.error('审核失败:', err);
      toast.error(err.response?.data?.message || '审核失败');
    } finally {
      setReviewingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedComment) return;
    
    try {
      setReviewingId(selectedComment.id);
      await api.patch(`/comments/${selectedComment.id}/review`, {
        status: 'rejected',
        reason: rejectReason,
      });
      toast.success('评论已拒绝');
      setShowRejectModal(false);
      setSelectedComment(null);
      setRejectReason('');
      fetchComments();
    } catch (err) {
      console.error('审核失败:', err);
      toast.error(err.response?.data?.message || '审核失败');
    } finally {
      setReviewingId(null);
    }
  };

  const openRejectModal = (comment) => {
    setSelectedComment(comment);
    setShowRejectModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-indigo-500" />
            评论审核
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            审核用户评论内容
          </p>
        </div>
        <button
          onClick={() => fetchComments(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索评论内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">全部状态</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">待审核</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {comments.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">已通过</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {comments.filter(c => c.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">已拒绝</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {comments.filter(c => c.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无评论</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {comments.map((comment) => {
              const status = getStatusBadge(comment.status);
              const StatusIcon = status.icon;

              return (
                <div key={comment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 用户信息 */}
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={getImageUrl(comment.user?.avatarUrl) || `https://gravatar.com/avatar/${comment.user?.id}?d=mp`}
                          alt={comment.user?.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {comment.user?.username || '匿名用户'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>

                      {/* 评论内容 */}
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-2">
                        {getPlainContent(comment.content)}
                      </p>

                      {/* 评论图片 */}
                      {getCommentImages(comment).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {getCommentImages(comment).map((img, idx) => (
                            <img
                              key={idx}
                              src={getImageUrl(img)}
                              alt={`评论图片 ${idx + 1}`}
                              className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(getImageUrl(img), '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      {/* 关联日记 */}
                      {comment.diary && (
                        <Link
                          to={`/diary/${comment.diary.id}`}
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          {comment.diary.title}
                        </Link>
                      )}

                      {/* 审核原因 */}
                      {comment.auditReason && comment.status === 'rejected' && (
                        <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                          拒绝原因: {comment.auditReason}
                        </p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {comment.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(comment.id)}
                          disabled={reviewingId === comment.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          通过
                        </button>
                        <button
                          onClick={() => openRejectModal(comment)}
                          disabled={reviewingId === comment.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-gray-500 dark:text-gray-400">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 拒绝原因弹窗 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              拒绝评论
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              评论内容:
            </p>
            <p className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded p-2 mb-4 line-clamp-3">
              {selectedComment?.content}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                拒绝原因 (可选)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedComment(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={reviewingId === selectedComment?.id}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentReview;
