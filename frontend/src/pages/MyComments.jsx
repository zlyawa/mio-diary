import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import Header from '../components/layout/Header';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  Trash2,
  FileText,
  ArrowLeft,
} from 'lucide-react';

/**
 * 我的评论页面
 * 用户查看自己发表的所有评论
 */
const MyComments = () => {
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchComments();
  }, [pagination.page, statusFilter]);

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

      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/comments/my/list?${params.toString()}`);
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

  const handleDelete = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？此操作不可恢复。')) return;
    
    try {
      setDeletingId(commentId);
      await api.delete(`/comments/${commentId}`);
      toast.success('评论已删除');
      fetchComments();
    } catch (err) {
      console.error('删除失败:', err);
      toast.error(err.response?.data?.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-7 h-7 text-indigo-500" />
                  我的评论
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  查看和管理我发表的评论
                </p>
              </div>
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
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                共 {pagination.total} 条评论
              </span>
            </div>
          </div>

          {/* 评论列表 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">暂无评论</p>
                <Link
                  to="/diaries"
                  className="inline-block mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  去浏览日记并发表评论
                </Link>
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
                          {/* 状态和时间 */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(comment.createdAt)}
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
                                  className="max-w-[150px] max-h-[100px] rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
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

                          {/* 拒绝原因 */}
                          {comment.auditReason && comment.status === 'rejected' && (
                            <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                              拒绝原因: {comment.auditReason}
                            </p>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(comment.id)}
                            disabled={deletingId === comment.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </button>
                        </div>
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
        </div>
      </div>
    </div>
  );
};

export default MyComments;
