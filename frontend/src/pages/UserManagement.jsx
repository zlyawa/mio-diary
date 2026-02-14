import { useEffect, useState } from 'react';
import api, { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import SuccessMessage from '../components/common/SuccessMessage';
import {
  Search,
  Filter,
  Ban,
  Unlock,
  Key,
  Users,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * 用户管理页面
 * 管理员可以查看用户列表、封禁/解封用户、重置密码
 */
const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 模态框状态
  const [showBanModal, setShowBanModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('isBanned', statusFilter);

      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      setError(err.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    try {
      setError('');
      setSuccess('');

      await api.put(`/admin/users/${selectedUser.id}/ban`, {
        isBanned: !selectedUser.isBanned,
        reason: banReason,
      });

      setSuccess(
        selectedUser.isBanned
          ? `用户 "${selectedUser.username}" 已解封`
          : `用户 "${selectedUser.username}" 已封禁`
      );

      setShowBanModal(false);
      setBanReason('');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error('封禁用户失败:', err);
      setError(err.response?.data?.message || '操作失败');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      setError('');
      setSuccess('');

      const response = await api.post(`/admin/users/${selectedUser.id}/reset-password`);

      setResetPassword(response.data.newPassword);
      setSuccess(`用户 "${selectedUser.username}" 的密码已重置`);

      // 不关闭模态框，显示新密码
      fetchUsers();
    } catch (err) {
      console.error('重置密码失败:', err);
      setError(err.response?.data?.message || '操作失败');
    }
  };

  const openBanModal = (user) => {
    setSelectedUser(user);
    setBanReason('');
    setShowBanModal(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setResetPassword('');
    setShowResetModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && users.length === 0) {
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
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            用户管理
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          管理系统用户，执行封禁、解封和密码重置操作
        </p>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {/* 筛选栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 筛选器 */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="">所有角色</option>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="">所有状态</option>
              <option value="false">正常</option>
              <option value="true">已封禁</option>
            </select>
          </div>
        </div>
      </div>

      {/* 用户列表 - 桌面端表格 */}
      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  日记数
                </th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    未找到用户
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.avatarUrl ? (
                            <img
                              src={getImageUrl(user.avatarUrl)}
                              alt={user.username}
                              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span 
                            className={`text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 ${user.avatarUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
                          >
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm lg:text-base truncate">
                            {user.username}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900 dark:text-white">
                      {user._count?.diaries || 0}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-xs font-medium ${
                          user.isBanned
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}
                      >
                        {user.isBanned ? '已封禁' : '正常'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:gap-2">
                        <button
                          onClick={() => navigate(`/profile/${user.username}`)}
                          className="p-1.5 lg:p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="访问用户主页"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openBanModal(user)}
                          disabled={user.role === 'admin'}
                          className={`p-1.5 lg:p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            user.isBanned
                              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                          title={user.isBanned ? '解封用户' : '封禁用户'}
                        >
                          {user.isBanned ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openResetModal(user)}
                          disabled={user.role === 'admin'}
                          className="p-1.5 lg:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="重置密码"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 用户列表 - 移动端卡片 */}
      <div className="sm:hidden space-y-3">
        {users.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">未找到用户</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.username}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                        user.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user.isBanned
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  }`}
                >
                  {user.isBanned ? '已封禁' : '正常'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span>日记: {user._count?.diaries || 0}</span>
                <span>{formatDate(user.createdAt)}</span>
              </div>
              
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  主页
                </button>
                <button
                  onClick={() => openBanModal(user)}
                  disabled={user.role === 'admin'}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    user.isBanned
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                  }`}
                >
                  {user.isBanned ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      解封
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      封禁
                    </>
                  )}
                </button>
                <button
                  onClick={() => openResetModal(user)}
                  disabled={user.role === 'admin'}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Key className="w-4 h-4" />
                  重置密码
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 - 移动端 */}
      <div className="sm:hidden mt-4">
        {pagination.totalPages > 1 && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              显示 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共{' '}
              {pagination.total} 条
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 封禁/解封模态框 */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-full ${
                  selectedUser.isBanned
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}
              >
                {selectedUser.isBanned ? (
                  <Unlock className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedUser.isBanned ? '解封用户' : '封禁用户'}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              您确定要{selectedUser.isBanned ? '解封' : '封禁'}用户 "
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedUser.username}
              </span>
              " 吗？
            </p>

            {!selectedUser.isBanned && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  封禁原因（可选）
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="请输入封禁原因..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                  setBanReason('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBanUser}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  selectedUser.isBanned
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {selectedUser.isBanned ? '确认解封' : '确认封禁'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码模态框 */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                重置密码
              </h3>
            </div>

            {!resetPassword ? (
              <>
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    重置密码后，用户将需要使用新密码登录。此操作不可撤销。
                  </p>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  您确定要重置用户 "
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedUser.username}
                  </span>
                  " 的密码吗？
                </p>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowResetModal(false);
                      setSelectedUser(null);
                      setResetPassword('');
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    确认重置
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    密码重置成功！新密码为：
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 font-mono">
                      {resetPassword}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(resetPassword)}
                      className="px-3 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                    >
                      复制
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowResetModal(false);
                      setSelectedUser(null);
                      setResetPassword('');
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;