import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Calendar, BookOpen, Smile, Clock, Settings, Edit3, Image as ImageIcon, Lock } from 'lucide-react';
import api, { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Header from '../components/layout/Header';

const ProfilePage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backgroundError, setBackgroundError] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/profile/${username}`);
      setProfile(response.data.user);
      setBackgroundError(false);
    } catch (err) {
      setError(err.response?.data?.message || '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMoodEmoji = (mood) => {
    const moodMap = {
      happy: '😊',
      sad: '😢',
      excited: '🎉',
      calm: '😌',
      anxious: '😰',
      angry: '😠',
      neutral: '😐'
    };
    return moodMap[mood] || '😐';
  };

  const parseImages = (images) => {
    try {
      return JSON.parse(images || '[]');
    } catch {
      return [];
    }
  };

  if (loading) return <LoadingSpinner size="large" />;
  if (error) return <ErrorMessage message={error} />;
  if (!profile) return <ErrorMessage message="用户不存在" />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header 导航栏 */}
      <Header />

      {/* 背景图区域 - 作为顶部横幅，不与内容重叠 */}
      {profile.backgroundUrl && !backgroundError && (
        <div className="h-48 sm:h-56 md:h-72 lg:h-80 overflow-hidden relative bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 z-0">
          <img
            src={getImageUrl(profile.backgroundUrl)}
            alt="背景图"
            className="w-full h-full object-cover"
            onError={() => setBackgroundError(true)}
          />
          {/* 渐变遮罩，提高文字可读性 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      {/* 主内容区域 - 独立布局，无重叠 */}
      <div className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 relative z-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 relative z-20">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
            {/* 头像区域 - 确保层级在背景图之上 */}
            <div className="relative flex-shrink-0 z-30">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 relative z-30">
                {profile.avatarUrl ? (
                  <img
                    src={getImageUrl(profile.avatarUrl)}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* 用户信息区域 - 确保正确的z-index层级 */}
            <div className="flex-1 text-center md:text-left w-full relative z-20">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 sm:mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {profile.username}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1.5 sm:mt-2 line-clamp-2">
                    {profile.bio || "这个人很懒，还没有签名..."}
                  </p>
                </div>
                {profile.isOwnProfile && (
                  <Link
                    to="/settings"
                    className="mt-3 sm:mt-4 md:mt-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">编辑资料</span>
                    <span className="sm:hidden">编辑</span>
                  </Link>
                )}
              </div>

              {/* 用户统计信息 - 优化移动端网格布局 */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
                <div className="flex items-center gap-1.5 sm:gap-3 justify-center md:justify-start">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <div className="text-center md:text-left">
                    <div className="text-xs sm:text-sm text-gray-500">用户名</div>
                    <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate max-w-[80px] sm:max-w-none">
                      {profile.username}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3 justify-center md:justify-start">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <div className="text-center md:text-left">
                    <div className="text-xs sm:text-sm text-gray-500">注册日期</div>
                    <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                      {new Date(profile.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3 justify-center md:justify-start">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <div className="text-center md:text-left">
                    <div className="text-xs sm:text-sm text-gray-500">日记</div>
                    <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                      {profile.diaries?.length || 0} 篇
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 日记列表区域 */}
        {profile.diaries && profile.diaries.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                最近日记
              </h2>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
              {profile.diaries.map((diary) => {
                const images = parseImages(diary.images);
                const firstImage = images[0];
                
                return (
                  <Link
                    key={diary.id}
                    to={`/diaries/${diary.id}`}
                    className="block group"
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden break-inside-avoid">
                      {/* 图片缩略图 */}
                      {firstImage && (
                        <div className="h-36 sm:h-40 overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <img
                            src={getImageUrl(firstImage)}
                            alt={diary.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      
                      <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate flex-1">
                            {diary.title}
                          </h3>
                          <span className="text-xl sm:text-2xl ml-2">
                            {getMoodEmoji(diary.mood)}
                          </span>
                        </div>
                        
                        {/* 标签 */}
                        {diary.tags && JSON.parse(diary.tags || '[]').length > 0 && (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                            {JSON.parse(diary.tags || '[]').slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 sm:px-2 sm:py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-700 dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 底部信息 */}
                        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{formatDate(diary.createdAt)}</span>
                            <span className="sm:hidden">{new Date(diary.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                          </div>
                          {images.length > 0 && (
                            <div className="flex items-center gap-1 text-gray-400">
                              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>{images.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 日记不可见提示 */}
        {!profile.isOwnProfile && profile.diaryPublic === false && (
          <div className="mt-6 sm:mt-8 text-center py-10 sm:py-12 px-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4 sm:mb-6">
              <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-purple-500 dark:text-purple-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              此用户设置了不可看~
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              该用户的日记设置为私密，仅自己可见
            </p>
          </div>
        )}

        {/* 空状态 - 优化图标颜色和布局 */}
        {(!profile.diaries || profile.diaries.length === 0) && profile.diaryPublic !== false && (
          <div className="mt-6 sm:mt-8 text-center py-10 sm:py-12 px-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4 sm:mb-6">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              还没有日记
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 sm:mb-8">
              开始记录你的生活吧
            </p>
            {profile.isOwnProfile && (
              <Link
                to="/diaries/new"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                写第一篇日记
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;