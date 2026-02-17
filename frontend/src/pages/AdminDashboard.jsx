import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
// import ErrorMessage from '../components/common/ErrorMessage';
import { useToast } from '../context/ToastContext';
import {
  Users,
  FileText,
  Clock,
  UserX,
  TrendingUp,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

/**
 * 管理员仪表盘页面
 * 展示系统统计数据、最近注册用户和日记
 */
const AdminDashboard = () => {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentDiaries, setRecentDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const response = await api.get('/admin/dashboard');
      const data = response.data || {};
      setStats(data.stats || null);
      setRecentUsers(data.recentUsers || []);
      setRecentDiaries(data.recentDiaries || []);
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
      setError(err.response?.data?.message || '获取数据失败');
      toast.error(err.response?.data?.message || '获取数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const statCards = [
    {
      title: '总用户数',
      value: stats?.totalUsers || 0,
      icon: Users,
      bgColor: 'bg-blue-600',
      link: '/admin/users',
    },
    {
      title: '总日记数',
      value: stats?.totalDiaries || 0,
      icon: FileText,
      bgColor: 'bg-green-600',
      link: '/admin/reviews',
    },
    {
      title: '待审核',
      value: stats?.pendingReviews || 0,
      icon: Clock,
      bgColor: 'bg-yellow-600',
      link: '/admin/reviews',
      alert: stats?.pendingReviews > 0,
    },
    {
      title: '封禁用户',
      value: stats?.bannedUsers || 0,
      icon: UserX,
      bgColor: 'bg-red-600',
      link: '/admin/users',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">仪表盘</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">查看系统运行状态和数据概览</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* <ErrorMessage message={error} /> */}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {card.title}
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                  {card.alert && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      需要处理
                    </p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 今日数据 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">今日动态</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">今日新增数据统计</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">今日新用户</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.todayUsers || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">今日新日记</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.todayDiaries || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 列表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近注册用户 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  最近注册用户
                </h2>
              </div>
              <Link
                to="/admin/users"
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                暂无注册用户
              </div>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img
                        src={getImageUrl(user.avatarUrl)}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.username}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 最近日记 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  最近日记
                </h2>
              </div>
              <Link
                to="/admin/reviews"
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentDiaries.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                暂无日记
              </div>
            ) : (
              recentDiaries.map((diary) => (
                <div
                  key={diary.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate mb-1">
                        {diary.title}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          {diary.user.avatarUrl ? (
                            <img
                              src={getImageUrl(diary.user.avatarUrl)}
                              alt={diary.user.username}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs text-indigo-600 dark:text-indigo-400">
                              {diary.user.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {diary.user.username}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          diary.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : diary.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {diary.status === 'pending'
                          ? '待审核'
                          : diary.status === 'approved'
                          ? '已通过'
                          : '已拒绝'}
                      </span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDate(diary.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;