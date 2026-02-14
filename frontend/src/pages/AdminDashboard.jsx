import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  Users,
  FileText,
  Clock,
  UserX,
  TrendingUp,
  Calendar,
  ArrowRight,
  Shield,
} from 'lucide-react';

/**
 * 管理员仪表盘页面
 * 展示系统统计数据、最近注册用户和日记
 */
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentDiaries, setRecentDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/dashboard');
      setStats(response.data.stats);
      setRecentUsers(response.data.recentUsers);
      setRecentDiaries(response.data.recentDiaries);
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
      setError(err.response?.data?.message || '获取数据失败');
    } finally {
      setLoading(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const statCards = [
    {
      title: '总用户数',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'blue',
      link: '/admin/users',
    },
    {
      title: '总日记数',
      value: stats?.totalDiaries || 0,
      icon: FileText,
      color: 'green',
      link: '/admin/reviews',
    },
    {
      title: '待审核',
      value: stats?.pendingReviews || 0,
      icon: Clock,
      color: 'yellow',
      link: '/admin/reviews',
      alert: stats?.pendingReviews > 0,
    },
    {
      title: '封禁用户',
      value: stats?.bannedUsers || 0,
      icon: UserX,
      color: 'red',
      link: '/admin/users',
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
      {/* 页面标题 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            管理仪表盘
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          欢迎回来，查看系统运行状态和数据概览
        </p>
      </div>

      <ErrorMessage message={error} />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {card.title}
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg self-start ${getColorClasses(card.color)}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>
              {card.alert && (
                <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  需要处理
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* 今日数据 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            今日动态
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">今日新用户</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.todayUsers || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">今日新日记</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.todayDiaries || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近注册用户 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  最近注册用户
                </h2>
              </div>
              <Link
                to="/admin/users"
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                暂无注册用户
              </div>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img
                        src={getImageUrl(user.avatarUrl)}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span 
                      className={`text-sm font-medium text-indigo-600 dark:text-indigo-400 ${user.avatarUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </span>
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
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  最近日记
                </h2>
              </div>
              <Link
                to="/admin/reviews"
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentDiaries.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                暂无日记
              </div>
            ) : (
              recentDiaries.map((diary) => (
                <div
                  key={diary.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
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
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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