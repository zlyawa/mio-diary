import { useState, useEffect, useCallback, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

/**
 * 点赞按钮组件
 */
const LikeButton = ({ diaryId, initialLiked = false, initialCount = 0, size = 'md' }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null);

  // 尺寸配置
  const sizeConfig = {
    sm: { icon: 14, button: 'px-2.5 py-1.5 text-xs gap-1' },
    md: { icon: 16, button: 'px-3 py-2 text-sm gap-1.5' },
    lg: { icon: 18, button: 'px-4 py-2 text-base gap-2' }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  /**
   * 获取点赞状态
   */
  const fetchLikeStatus = useCallback(async () => {
    if (!diaryId) return;
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await api.get(`/interactions/likes/${diaryId}`, {
        signal: abortControllerRef.current.signal
      });
      setLiked(response.data.liked);
      setCount(response.data.likeCount);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return; // 忽略取消的请求
      }
      console.error('获取点赞状态失败:', err);
    }
  }, [diaryId]);

  useEffect(() => {
    fetchLikeStatus();
    
    return () => {
      // 组件卸载时取消请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLikeStatus]);

  /**
   * 切换点赞
   */
  const handleToggle = async () => {
    if (!user) {
      // 可以在这里触发登录弹窗或跳转
      window.location.href = '/login';
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const response = await api.post('/interactions/like', { diaryId });
      setLiked(response.data.liked);
      setCount(response.data.likeCount);
    } catch (err) {
      console.error('点赞操作失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        ${config.button}
        rounded-lg
        inline-flex items-center
        transition-colors
        ${liked
          ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }
        ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Heart
        size={config.icon}
        className={`${liked ? 'fill-current' : ''}`}
      />
      <span>{count || ''}</span>
    </button>
  );
};

export default LikeButton;
