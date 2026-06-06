import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Calendar, Smile, TrendingUp, RefreshCw, Tag, Flame,
  Sparkles, Clock, Heart, PenTool, ChevronRight, BarChart3, PieChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/layout/Header';
import Skeleton from '../components/common/Skeleton';
import api from '../utils/api';

/**
 * 心情映射配置
 */
const MOOD_CONFIG = {
  happy: { emoji: '😊', label: '开心', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  excited: { emoji: '🎉', label: '兴奋', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  grateful: { emoji: '🙏', label: '感恩', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  calm: { emoji: '😌', label: '平静', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  neutral: { emoji: '😐', label: '一般', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  sad: { emoji: '😢', label: '难过', color: 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200' },
  anxious: { emoji: '😰', label: '焦虑', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  angry: { emoji: '😠', label: '生气', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  tired: { emoji: '😴', label: '疲惫', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
};

/**
 * 仪表盘页面组件
 * 展示日记统计数据、心情分布、热门标签和最近日记
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * 获取统计数据
   */
  const fetchStats = async () => {
    // 未登录时不请求
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await api.get('/diaries/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      console.error('获取统计数据失败:', err);
      // 认证错误静默处理，不显示错误提示
      if (!err.isAuthError) {
        toast.error('获取统计数据失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 刷新统计数据
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchStats();
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // 只有在已认证状态下才请求数据
    if (isAuthenticated) {
      fetchStats();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * 计算月度日记数量
   */
  const monthlyCount = useMemo(() => {
    if (!stats?.recentDiaries) return 0;
    const now = new Date();
    return stats.recentDiaries.filter(d => {
      const diaryDate = new Date(d.createdAt);
      return diaryDate.getMonth() === now.getMonth() &&
             diaryDate.getFullYear() === now.getFullYear();
    }).length;
  }, [stats]);

  /**
   * 计算周度日记数量
   */
  const weeklyCount = useMemo(() => {
    if (!stats?.recentDiaries) return 0;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return stats.recentDiaries.filter(d => {
      const diaryDate = new Date(d.createdAt);
      return diaryDate >= weekAgo;
    }).length;
  }, [stats]);

  /**
   * 获取最常心情
   */
  const mostFrequentMood = useMemo(() => {
    if (!stats?.moodCounts) return null;
    const entries = Object.entries(stats.moodCounts);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [stats]);

  /**
   * 计算写作连续天数
   */
  const writingStreak = useMemo(() => {
    if (!stats?.recentDiaries || stats.recentDiaries.length === 0) return 0;
    const dates = stats.recentDiaries
      .map(d => new Date(d.createdAt).toDateString())
      .sort((a, b) => new Date(b) - new Date(a));
    
    const uniqueDates = [...new Set(dates)];
    if (uniqueDates.length === 0) return 0;
    
    let streak = 1;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0;
    }
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const current = new Date(uniqueDates[i]);
      const prev = new Date(uniqueDates[i - 1]);
      const diffDays = (prev - current) / (24 * 60 * 60 * 1000);
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }, [stats]);

  /**
   * 渲染心情分布
   */
  const renderMoodDistribution = () => {
    if (!stats?.moodCounts || Object.keys(stats.moodCounts).length === 0) {
      return (
        <div className="text-center py-8">
          <Smile className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">暂无心情数据</p>
        </div>
      );
    }

    const totalDiaries = Object.values(stats.moodCounts).reduce((sum, count) => sum + count, 0);
    const sortedMoods = Object.entries(stats.moodCounts).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-3">
        {sortedMoods.map(([mood, count]) => {
          const config = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;
          const percentage = totalDiaries > 0 ? ((count / totalDiaries) * 100).toFixed(1) : 0;
          
          return (
            <div key={mood} className="flex items-center gap-3">
              <div className="text-2xl">{config.emoji}</div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {config.label}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.color.split(' ')[0]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * 渲染热门标签
   */
  const renderPopularTags = () => {
    if (!stats?.popularTags || stats.popularTags.length === 0) {
      return (
        <div className="text-center py-8">
          <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">暂无标签数据</p>
        </div>
      );
    }

    const maxCount = Math.max(...stats.popularTags.map(t => t.count));

    return (
      <div className="space-y-3">
        {stats.popularTags.slice(0, 10).map((tag, index) => (
          <div
            key={tag.tag}
            onClick={() => navigate(`/diaries?tag=${encodeURIComponent(tag.tag)}`)}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              #{index + 1}
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tag.tag}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {tag.count} 次
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${(tag.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      {/* 背景装饰 - 纯色 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 - 欢迎区域 */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="slide-up">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-indigo-500" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                欢迎回来，<span className="text-indigo-600 dark:text-indigo-400">{user?.username || '用户'}</span>！
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                今天也是记录美好的一天
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/diaries/new')}
                className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
              >
                <PenTool className="w-5 h-5" />
                <span>写日记</span>
              </button>
              <button
                onClick={() => navigate('/stats')}
                className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 font-medium flex items-center gap-2"
              >
                <PieChart className="w-5 h-5" />
                <span>统计</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                title="刷新数据"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {/* <ErrorMessage message={error} /> */}

        {/* 加载状态 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 统计卡片 - 现代化设计 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* 日记总数 */}
              <div className="card card-hover p-6 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      日记总数
                    </p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalDiaries || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      累计记录
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* 最常心情 */}
              <div className="card card-hover p-6 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      最常心情
                    </p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">
                      {mostFrequentMood ? MOOD_CONFIG[mostFrequentMood]?.emoji : '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {mostFrequentMood ? MOOD_CONFIG[mostFrequentMood]?.label : '暂无数据'}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Smile className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* 本月日记 */}
              <div className="card card-hover p-6 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      本月日记
                    </p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">
                      {monthlyCount}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      本月记录
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* 写作连续天数 */}
              <div className="card card-hover p-6 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      连续写作
                    </p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">
                      {writingStreak}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {writingStreak > 0 ? '保持中' : '开始写作'}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Flame className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* 心情分布和热门标签 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 心情分布 */}
              <div className="card card-hover p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      心情分布
                    </h2>
                  </div>
                </div>
                {renderMoodDistribution()}
              </div>

              {/* 热门标签 */}
              <div className="card card-hover p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      热门标签
                    </h2>
                  </div>
                </div>
                {renderPopularTags()}
              </div>
            </div>

            {/* 最近日记 */}
            <div className="card card-hover p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    最近日记
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/diaries')}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {stats?.recentDiaries?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.recentDiaries.map((diary, index) => {
                    const moodConfig = MOOD_CONFIG[diary.mood] || MOOD_CONFIG.neutral;
                    return (
                      <div
                        key={diary.id}
                        onClick={() => navigate(`/diaries/${diary.id}`)}
                        className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                            {moodConfig.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {diary.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {new Date(diary.createdAt).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">
                    还没有日记，开始记录你的第一篇吧
                  </p>
                  <button
                    onClick={() => navigate('/diaries/new')}
                    className="btn-primary px-8 py-3 rounded-xl"
                  >
                    写第一篇日记
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;