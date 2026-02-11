import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import Header from '../components/layout/Header';
import QuillEditor from '../components/diary/QuillEditor';
import MoodSelector from '../components/diary/MoodSelector';
import TagInput from '../components/diary/TagInput';
import ImageUploader from '../components/diary/ImageUploader';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * 自动保存间隔（毫秒）
 */
const AUTOSAVE_INTERVAL = 30000; // 30秒

/**
 * 草稿存储键名
 */
const DRAFT_STORAGE_KEY = 'diary_draft';

/**
 * 判断富文本内容是否为空（使用 DOM 解析方式）
 * 这个函数可以正确识别各种形式的空内容：
 * - 空字符串
 * - 只包含空白字符
 * - 只包含空段落 <p><br></p>
 * - 只包含空标签 <p></p>
 * - 只有HTML标签没有实际文本内容
 */
const isContentEmpty = (html) => {
  if (!html) return true;
  
  // 创建一个临时的 DOM 元素来解析 HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 获取纯文本内容（去除所有 HTML 标签）
  const text = tempDiv.textContent || tempDiv.innerText || '';
  
  // 检查纯文本是否为空或只包含空白字符
  return !text || text.trim().length === 0;
};

/**
 * 日记表单页面组件
 * 提供创建和编辑日记的功能，支持自动保存和草稿恢复
 */
const DiaryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [tags, setTags] = useState([]);
  const [images, setImages] = useState([]);
  
  const autoSaveTimerRef = useRef(null);
  const saveStatusTimeoutRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      title: '',
    },
  });

  const watchedTitle = watch('title');

  /**
   * 加载日记详情（编辑模式）
   */
  const fetchDiary = useCallback(async () => {
    setIsFetching(true);
    setError('');
    try {
      const response = await api.get(`/diaries/${id}`);
      const diary = response.data.diary;
      
      setContent(diary.content || '');
      setMood(diary.mood || 'neutral');
      setTags(Array.isArray(diary.tags) ? diary.tags : []);
      setImages(Array.isArray(diary.images) ? diary.images : []);
      
      reset({
        title: diary.title || '',
      });
    } catch (err) {
      console.error('获取日记失败:', err);
      setError(err.response?.data?.error || err.response?.data?.message || '获取日记失败');
    } finally {
      setIsFetching(false);
    }
  }, [id, reset]);

  /**
   * 加载草稿（新建模式）
   */
  const loadDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        const draftData = JSON.parse(draft);
        setContent(draftData.content || '');
        setMood(draftData.mood || 'neutral');
        setTags(draftData.tags || []);
        setImages(draftData.images || []);
        reset({
          title: draftData.title || '',
        });
        setHasUnsavedChanges(true);
      }
    } catch (err) {
      console.error('加载草稿失败:', err);
    }
  }, [reset]);

  /**
   * 保存草稿
   */
  const saveDraft = useCallback(() => {
    try {
      const draftData = {
        title: watchedTitle,
        content,
        mood,
        tags,
        images,
        timestamp: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      setLastSavedTime(new Date());
    } catch (err) {
      console.error('保存草稿失败:', err);
    }
  }, [watchedTitle, content, mood, tags, images]);

  /**
   * 清除草稿
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err) {
      console.error('清除草稿失败:', err);
    }
  }, []);

  /**
   * 自动保存
   */
  const autoSave = useCallback(() => {
    if (!isEditing && (watchedTitle || content || tags.length > 0 || images.length > 0)) {
      setIsAutoSaving(true);
      saveDraft();
      
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
      
      saveStatusTimeoutRef.current = setTimeout(() => {
        setIsAutoSaving(false);
      }, 2000);
    }
  }, [isEditing, watchedTitle, content, tags, images, saveDraft]);

  /**
   * 提交表单
   */
  const onSubmit = async (data) => {
    setError('');
    setIsLoading(true);

    try {
      // 验证标题
      if (!data.title || data.title.trim() === '') {
        setError('标题不能为空');
        setIsLoading(false);
        return;
      }

      // 验证内容 - 使用可靠的 DOM 解析判断空内容
      if (isContentEmpty(content)) {
        setError('内容不能为空，请输入一些文本');
        setIsLoading(false);
        return;
      }

      // 打印提交的数据用于调试
      console.log('Submitting diary:', {
        title: data.title,
        content: content,
        contentLength: content?.length,
        mood,
        tags,
        images,
      });

      const diaryData = {
        title: data.title.trim(),
        content: content, // 直接使用原始 HTML，不做任何处理
        mood,
        tags,
        images,
      };

      if (isEditing) {
        await api.put(`/diaries/${id}`, diaryData);
      } else {
        await api.post('/diaries', diaryData);
        clearDraft();
      }

      navigate(isEditing ? `/diaries/${id}` : '/diaries');
    } catch (err) {
      console.error('保存日记失败:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || '保存失败，请重试';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 检查未保存更改
   */
  const checkUnsavedChanges = useCallback(() => {
    if (!isEditing && isDirty) {
      return true;
    }
    return false;
  }, [isEditing, isDirty]);

  /**
   * 处理返回
   */
  const handleBack = () => {
    if (checkUnsavedChanges()) {
      if (window.confirm('你有未保存的更改，确定要离开吗？')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  /**
   * 初始化
   */
  useEffect(() => {
    if (isEditing) {
      fetchDiary();
    } else {
      loadDraft();
    }
  }, [isEditing, fetchDiary, loadDraft]);

  /**
   * 自动保存定时器
   */
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      autoSave();
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, [autoSave]);

  /**
   * 监听内容变化
   */
  useEffect(() => {
    setHasUnsavedChanges(isDirty || content.length > 0 || tags.length > 0 || images.length > 0);
  }, [isDirty, content, tags, images]);

  /**
   * 获取字符计数
   */
  const getCharacterCount = () => {
    if (!content) return 0;
    // 去除HTML标签，获取纯文本
    const text = content.replace(/<[^>]*>/g, '');
    return text.length;
  };

  /**
   * 获取字数统计
   */
  const getWordCount = () => {
    if (!content) return 0;
    // 去除HTML标签，获取纯文本
    const text = content.replace(/<[^>]*>/g, '');
    if (!text.trim()) return 0;
    // 按空白字符分割，过滤空字符串
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              返回
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {isEditing ? '编辑日记' : '写新日记'}
            </h1>
          </div>
          
          {/* 自动保存状态 */}
          {!isEditing && lastSavedTime && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock size={16} />
              <span>
                {isAutoSaving ? '自动保存中...' : `上次保存: ${lastSavedTime.toLocaleTimeString()}`}
              </span>
            </div>
          )}
        </div>

        {/* 表单卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
          {/* 错误提示 */}
          <ErrorMessage message={error} />

          {/* 未保存更改提示 */}
          {hasUnsavedChanges && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                你有未保存的更改。系统会每30秒自动保存草稿。
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* 标题 */}
            <div className="mb-6">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                {...register('title', { 
                  required: '请输入标题',
                  minLength: {
                    value: 1,
                    message: '标题不能为空'
                  },
                  maxLength: {
                    value: 200,
                    message: '标题最多200个字符'
                  }
                })}
                disabled={isLoading || isFetching}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="给你的日记起个标题"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* 富文本编辑器 */}
            <div className="mb-6">
              <QuillEditor
                value={content}
                onChange={setContent}
                placeholder="开始写下你的故事..."
                disabled={isLoading || isFetching}
                label="内容"
                required={true}
              />
              {/* 字符统计 */}
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{getWordCount()} 字</span>
                <span>{getCharacterCount()} 字符</span>
              </div>
            </div>

            {/* 心情选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                心情
              </label>
              <MoodSelector 
                selected={mood} 
                onSelect={setMood}
                disabled={isLoading || isFetching}
              />
            </div>

            {/* 标签输入 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                标签 <span className="text-gray-400">(可选，最多10个)</span>
              </label>
              <TagInput 
                tags={tags} 
                onChange={setTags}
                disabled={isLoading || isFetching}
              />
            </div>

            {/* 图片上传 */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                图片 <span className="text-gray-400">(可选，最多10张)</span>
              </label>
              <ImageUploader 
                images={images} 
                onChange={setImages}
                disabled={isLoading || isFetching}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading || isFetching}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading || isFetching ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>{isEditing ? '更新中...' : '保存中...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>{isEditing ? '更新日记' : '保存日记'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading || isFetching}
                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DiaryForm;