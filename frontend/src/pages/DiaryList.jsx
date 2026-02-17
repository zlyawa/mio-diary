import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Calendar, Tag, Filter, Grid3X3, List, Trash2, X, ChevronDown, Folder } from 'lucide-react';
import DOMPurify from 'dompurify';
import Header from '../components/layout/Header';
import Skeleton from '../components/common/Skeleton';
// import ErrorMessage from '../components/common/ErrorMessage';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/api';

/**
 * API基础URL（用于API请求）
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * 静态文件基础URL（用于访问上传的图片）
 * 注意：后端静态文件服务直接挂载在 /uploads 路径下，而不是在 /api 下
 */
const UPLOAD_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

/**
 * 心情配置
 */
const MOOD_CONFIG = [
  { value: '', label: '全部心情', emoji: '📝' },
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'excited', label: '兴奋', emoji: '🎉' },
  { value: 'grateful', label: '感恩', emoji: '🙏' },
  { value: 'calm', label: '平静', emoji: '😌' },
  { value: 'neutral', label: '一般', emoji: '😐' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'anxious', label: '焦虑', emoji: '😰' },
  { value: 'angry', label: '生气', emoji: '😠' },
  { value: 'tired', label: '疲惫', emoji: '😴' },
];

/**
 * 排序选项
 */
const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: '最新创建' },
  { value: 'createdAt-asc', label: '最早创建' },
  { value: 'updatedAt-desc', label: '最近更新' },
  { value: 'updatedAt-asc', label: '最早更新' },
];

/**
 * 防抖Hook
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * 日记列表页面组件
 * 提供日记列表展示、搜索、筛选、分页等功能
 */
const DiaryList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [diaries, setDiaries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('categoryId') || '');
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDiaries, setSelectedDiaries] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 防抖搜索
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  /**
   * 获取心情emoji
   */
  const getMoodEmoji = useCallback((mood) => {
    const config = MOOD_CONFIG.find(m => m.value === mood);
    return config?.emoji || '😐';
  }, []);

  /**
   * 获取心情标签
   */
  const getMoodLabel = useCallback((mood) => {
    const config = MOOD_CONFIG.find(m => m.value === mood);
    return config?.label || '一般';
  }, []);

  /**
   * 获取心情颜色类
   */
  const getMoodColorClass = useCallback((mood) => {
    const colorMap = {
      happy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      excited: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      grateful: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      calm: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      sad: 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
      anxious: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      angry: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      tired: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return colorMap[mood] || colorMap.neutral;
  }, []);

  /**
   * 获取日记列表
   */
  const fetchDiaries = useCallback(async () => {
    // 未登录时不请求
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const [sortField, sortOrder] = sortBy.split('-');
      const params = { 
        page,
        sortBy: sortField,
        order: sortOrder,
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (moodFilter) params.mood = moodFilter;
      if (categoryFilter) params.categoryId = categoryFilter;

      const response = await api.get('/diaries', { params });
      setDiaries(response.data.diaries || []);
      setPagination(response.data.pagination);
      setSelectedDiaries([]);
    } catch (err) {
      console.error('获取日记列表失败:', err);
      // 认证错误静默处理，不显示错误提示
      if (!err.isAuthError) {
        toast.error('获取日记列表失败，请稍后重试');
      }
      setDiaries([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearchTerm, moodFilter, categoryFilter, sortBy, toast, isAuthenticated]);

  /**
   * 获取分类列表
   */
  const fetchCategories = useCallback(async () => {
    // 未登录时不请求
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('获取分类失败:', err);
    }
  }, [isAuthenticated]);

  /**
   * 删除选中日记
   */
  const handleDeleteSelected = async () => {
    if (selectedDiaries.length === 0) return;
    
    if (!confirm(`确定要删除选中的 ${selectedDiaries.length} 篇日记吗？`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await Promise.all(
        selectedDiaries.map(id => api.delete(`/diaries/${id}`))
      );
      toast.success(`成功删除 ${selectedDiaries.length} 篇日记`);
      setSelectedDiaries([]);
      await fetchDiaries();
    } catch (err) {
      console.error('删除日记失败:', err);
      toast.error('删除日记失败，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 切换日记选中状态
   */
  const toggleSelectDiary = (id) => {
    setSelectedDiaries(prev => {
      if (prev.includes(id)) {
        return prev.filter(d => d !== id);
      }
      return [...prev, id];
    });
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedDiaries.length === diaries.length) {
      setSelectedDiaries([]);
    } else {
      setSelectedDiaries(diaries.map(d => d.id));
    }
  };

  /**
   * 清除筛选
   */
  const clearFilters = () => {
    setSearchTerm('');
    setMoodFilter('');
    setCategoryFilter('');
    setSortBy('createdAt-desc');
    setPage(1);
  };

  /**
   * 获取筛选状态文本
   */
  const getFilterStatusText = () => {
    const filters = [];
    if (searchTerm) filters.push(`搜索: "${searchTerm}"`);
    if (moodFilter) filters.push(`心情: ${getMoodLabel(moodFilter)}`);
    if (categoryFilter) {
      const categoryName = getCategoryNameById(categoryFilter);
      filters.push(`分类: ${categoryName}`);
    }
    if (sortBy !== 'createdAt-desc') {
      const sortOption = SORT_OPTIONS.find(s => s.value === sortBy);
      if (sortOption) filters.push(`排序: ${sortOption.label}`);
    }
    return filters.join(' | ');
  };

  /**
   * 根据ID获取分类名称
   */
  const getCategoryNameById = (id) => {
    const findName = (cats) => {
      for (const cat of cats) {
        if (cat.id === id) return cat.name;
        if (cat.children) {
          const found = findName(cat.children);
          if (found) return found;
        }
      }
      return '未知分类';
    };
    return findName(categories);
  };

  useEffect(() => {
    fetchDiaries();
    fetchCategories();
  }, [fetchDiaries, fetchCategories]);

  /**
   * 渲染日记卡片（列表视图）
   */
  const renderListItem = (diary) => {
    const isSelected = selectedDiaries.includes(diary.id);
    const moodConfig = MOOD_CONFIG.find(m => m.value === diary.mood);

    return (
      <div
        key={diary.id}
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 sm:p-6 hover:shadow-lg transition-all cursor-pointer border-2 ${
          isSelected ? 'border-indigo-500' : 'border-transparent'
        }`}
        onClick={(e) => {
          if (e.target.type === 'checkbox') return;
          navigate(`/diaries/${diary.id}`);
        }}
      >
        <div className="flex items-start gap-4">
          {/* 选择框 */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectDiary(diary.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
          />

          {/* 心情图标 */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
            {moodConfig?.emoji || '😐'}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {diary.title}
              </h3>
              <span className={`px-2.5 py-1 text-xs rounded-full ${getMoodColorClass(diary.mood)}`}>
                {getMoodLabel(diary.mood)}
              </span>
            </div>

            {/* 作者和日期 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(diary.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {diary.updatedAt !== diary.createdAt && (
                <span className="text-xs">
                  (更新于 {new Date(diary.updatedAt).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                  })})
                </span>
              )}
            </div>

            {/* 内容预览 */}
            <p
              className="text-gray-600 dark:text-gray-300 line-clamp-2 text-sm"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(diary.content) }}
            />

            {/* 分类和标签 */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {/* 分类 */}
              {diary.category && (
                <div className="flex items-center gap-1.5">
                  <Folder size={14} className="text-gray-400" />
                  <span
                    className="px-2 py-0.5 text-xs rounded-full font-medium"
                    style={{
                      backgroundColor: diary.category.color ? `${diary.category.color}20` : '#E5E7EB',
                      color: diary.category.color || '#374151',
                    }}
                  >
                    {diary.category.name}
                  </span>
                </div>
              )}
            </div>

            {/* 标签 */}
            {diary.tags && diary.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Tag size={14} className="text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {diary.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {diary.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{diary.tags.length - 3}</span>
                  )}
                </div>
              </div>
            )}

            {/* 图片预览 */}
            {diary.images && diary.images.length > 0 && (
              <div className="mt-4 flex gap-2">
                {diary.images.slice(0, 4).map((image, index) => (
                  <img
                    key={index}
                    src={`${UPLOAD_BASE_URL}${image}`}
                    alt=""
                    loading="lazy"
                    className="w-14 h-14 sm:w-12 sm:h-12 object-cover rounded-lg"
                  />
                ))}
                {diary.images.length > 4 && (
                  <div className="w-14 h-14 sm:w-12 sm:h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                    +{diary.images.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染分页器
   */
  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, page - halfVisible);
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
        {/* 上一页 */}
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          上一页
        </button>

        {/* 第一页 */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => setPage(1)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
          </>
        )}

        {/* 页码 */}
        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => setPage(pageNum)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              page === pageNum
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {pageNum}
          </button>
        ))}

        {/* 最后一页 */}
        {endPage < pagination.totalPages && (
          <>
            {endPage < pagination.totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
            <button
              onClick={() => setPage(pagination.totalPages)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {pagination.totalPages}
            </button>
          </>
        )}

        {/* 下一页 */}
        <button
          onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          disabled={page === pagination.totalPages}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          下一页
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              我的日记
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {pagination ? `共 ${pagination.total} 篇日记` : '加载中...'}
            </p>
          </div>
          <button
            onClick={() => navigate('/diaries/new')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            写日记
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
              {/* 搜索框 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索日记标题或内容..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* 心情筛选 */}
              <select
                value={moodFilter}
                onChange={(e) => {
                  setMoodFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {MOOD_CONFIG.map((mood) => (
                  <option key={mood.value} value={mood.value}>
                    {mood.emoji} {mood.label}
                  </option>
                ))}
              </select>

              {/* 分类筛选 */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">📁 所有分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* 排序 */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* 清除筛选 */}
              {(searchTerm || moodFilter || categoryFilter || sortBy !== 'createdAt-desc') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  清除筛选
                </button>
              )}
            </div>

            {/* 筛选状态 */}
            {(searchTerm || moodFilter || categoryFilter || sortBy !== 'createdAt-desc') && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Filter size={14} />
                <span>当前筛选: {getFilterStatusText()}</span>
              </div>
            )}
          </form>
        </div>

        {/* 批量操作栏 */}
        {selectedDiaries.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedDiaries.length === diaries.length && diaries.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                已选择 {selectedDiaries.length} 篇日记
              </span>
            </div>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isDeleting ? '删除中...' : '删除选中'}
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {/* <ErrorMessage message={error} /> */}

        {/* 加载状态 */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <Skeleton className="h-32" />
              </div>
            ))}
          </div>
        ) : diaries.length > 0 ? (
          <>
            {/* 日记列表 */}
            <div className="space-y-4 sm:space-y-5 mb-6">
              {diaries.map(renderListItem)}
            </div>

            {/* 分页 */}
            {renderPagination()}
          </>
        ) : (
          /* 空状态 */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm || moodFilter ? '没有找到匹配的日记' : '还没有日记'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || moodFilter 
                ? '尝试调整搜索词或筛选条件'
                : '开始记录你的生活点滴吧'
              }
            </p>
            <button
              onClick={() => navigate('/diaries/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              写第一篇日记
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryList;