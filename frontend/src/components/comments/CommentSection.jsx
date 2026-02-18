import { 
  useEffect, 
  useState, 
  useCallback, 
  useRef, 
  useMemo,
  memo 
} from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Send, 
  Heart, 
  MessageSquare, 
  Trash2, 
  Image as ImageIcon,
  X,
  CornerDownRight,
  Loader2,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  ThumbsUp,
  Clock,
  Code,
  Link as LinkIcon
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { getImageUrl } from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import './CommentStyles.css';

// 草稿本地存储键名
const DRAFT_STORAGE_KEY = 'comment_draft_';
const DRAFT_EXPIRY = 24 * 60 * 60 * 1000; // 24小时过期

/**
 * 评论区域组件
 * 功能特性：
 * - 评论列表展示（树形结构，支持多级回复）
 * - 发表评论、回复
 * - 点赞功能（乐观更新 + 动画）
 * - 删除评论
 * - 图片上传
 * - 加载更多/无限滚动
 * - 评论排序（最新、最热）
 * - 草稿自动保存
 * - Markdown渲染
 */
const CommentSection = ({ diaryId }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  // ========== 状态管理 ==========
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [pendingImages, setPendingImages] = useState([]); // 待上传的图片预览
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'hottest'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [likedComments, setLikedComments] = useState(new Set()); // 乐观更新的点赞状态
  const [likingInProgress, setLikingInProgress] = useState(new Set()); // 防止重复点击
  const [showReplyPreview, setShowReplyPreview] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const commentsListRef = useRef(null);
  const inputAreaRef = useRef(null);
  const loadMoreRef = useRef(null);
  const draftSaveTimerRef = useRef(null);

  // ========== 计算属性 ==========
  const sortedComments = useMemo(() => {
    if (!Array.isArray(comments)) return [];
    
    const sorted = [...comments];
    if (sortBy === 'hottest') {
      // 按点赞数排序，同时考虑时间因素
      sorted.sort((a, b) => {
        const scoreA = (a.likeCount || 0) + (a.replyCount || 0) * 0.5;
        const scoreB = (b.likeCount || 0) + (b.replyCount || 0) * 0.5;
        return scoreB - scoreA;
      });
    }
    // 'newest' 默认就是时间顺序
    return sorted;
  }, [comments, sortBy]);

  const commentCount = useMemo(() => {
    if (!Array.isArray(comments)) return 0;
    let count = comments.length;
    comments.forEach(c => {
      count += c.replies?.total || 0;
    });
    return count;
  }, [comments]);

  // ========== 数据获取 ==========
  const fetchComments = useCallback(async (pageNum = 1, append = false) => {
    // 验证diaryId存在
    if (!diaryId) {
      console.warn('[CommentSection] diaryId 为空，跳过获取评论');
      setLoading(false);
      return;
    }

    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      
      const response = await api.get(`/comments/${diaryId}`, {
        params: { 
          page: pageNum, 
          limit: 20,
          sort: sortBy === 'newest' ? 'desc' : 'asc'
        }
      });
      
      // API 响应格式: { success: true, data: { comments: [...], pagination: {...} } }
      const responseData = response.data?.data || response.data;
      
      if (responseData?.comments) {
        const newComments = responseData.comments;
        
        if (append) {
          setComments(prev => [...prev, ...newComments]);
        } else {
          setComments(newComments);
        }
        
        setHasMore(responseData.pagination?.hasMore || false);
        setTotalCount(responseData.pagination?.total || newComments.length);
        
        // 初始化已点赞集合
        const liked = new Set();
        newComments.forEach(c => {
          if (c.isLiked) liked.add(c.id);
          c.replies?.items?.forEach(r => {
            if (r.isLiked) liked.add(r.id);
          });
        });
        setLikedComments(liked);
      } else {
        if (!append) setComments([]);
      }
    } catch (err) {
      console.error('获取评论失败:', err);
      // 认证错误静默处理，不显示错误提示
      if (!err.isAuthError) {
        setError('获取评论失败，请稍后重试');
      }
      if (!append) setComments([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [diaryId, sortBy]);

  useEffect(() => {
    fetchComments(1, false);
  }, [fetchComments]);

  // ========== 无限滚动 ==========
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  }, [page, hasMore, loadingMore, fetchComments]);

  // ========== 草稿自动保存 ==========
  const loadDraft = useCallback(() => {
    if (!isAuthenticated || !diaryId) return;
    
    try {
      const key = `${DRAFT_STORAGE_KEY}${diaryId}`;
      const draft = localStorage.getItem(key);
      if (draft) {
        const { content: savedContent, timestamp, replyTo: savedReplyTo } = JSON.parse(draft);
        // 检查是否过期
        if (Date.now() - timestamp < DRAFT_EXPIRY && savedContent?.trim()) {
          setContent(savedContent);
          if (savedReplyTo) {
            // 尝试恢复回复对象
            const parentComment = comments.find(c => c.id === savedReplyTo.id);
            if (parentComment) {
              setReplyTo(parentComment);
            }
          }
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('加载草稿失败:', e);
    }
  }, [diaryId, isAuthenticated, comments]);

  const saveDraft = useCallback(() => {
    if (!isAuthenticated || !diaryId) return;
    
    try {
      const key = `${DRAFT_STORAGE_KEY}${diaryId}`;
      if (content.trim() || replyTo) {
        localStorage.setItem(key, JSON.stringify({
          content,
          timestamp: Date.now(),
          replyTo: replyTo ? { id: replyTo.id, user: { username: replyTo.user?.username } } : null
        }));
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('保存草稿失败:', e);
    }
  }, [content, replyTo, diaryId, isAuthenticated]);

  // 加载草稿
  useEffect(() => {
    if (!loading && comments.length > 0) {
      loadDraft();
    }
  }, [loading, comments.length, loadDraft]);

  // 自动保存草稿（防抖）
  useEffect(() => {
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }
    draftSaveTimerRef.current = setTimeout(saveDraft, 1000);
    
    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, [content, replyTo, saveDraft]);

  // ========== 评论提交 ==========
  const handleSubmit = useCallback(async () => {
    if (!content.trim()) {
      setError('请输入评论内容');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // 使用 FormData 支持图片上传
      const formData = new FormData();
      formData.append('diaryId', diaryId);
      formData.append('content', content.trim());
      if (replyTo?.id) {
        formData.append('parentId', replyTo.id);
      }
      
      // 添加待上传的图片（只支持一张）
      if (pendingImages.length > 0) {
        formData.append('image', pendingImages[0].file);
      }

      const response = await api.post('/comments', formData);
      const responseData = response.data?.data || response.data;
      
      setContent('');
      setReplyTo(null);
      setShowReplyPreview(false);
      setPendingImages([]);
      localStorage.removeItem(`${DRAFT_STORAGE_KEY}${diaryId}`);
      
      // 根据审核状态显示不同提示
      if (responseData?.pending) {
        // 需要管理员审核
        toast.warning('评论已提交，等待管理员审核通过后显示');
      } else {
        // AI审核通过
        toast.success('评论发布成功！');
        
        // 重新获取评论列表
        await fetchComments(1, false);
        setPage(1);
        
        // 平滑滚动到新评论
        setTimeout(() => {
          if (commentsListRef.current) {
            const newComment = commentsListRef.current.querySelector('.comment-item:first-child');
            if (newComment) {
              newComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
              newComment.classList.add('highlight-new');
              setTimeout(() => newComment.classList.remove('highlight-new'), 2000);
            }
          }
        }, 100);
      }
      
    } catch (err) {
      console.error('发表评论失败:', err);
      setError(err.response?.data?.message || '发表评论失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [content, diaryId, replyTo, fetchComments, pendingImages]);

  // ========== 点赞功能（乐观更新） ==========
  const handleLike = useCallback(async (commentId) => {
    // 防止重复点击
    if (likingInProgress.has(commentId)) return;
    
    const isLiked = likedComments.has(commentId);
    
    // 乐观更新UI
    setLikingInProgress(prev => new Set(prev).add(commentId));
    setLikedComments(prev => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
    
    // 更新评论列表中的点赞数
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, likeCount: (c.likeCount || 0) + (isLiked ? -1 : 1), isLiked: !isLiked };
      }
      // 更新回复中的点赞
      if (c.replies?.items) {
        return {
          ...c,
          replies: {
            ...c.replies,
            items: c.replies.items.map(r => 
              r.id === commentId 
                ? { ...r, likeCount: (r.likeCount || 0) + (isLiked ? -1 : 1), isLiked: !isLiked }
                : r
            )
          }
        };
      }
      return c;
    }));

    try {
      const response = await api.post(`/comments/${commentId}/like`);
      
      // 如果服务器返回了准确的点赞数，更新它
      const responseData = response.data?.data || response.data;
      if (responseData?.likeCount !== undefined) {
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return { ...c, likeCount: responseData.likeCount };
          }
          if (c.replies?.items) {
            return {
              ...c,
              replies: {
                ...c.replies,
                items: c.replies.items.map(r => 
                  r.id === commentId ? { ...r, likeCount: responseData.likeCount } : r
                )
              }
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error('点赞失败:', err);
      // 回滚乐观更新
      setLikedComments(prev => {
        const next = new Set(prev);
        if (isLiked) {
          next.add(commentId);
        } else {
          next.delete(commentId);
        }
        return next;
      });
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, likeCount: (c.likeCount || 0) + (isLiked ? 1 : -1), isLiked: isLiked };
        }
        if (c.replies?.items) {
          return {
            ...c,
            replies: {
              ...c.replies,
              items: c.replies.items.map(r => 
                r.id === commentId 
                  ? { ...r, likeCount: (r.likeCount || 0) + (isLiked ? 1 : -1), isLiked: isLiked }
                  : r
              )
            }
          };
        }
        return c;
      }));
      setError('操作失败，请重试');
    } finally {
      setLikingInProgress(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }, [likedComments, likingInProgress]);

  // ========== 删除评论 ==========
  const handleDelete = useCallback(async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) return;

    try {
      await api.delete(`/comments/${commentId}`);
      
      // 乐观删除
      setComments(prev => {
        const newComments = [];
        prev.forEach(c => {
          if (c.id === commentId) return; // 跳过被删除的评论
          
          // 检查回复中是否有被删除的
          if (c.replies?.items) {
            c.replies.items = c.replies.items.filter(r => r.id !== commentId);
            c.replies.total = c.replies.items.length;
          }
          newComments.push(c);
        });
        return newComments;
      });
      
      setTotalCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('删除评论失败:', err);
      setError('删除失败，请重试');
      // 失败后重新获取
      fetchComments(1, false);
    }
  }, [fetchComments]);

  // ========== 图片选择（只预览，提交时一起上传） ==========
  const handleImageUpload = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // 只取第一张图片
    const file = files[0];
    
    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      setError('请选择有效的图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
      return;
    }

    // 创建预览URL
    const previewUrl = URL.createObjectURL(file);
    setPendingImages([{ file, previewUrl, name: file.name }]);
    
    // 清空input以便可以重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 移除待上传的图片
  const handleRemovePendingImage = useCallback(() => {
    setPendingImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
  }, []);

  // ========== 回复功能 ==========
  const handleReplyClick = useCallback((comment) => {
    setReplyTo(comment);
    setShowReplyPreview(true);
    
    // 滚动到输入框
    setTimeout(() => {
      inputAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      textareaRef.current?.focus();
    }, 100);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
    setShowReplyPreview(false);
  }, []);

  // ========== 工具函数 ==========
  const formatTime = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return '刚刚';
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}天前`;
    }
    if (diff < 31536000000) {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
    
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  // 增强的Markdown渲染（带XSS防护）
  const renderContent = useCallback((content) => {
    if (!content) return { __html: '' };
    
    let html = content
      // 代码块 (```code```)
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      // 行内代码 (`code`)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // 图片
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="comment-image" loading="lazy" />')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="comment-link">$1</a>')
      // 自动识别URL
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="comment-link">$1</a>')
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 删除线
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // 引用
      .replace(/^>(.*$)/gm, '<blockquote class="comment-quote">$1</blockquote>')
      // 换行
      .replace(/\n/g, '<br />');
    
    // 使用DOMPurify净化HTML，防止XSS攻击
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['a', 'b', 'strong', 'i', 'em', 'del', 'code', 'pre', 'blockquote', 'br', 'img'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'loading'],
      ALLOW_DATA_ATTR: false,
    });
    
    return { __html: sanitizedHtml };
  }, []);

  // 处理排序切换
  const handleSortChange = useCallback((newSort) => {
    if (newSort === sortBy) return;
    setSortBy(newSort);
    setPage(1);
    setComments([]);
    fetchComments(1, false);
  }, [sortBy, fetchComments]);

  // 重试加载
  const handleRetry = useCallback(() => {
    setError('');
    fetchComments(1, false);
  }, [fetchComments]);

  // ========== 子组件：评论项 ==========
  const CommentItem = memo(({ comment, isReply = false, depth = 0 }) => {
    const isLiked = likedComments.has(comment.id);
    const isLiking = likingInProgress.has(comment.id);
    const maxDepth = 3; // 最大嵌套层级
    const repliesItems = comment.replies?.items || [];

    return (
      <div 
        className={`comment-item ${isReply ? 'comment-reply' : ''} ${isLiked ? 'just-liked' : ''}`}
        style={{ marginLeft: isReply ? Math.min(depth, maxDepth) * 20 : 0 }}
      >
        <div 
          className="comment-avatar"
          onClick={() => comment.user?.username && navigate(`/profile/${comment.user.username}`)}
          style={{ cursor: comment.user?.username ? 'pointer' : 'default' }}
          title={comment.user?.username ? `查看 ${comment.user?.username} 的主页` : undefined}
        >
          <img 
            src={comment.user?.avatarUrl || `https://gravatar.com/avatar/${comment.user?.id}?d=mp`}
            alt={comment.user?.username}
            className="avatar-img"
            loading="lazy"
          />
        </div>
        
        <div className="comment-content-wrapper">
          <div className="comment-header">
            <span className="comment-author">
              {comment.user?.username || '匿名用户'}
            </span>
            {comment.user?.role === 'admin' && (
              <span className="comment-badge admin">管理员</span>
            )}
            <span className="comment-time">{formatTime(comment.createdAt)}</span>
          </div>
          
          <div 
            className="comment-text"
            dangerouslySetInnerHTML={renderContent(comment.content)}
          />
          
          {/* 评论图片 */}
          {comment.images && comment.images.length > 0 && (
            <div className="comment-images">
              {comment.images.map((img, idx) => (
                <img 
                  key={idx}
                  src={getImageUrl(img)}
                  alt="评论图片"
                  className="comment-uploaded-image"
                  loading="lazy"
                />
              ))}
            </div>
          )}
          
          <div className="comment-actions">
            <button 
              className={`action-btn like ${isLiked ? 'liked just-liked' : ''}`}
              onClick={() => handleLike(comment.id)}
              disabled={isLiking || !isAuthenticated}
              title={isLiked ? '取消点赞' : '点赞'}
            >
              <Heart 
                size={14} 
                fill={isLiked ? 'currentColor' : 'none'}
              />
              <span>{comment.likeCount || 0}</span>
            </button>
            
            {!isReply || depth < maxDepth ? (
              <button 
                className="action-btn reply"
                onClick={() => handleReplyClick(comment)}
                disabled={!isAuthenticated}
              >
                <MessageSquare size={14} />
                <span>回复</span>
              </button>
            ) : null}
            
            {(isAuthenticated && (user?.id === comment.userId || user?.role === 'admin')) ? (
              <button 
                className="action-btn delete"
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            ) : null}
          </div>

          {/* 嵌套回复列表 */}
          {repliesItems.length > 0 && (
            <div className="replies-list">
              {repliesItems.map(reply => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  isReply={true}
                  depth={depth + 1}
                />
              ))}
              
              {/* 显示加载更多回复按钮 */}
              {comment.replies?.hasMore && (
                <button 
                  className="load-more-replies-btn"
                  onClick={() => {
                    // 可以实现加载更多回复的功能
                    console.log('Load more replies for comment:', comment.id);
                  }}
                >
                  <ChevronDown size={14} />
                  <span>还有 {comment.replies.total - repliesItems.length} 条回复</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  });

  CommentItem.displayName = 'CommentItem';

  // ========== 渲染 ==========
  if (loading && comments.length === 0) {
    return (
      <div className="comment-section">
        <div className="comment-header-bar">
          <MessageCircle size={20} />
          <h3>评论</h3>
        </div>
        <div className="comment-loading">
          <LoadingSpinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="comment-section" ref={commentsListRef}>
      {/* 头部 */}
      <div className="comment-header-bar">
        <MessageCircle size={20} />
        <h3>评论</h3>
        <span className="comment-count">{totalCount || commentCount} 条</span>
        
        {/* 排序选项 */}
        <div className="sort-options">
          <button 
            className={`sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => handleSortChange('newest')}
            title="最新评论"
          >
            <Clock size={14} />
            <span>最新</span>
          </button>
          <button 
            className={`sort-btn ${sortBy === 'hottest' ? 'active' : ''}`}
            onClick={() => handleSortChange('hottest')}
            title="最热评论"
          >
            <ThumbsUp size={14} />
            <span>最热</span>
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="comment-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="retry-btn" onClick={handleRetry}>
            <RefreshCw size={14} />
            重试
          </button>
        </div>
      )}

      {/* 评论输入框 */}
      <div className="comment-input-area" ref={inputAreaRef}>
        {/* 回复预览 */}
        {replyTo && showReplyPreview && (
          <div className="reply-preview">
            <div className="reply-preview-header">
              <CornerDownRight size={16} />
              <span>回复 {replyTo.user?.username}</span>
            </div>
            <div 
              className="reply-preview-content"
              dangerouslySetInnerHTML={renderContent(replyTo.content?.substring(0, 100) + (replyTo.content?.length > 100 ? '...' : ''))}
            />
            <button onClick={handleCancelReply} className="cancel-reply">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="input-header">
          {isAuthenticated && user ? (
            <div className="user-info">
              <img 
                src={user.avatarUrl || `https://gravatar.com/avatar/${user.id}?d=mp`}
                alt={user.username}
                className="user-avatar"
              />
              <span className="user-name">{user.username}</span>
            </div>
          ) : (
            <div className="guest-notice">
              <span>请登录后发表评论</span>
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          placeholder={replyTo ? `回复 ${replyTo.user?.username}...` : '写下你的评论...支持 Markdown 语法'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="comment-textarea"
          rows={4}
          disabled={!isAuthenticated}
          maxLength={2000}
        />
        
        <div className="textarea-footer">
          <span className="char-count">{content.length}/2000</span>
        </div>

        {/* 待上传的图片预览 */}
        {pendingImages.length > 0 && (
          <div className="pending-images">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="pending-image-item">
                <img src={img.previewUrl} alt={img.name} className="pending-image-preview" />
                <button 
                  className="remove-pending-image"
                  onClick={handleRemovePendingImage}
                  type="button"
                >
                  <X size={14} />
                </button>
                <span className="pending-image-name">{img.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="input-toolbar">
          <div className="toolbar-left">
            <button 
              className="toolbar-btn"
              onClick={() => fileInputRef.current?.click()}
              title="上传图片"
              disabled={!isAuthenticated}
              type="button"
            >
              <ImageIcon size={18} />
            </button>
            <button 
              className="toolbar-btn"
              onClick={() => setContent(prev => prev + '**粗体**')}
              title="粗体"
              disabled={!isAuthenticated}
              type="button"
            >
              <span className="toolbar-icon-text">B</span>
            </button>
            <button 
              className="toolbar-btn"
              onClick={() => setContent(prev => prev + '`代码`')}
              title="行内代码"
              disabled={!isAuthenticated}
              type="button"
            >
              <Code size={18} />
            </button>
            <button 
              className="toolbar-btn"
              onClick={() => setContent(prev => prev + '[链接文本](https://)')}
              title="插入链接"
              disabled={!isAuthenticated}
              type="button"
            >
              <LinkIcon size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              disabled={!isAuthenticated}
            />
          </div>
          
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={submitting || !content.trim() || !isAuthenticated}
            type="button"
          >
            {submitting ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <>
                <Send size={16} />
                <span>发布</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="comments-list">
        {!Array.isArray(sortedComments) || sortedComments.length === 0 ? (
          <div className="empty-comments">
            <MessageCircle size={48} />
            <p>暂无评论，来抢沙发吧！</p>
          </div>
        ) : (
          <>
            {sortedComments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            
            {/* 加载更多 */}
            {hasMore && (
              <div 
                ref={loadMoreRef}
                className="load-more-container"
              >
                {loadingMore ? (
                  <div className="load-more-loading">
                    <Loader2 size={20} className="spin" />
                    <span>加载更多...</span>
                  </div>
                ) : (
                  <button 
                    className="load-more-btn"
                    onClick={loadMore}
                  >
                    <ChevronDown size={16} />
                    <span>加载更多评论</span>
                  </button>
                )}
              </div>
            )}
            
            {/* 没有更多 */}
            {!hasMore && comments.length > 0 && (
              <div className="no-more-comments">
                <span>—— 没有更多评论了 ——</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
