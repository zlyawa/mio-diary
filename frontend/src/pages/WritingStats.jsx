import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Calendar,
  Smile,
  Cloud,
  Clock,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Skeleton from '../components/common/Skeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';

/**
 * 心情映射配置
 */
const MOOD_CONFIG = {
  happy: { emoji: '😊', label: '开心', color: '#22c55e' },
  excited: { emoji: '🎉', label: '兴奋', color: '#f59e0b' },
  calm: { emoji: '😌', label: '平静', color: '#06b6d4' },
  anxious: { emoji: '😰', label: '焦虑', color: '#f97316' },
  sad: { emoji: '😢', label: '难过', color: '#3b82f6' },
  angry: { emoji: '😠', label: '生气', color: '#ef4444' },
  neutral: { emoji: '😐', label: '一般', color: '#6b7280' },
};

/**
 * 获取心情颜色
 */
const getMoodColor = (mood) => MOOD_CONFIG[mood]?.color || '#6b7280';

/**
 * 获取心情标签
 */
const getMoodLabel = (mood) => MOOD_CONFIG[mood]?.label || mood;

/**
 * 热力图单元格组件
 */
const HeatmapCell = ({ date, count, maxCount }) => {
  const getColor = () => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity <= 0.25) return 'bg-green-200 dark:bg-green-900/40';
    if (intensity <= 0.5) return 'bg-green-300 dark:bg-green-800/60';
    if (intensity <= 0.75) return 'bg-green-400 dark:bg-green-700/80';
    return 'bg-green-500 dark:bg-green-600';
  };

  const dateObj = new Date(date);
  const tooltipText = `${dateObj.toLocaleDateString('zh-CN')} - ${count} 篇日记`;

  return (
    <div
      title={tooltipText}
      className={`w-3 h-3 rounded-sm ${getColor()} transition-all duration-200 hover:ring-2 hover:ring-indigo-500 hover:scale-125 cursor-pointer`}
    />
  );
};

/**
 * 写作热力图组件
 */
const WritingHeatmap = ({ data, stats }) => {
  // 组织数据为周格式
  const weeks = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const result = [];
    let currentWeek = [];
    
    data.forEach((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      
      // 如果是第一周，填充前面的空白
      if (index === 0 && dayOfWeek !== 0) {
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push(null);
        }
      }
      
      currentWeek.push(day);
      
      if (dayOfWeek === 6 || index === data.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return result;
  }, [data]);

  // 计算月份标签
  const monthLabels = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const labels = [];
    let currentMonth = -1;
    
    data.forEach((day, index) => {
      const date = new Date(day.date);
      const month = date.getMonth();
      
      if (month !== currentMonth) {
        labels.push({
          month: date.toLocaleDateString('zh-CN', { month: 'short' }),
          weekIndex: Math.floor(index / 7),
        });
        currentMonth = month;
      }
    });
    
    return labels;
  }, [data]);

  const maxCount = stats?.maxCount || 1;

  return (
    <div className="space-y-4">
      {/* 月份标签 */}
      <div className="flex gap-[2px] text-xs text-gray-500 dark:text-gray-400 pl-8">
        {monthLabels.map((label, index) => (
          <div
            key={index}
            className="flex-shrink-0"
            style={{ width: '14px' }}
          >
            {label.month}
          </div>
        ))}
      </div>
      
      {/* 热力图主体 */}
      <div className="flex gap-[2px]">
        {/* 星期标签 */}
        <div className="flex flex-col gap-[2px] mr-2 text-xs text-gray-400">
          <div className="h-3">一</div>
          <div className="h-3">三</div>
          <div className="h-3">五</div>
        </div>
        
        {/* 周数据 */}
        <div className="flex gap-[2px] overflow-x-auto pb-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map((day, dayIndex) => (
                day ? (
                  <HeatmapCell
                    key={`${weekIndex}-${dayIndex}`}
                    date={day.date}
                    count={day.count}
                    maxCount={maxCount}
                  />
                ) : (
                  <div key={`${weekIndex}-${dayIndex}`} className="w-3 h-3" />
                )
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* 图例 */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>少</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40" />
          <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-800/60" />
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700/80" />
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
        </div>
        <span>多</span>
      </div>
      
      {/* 统计数据 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDiaries}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">总日记数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDays}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">写作天数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.maxCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">单日最高</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 心情趋势图表组件
 */
const MoodTrendChart = ({ months, moods }) => {
  const chartData = useMemo(() => {
    if (!months || !moods) return [];
    
    return months.map((month, index) => {
      const data = { month };
      Object.entries(moods).forEach(([mood, counts]) => {
        data[mood] = counts[index] || 0;
      });
      return data;
    });
  }, [months, moods]);

  const moodKeys = useMemo(() => {
    if (!moods) return [];
    return Object.keys(moods).filter(mood => moods[mood].some(c => c > 0));
  }, [moods]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <Smile className="w-12 h-12 mr-4 opacity-50" />
        <p>暂无心情数据</p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          {moodKeys.map((mood) => (
            <Line
              key={mood}
              type="monotone"
              dataKey={mood}
              name={getMoodLabel(mood)}
              stroke={getMoodColor(mood)}
              strokeWidth={2}
              dot={{ fill: getMoodColor(mood), strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * 词云组件
 */
const WordCloud = ({ words }) => {
  if (!words || words.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <Cloud className="w-12 h-12 mr-4 opacity-50" />
        <p>暂无词云数据，多写几篇日记吧</p>
      </div>
    );
  }

  const maxCount = Math.max(...words.map(w => w.count), 1);
  const minCount = Math.min(...words.map(w => w.count), 1);
  
  // 颜色调色板（纯色）
  const colors = [
    'text-indigo-600 dark:text-indigo-400',
    'text-blue-600 dark:text-blue-400',
    'text-green-600 dark:text-green-400',
    'text-yellow-600 dark:text-yellow-400',
    'text-red-600 dark:text-red-400',
    'text-purple-600 dark:text-purple-400',
    'text-pink-600 dark:text-pink-400',
    'text-cyan-600 dark:text-cyan-400',
  ];

  const getFontSize = (count) => {
    const ratio = (count - minCount) / Math.max(maxCount - minCount, 1);
    return 0.75 + ratio * 1.5; // 0.75rem to 2.25rem
  };

  // 打乱词序
  const shuffledWords = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5);
  }, [words]);

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center min-h-[200px] p-4">
      {shuffledWords.map((word, index) => (
        <span
          key={word.text}
          className={`${colors[index % colors.length]} font-medium transition-all duration-300 hover:scale-110 cursor-pointer`}
          style={{
            fontSize: `${getFontSize(word.count)}rem`,
            opacity: 0.6 + (word.count / maxCount) * 0.4,
          }}
          title={`出现 ${word.count} 次`}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};

/**
 * 写作习惯图表组件
 */
const WritingHabitsChart = ({ hours, counts, stats }) => {
  const chartData = useMemo(() => {
    if (!hours || !counts) return [];
    return hours.map((hour, index) => ({
      hour: hour.substring(0, 2), // 只显示小时
      count: counts[index],
      fullHour: hour,
    }));
  }, [hours, counts]);

  const maxCount = Math.max(...(counts || []), 1);
  const peakHours = stats?.peakHours || [];

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <Clock className="w-12 h-12 mr-4 opacity-50" />
        <p>暂无写作习惯数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="hour"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              interval={2}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value) => [`${value} 篇`, '日记数']}
              labelFormatter={(label) => `${label}:00 - ${label}:59`}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">写作高峰时段</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {peakHours.length > 0 ? peakHours.join(', ') : '暂无数据'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">主要写作时段</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.mainTimeRange?.label || '暂无数据'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 统计数据页面
 */
const WritingStats = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { enableStatistics } = useConfig();
  const [activeTab, setActiveTab] = useState('heatmap');
  const [stats, setStats] = useState({
    heatmap: null,
    moodTrend: null,
    wordCloud: null,
    writingHabits: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 如果统计功能未启用，显示提示
  if (!enableStatistics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">统计功能未启用</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            管理员尚未启用统计功能，请联系管理员开启。
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  /**
   * 获取统计数据
   */
  const fetchStats = useCallback(async () => {
    // 未登录时不请求
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    setError('');
    try {
      const response = await api.get('/stats/all');
      setStats(response.data);
    } catch (err) {
      console.error('获取统计数据失败:', err);
      // 认证错误静默处理，不显示错误提示
      if (!err.isAuthError) {
        setError('获取统计数据失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    } else {
      setIsLoading(false);
    }
  }, [fetchStats, isAuthenticated]);

  const tabs = [
    { id: 'heatmap', label: '写作热力图', icon: Calendar },
    { id: 'mood', label: '心情趋势', icon: Smile },
    { id: 'wordcloud', label: '词云', icon: Cloud },
    { id: 'habits', label: '写作习惯', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-6 h-6 text-indigo-500" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  写作统计
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                深入了解你的写作习惯和心情变化
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>刷新数据</span>
          </button>
        </div>

        {/* 错误提示 */}
        <ErrorMessage message={error} />

        {/* 加载状态 */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
                <Skeleton className="h-8 w-48 rounded-lg mb-4" />
                <Skeleton className="h-64 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 标签页导航 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 内容区域 */}
            <div className="space-y-6">
              {/* 写作热力图 */}
              {(activeTab === 'heatmap' || activeTab === 'all') && (
                <div className="card card-hover p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        写作热力图
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        过去一年每天的写作情况
                      </p>
                    </div>
                  </div>
                  <WritingHeatmap
                    data={stats.heatmap?.data}
                    stats={stats.heatmap?.stats}
                  />
                </div>
              )}

              {/* 心情趋势 */}
              {(activeTab === 'mood' || activeTab === 'all') && (
                <div className="card card-hover p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center">
                      <Smile className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        心情趋势
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        按月统计各种心情的变化趋势
                      </p>
                    </div>
                  </div>
                  <MoodTrendChart
                    months={stats.moodTrend?.months}
                    moods={stats.moodTrend?.moods}
                  />
                </div>
              )}

              {/* 词云 */}
              {(activeTab === 'wordcloud' || activeTab === 'all') && (
                <div className="card card-hover p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                      <Cloud className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        词云
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        日记中出现频率最高的词汇
                      </p>
                    </div>
                  </div>
                  <WordCloud words={stats.wordCloud?.words} />
                </div>
              )}

              {/* 写作习惯 */}
              {(activeTab === 'habits' || activeTab === 'all') && (
                <div className="card card-hover p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        写作习惯
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        一天中各时间段的写作分布
                      </p>
                    </div>
                  </div>
                  <WritingHabitsChart
                    hours={stats.writingHabits?.hours}
                    counts={stats.writingHabits?.counts}
                    stats={stats.writingHabits?.stats}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WritingStats;