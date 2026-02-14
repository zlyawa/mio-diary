import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  UserX,
  Key,
  Mail,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

/**
 * 通知类型图标映射
 */
const getNotificationIcon = (type) => {
  switch (type) {
    case 'diary_review':
      return <FileText className="w-5 h-5 text-yellow-500" />;
    case 'review_result':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'account_status':
      return <UserX className="w-5 h-5 text-red-500" />;
    case 'password_reset':
      return <Key className="w-5 h-5 text-orange-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

/**
 * 通知类型文案映射
 */
const getNotificationTypeLabel = (type) => {
  switch (type) {
    case 'diary_review':
      return '待审核';
    case 'review_result':
      return '审核通知';
    case 'account_status':
      return '账户状态';
    case 'password_reset':
      return '密码重置';
    default:
      return '系统通知';
  }
};

/**
 * 通知中心页面
 */
const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [pagination.page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        `/notifications?page=${pagination.page}&limit=${pagination.limit}`
      );
      setNotifications(response.data.notifications);
      setPagination(response.data.pagination);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('获取通知失败:', err);
      setError(err.response?.data?.message || '获取通知失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('标记全部已读失败:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('删除通知失败:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('确定要清空所有通知吗？此操作不可恢复。')) {
      return;
    }
    try {
      setActionLoading(true);
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('清空通知失败:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // 如果是待审核通知，跳转到审核页面
    if (notification.type === 'diary_review') {
      navigate('/admin/diary-review');
      return;
    }
    // 如果未读，先标记已读
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              通知中心
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            查看系统通知和审核结果
          </p>
        </div>

        <ErrorMessage message={error} />

        {/* 操作栏 */}
        {notifications.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              共 {pagination.total} 条通知
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs">
                  {unreadCount} 未读
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={actionLoading || unreadCount === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-4 h-4" />
                全部已读
              </button>
              <button
                onClick={handleClearAll}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            </div>
          </div>
        )}

        {/* 通知列表 */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
              <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                暂无通知
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                有新的审核结果或系统通知时，这里会显示
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all cursor-pointer hover:shadow-md ${
                  notification.isRead
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  {/* 图标 */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(notification.createdAt)}
                          </span>
                          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="标记已读"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 未读标记 */}
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
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
      </div>
    </div>
  );
};

export default NotificationsPage;
