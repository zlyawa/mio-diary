import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Edit, Trash2, ArrowLeft, Calendar, Tag, Image as ImageIcon, 
  Printer, Share2, X, ZoomIn, ChevronLeft, ChevronRight, Lock,
  Clock, AlertCircle
} from 'lucide-react';
import DOMPurify from 'dompurify';
import Header from '../components/layout/Header';
// import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/common/Skeleton';
import CommentSection from '../components/comments/CommentSection';
import LikeButton from '../components/interactions/LikeButton';
import FavoriteButton from '../components/interactions/FavoriteButton';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
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
 * 日记状态配置
 */
const STATUS_CONFIG = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: null },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: AlertCircle },
};

/**
 * 日记详情页面组件
 * 展示日记的完整内容、图片、标签等信息
 */
const DiaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { enableLike, enableComment, enableFavorite, enableShare } = useConfig();
  const toast = useToast();
  const [diary, setDiary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  /**
   * 判断是否为日记所有者
   */
  const isOwnDiary = user && diary && diary.userId === user.id;

  /**
   * 判断是否为管理员
   */
  const isAdmin = user && user.role === 'admin';

  /**
   * 判断是否需要显示审核状态
   * 只对自己的日记且状态为pending时显示
   */
  const showReviewStatus = diary && (diary.status === 'pending' || diary.status === 'rejected');

  /**
   * 获取日记详情
   */
  const fetchDiary = useCallback(async () => {
    // 未登录时不请求
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.get(`/diaries/${id}`);
      setDiary(response.data.diary);
    } catch (err) {
      console.error('获取日记失败:', err);
      // 认证错误静默处理，不显示错误提示
      if (!err.isAuthError) {
        toast.error(err.response?.data?.error || err.response?.data?.message || '获取日记失败');
      }
      setDiary(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, toast, isAuthenticated]);

  /**
   * 删除日记
   */
  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇日记吗？此操作不可恢复。')) {
      return;
    }

    setIsDeleting(true);
    try {
      // 管理员使用管理员 API 删除，普通用户使用普通 API
      if (isAdmin) {
        await api.delete(`/admin/diaries/${id}`);
      } else {
        await api.delete(`/diaries/${id}`);
      }
      toast.success('日记删除成功');
      navigate('/diaries');
    } catch (err) {
      console.error('删除日记失败:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 打印日记
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * 分享日记
   */
  const handleShare = async () => {
    const url = window.location.href;
    const title = diary?.title || '我的日记';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (err) {
        console.error('分享失败:', err);
      }
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(url).then(() => {
        toast.success('链接已复制到剪贴板');
      }).catch(() => {
        toast.error('复制失败，请手动复制链接');
      });
    }
  };

  /**
   * 打开图片灯箱
   */
  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setShowLightbox(true);
  };

  /**
   * 关闭图片灯箱
   */
  const closeLightbox = () => {
    setShowLightbox(false);
  };

  /**
   * 上一张图片
   */
  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? (diary.images?.length || 1) - 1 : prev - 1
    );
  };

  /**
   * 下一张图片
   */
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === (diary.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  /**
   * 键盘事件处理
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showLightbox) return;
      
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, diary?.images?.length]);

  useEffect(() => {
    fetchDiary();
  }, [fetchDiary]);

  /**
   * 渲染加载状态
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <Skeleton className="h-64 mb-4" />
            <Skeleton className="h-64 mb-4" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  /**
   * 渲染错误状态
   */
  if (error && !diary) {
    // 处理 403 错误（无权限访问私密日记）
    if (error.includes('无权限访问') || error.includes('AuthorizationError')) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-6">
                <Lock size={40} className="text-purple-500 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                无权限访问
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                该用户的日记设置为私密，仅自己可见
              </p>
              <button
                onClick={() => navigate(-1)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                返回上一页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* <ErrorMessage message={error} /> */}
          <button
            onClick={() => navigate('/diaries')}
            className="mt-4 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <ArrowLeft size={16} />
            返回日记列表
          </button>
        </div>
      </div>
    );
  }

  /**
   * 渲染空状态
   */
  if (!diary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">日记不存在</p>
            <button
              onClick={() => navigate('/diaries')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              返回日记列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  const moodConfig = MOOD_CONFIG[diary.mood] || MOOD_CONFIG.neutral;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        {/* 错误提示 */}
        {/* <ErrorMessage message={error} /> */}

        {/* 日记卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* 待审核状态提示 - 仅显示在日记卡片上方 */}
          {showReviewStatus && (
            <div className={`px-4 sm:px-6 py-3 border-b ${diary.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-2">
                {diary.status === 'pending' ? (
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <span className={`font-medium ${diary.status === 'pending' ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'}`}>
                  {diary.status === 'pending' ? '该日记正在审核中，审核通过后其他用户才能看到' : '该日记审核未通过，请修改后重新提交'}
                </span>
              </div>
            </div>
          )}

          {/* 头部 */}
          <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="flex-1">
                {/* 标题 */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                  {diary.title}
                </h1>

                {/* 作者信息 */}
                {diary.user && (
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <button
                      onClick={() => navigate(`/profile/${diary.user.username}`)}
                      className="flex items-center gap-2 group"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
                        {diary.user.avatarUrl ? (
                          <img
                            src={getImageUrl(diary.user.avatarUrl)}
                            alt={diary.user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            {diary.user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {diary.user.username}
                      </span>
                    </button>
                  </div>
                )}

                {/* 元信息 - 优化手机端布局 */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <Calendar size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{new Date(diary.createdAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                    <span className="sm:hidden">{new Date(diary.createdAt).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    })}</span>
                  </span>
                  <span className="text-lg sm:text-2xl">{moodConfig.emoji}</span>
                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs ${moodConfig.color}`}>
                    {moodConfig.label}
                  </span>
                  {/* 审核状态标签 */}
                  {showReviewStatus && (
                    <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${STATUS_CONFIG[diary.status].color}`}>
                      {STATUS_CONFIG[diary.status].label}
                    </span>
                  )}
                </div>
              </div>

              {/* 操作按钮 - 优化手机端布局 */}
              <div className="flex gap-2 sm:ml-4 self-start">
                {isOwnDiary && (
                  <button
                    onClick={() => navigate(`/diaries/${id}/edit`)}
                    className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                    title="编辑"
                  >
                    <Edit size={18} className="sm:w-5 sm:h-5" />
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
                  title="打印"
                >
                  <Printer size={18} className="sm:w-5 sm:h-5" />
                </button>
                {enableShare && (
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
                    title="分享"
                  >
                    <Share2 size={18} className="sm:w-5 sm:h-5" />
                  </button>
                )}
                {(isOwnDiary || isAdmin) && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="删除"
                  >
                    <Trash2 size={18} className="sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 内容 */}
          <div className="p-4 sm:p-6 lg:p-8">
            {/* 正文 */}
            <div className="prose prose-sm sm:prose-lg dark:prose-invert max-w-none mb-6 sm:mb-8">
              <div
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(diary.content) }}
                className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base"
              />
            </div>

            {/* 标签 */}
            {diary.tags && diary.tags.length > 0 && (
              <div className="flex items-center gap-2 mb-6 sm:mb-8">
                <Tag size={16} className="text-gray-400 sm:w-[18px] sm:h-[18px]" />
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {diary.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 图片 */}
            {diary.images && diary.images.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <ImageIcon size={16} className="text-gray-400 sm:w-[18px] sm:h-[18px]" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    图片 ({diary.images.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  {diary.images.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => openLightbox(index)}
                      className="relative group cursor-pointer"
                    >
                      <img
                        src={`${UPLOAD_BASE_URL}${image}`}
                        alt={`图片 ${index + 1}`}
                        loading="lazy"
                        className="w-full h-32 sm:h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 点赞和收藏按钮 + 更新时间 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              {diary && (enableLike || enableFavorite) ? (
                <>
                  <div className="flex items-center gap-2">
                    {enableLike && <LikeButton diaryId={diary.id} size="sm" />}
                    {enableFavorite && <FavoriteButton diaryId={diary.id} size="sm" />}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(diary.updatedAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                  最后更新: {new Date(diary.updatedAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 评论区域 - 根据系统配置显示 */}
        {enableComment && diary && <CommentSection diaryId={id} />}
      </div>

      {/* 图片灯箱 */}
      {showLightbox && diary.images && diary.images.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* 关闭按钮 */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          {/* 上一张按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft size={32} />
          </button>

          {/* 图片 */}
          <img
            src={`${UPLOAD_BASE_URL}${diary.images[currentImageIndex]}`}
            alt={`图片 ${currentImageIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 下一张按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight size={32} />
          </button>

          {/* 图片计数 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/50 text-white rounded-full text-sm">
            {currentImageIndex + 1} / {diary.images.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryDetail;