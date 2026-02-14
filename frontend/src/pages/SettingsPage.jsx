import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Calendar, Settings2, Image, ArrowLeft } from 'lucide-react';
import api, { getImageUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import AvatarUploader from '../components/profile/AvatarUploader';
import BackgroundUploader from '../components/profile/BackgroundUploader';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user: authUser, logout, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    bio: '',
    diaryPublic: true,
    currentPassword: '',
    newPassword: '',
    username: '',
  });
  const [usernameEditing, setUsernameEditing] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/profile/me');
      setUser(response.data.user);
      setFormData(prev => ({ 
        ...prev, 
        bio: response.data.user.bio || '',
        diaryPublic: response.data.user.diaryPublic !== false,
        username: response.data.user.username || ''
      }));
    } catch (error) {
      setError(error.response?.data?.message || '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      // 如果用户名有变化，先更新用户名
      if (formData.username !== user?.username) {
        await api.put('/auth/username', { username: formData.username });
        // 同步更新 AuthContext 中的用户名
        updateUser({ username: formData.username });
      }
      // 更新其他资料
      await api.put('/profile', { 
        bio: formData.bio,
        diaryPublic: formData.diaryPublic
      });
      await fetchUserData();
      setSuccessMessage('个人资料更新成功');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || '更新失败');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      await api.put('/profile/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccessMessage('密码修改成功，请重新登录');
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || '修改失败');
    }
  };

  const handleAvatarUpdated = () => {
    fetchUserData();
  };

  const handleBackgroundUpdated = () => {
    fetchUserData();
  };

  const handleUpdateUsername = async () => {
    setError('');
    setSuccessMessage('');
    setUsernameSaving(true);

    try {
      await api.put('/auth/username', { username: formData.username });
      await fetchUserData();
      setSuccessMessage('用户名修改成功');
      setUsernameEditing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || '修改失败');
    } finally {
      setUsernameSaving(false);
    }
  };

  if (loading) return <LoadingSpinner size="large" />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              账户设置
            </h1>
          </div>
          <button
            onClick={() => navigate(`/profile/${authUser?.username}`)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回</span>
          </button>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError('')} />
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
            {successMessage}
          </div>
        )}

        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              头像设置
            </h2>
            <AvatarUploader 
              currentAvatar={getImageUrl(user?.avatarUrl)}
              onSuccess={handleAvatarUpdated}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              背景图设置
            </h2>
            <BackgroundUploader 
              currentBackground={getImageUrl(user?.backgroundUrl)}
              onSuccess={handleBackgroundUpdated}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              基本信息
            </h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入用户名"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    用户名必须是2-16个字符，只能包含字母、数字、下划线和中文
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    个人签名
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    maxLength="200"
                    rows="3"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="分享你的个性签名..."
                  />
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formData.bio.length}/200
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    日记可见性
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, diaryPublic: true })}
                      className={`min-h-[80px] px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.diaryPublic !== false
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">公开</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">其他用户可以查看</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, diaryPublic: false })}
                      className={`min-h-[80px] px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.diaryPublic === false
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">私密</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">仅自己可见</div>
                      </div>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    选择"私密"后，其他用户访问你的主页时将无法看到你的日记列表
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    注册日期
                  </label>
                  <input
                    type="text"
                    value={new Date(user?.createdAt).toLocaleDateString('zh-CN')}
                    disabled
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              修改密码
            </h2>
            <form onSubmit={handleChangePassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    当前密码
                  </label>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    新密码
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={8}
                    maxLength={100}
                    title="密码需包含字母、数字和特殊字符，至少8位"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    密码要求：8-100个字符，包含字母、数字和特殊字符
                  </p>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  修改密码
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;