import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../utils/api';

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
 * 允许的图片类型
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * 最大文件大小（5MB）
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * 图片上传组件
 * 支持点击上传、拖拽上传、图片预览和删除
 */
const ImageUploader = ({ images = [], onChange, disabled = false, maxImages = 10 }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  /**
   * 验证文件
   */
  const validateFile = (file) => {
    // 检查文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('不支持的文件类型，请上传 JPEG、PNG、GIF 或 WebP 格式的图片');
      return false;
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      setError('图片大小不能超过 5MB');
      return false;
    }

    // 检查图片数量
    if (images.length >= maxImages) {
      setError(`最多只能上传 ${maxImages} 张图片`);
      return false;
    }

    return true;
  };

  /**
   * 上传图片
   */
  const uploadImage = async (file) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      // API 响应格式: { message: "...", data: { imageUrl: "..." } }
      const imageUrl = response.data?.data?.imageUrl;
      if (!imageUrl) {
        throw new Error('上传响应中缺少图片 URL');
      }

      onChange([...images, imageUrl]);
      setError('');
    } catch (err) {
      console.error('上传失败:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || '图片上传失败，请重试';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadImage(file);
    
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
  };

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
  };

  /**
   * 处理拖拽释放
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;

    const file = e.dataTransfer.files[0];
    if (!file) return;

    uploadImage(file);
  };

  /**
   * 移除图片
   */
  const removeImage = (imageToRemove) => {
    onChange(images.filter((img) => img !== imageToRemove));
  };

  /**
   * 触发文件选择
   */
  const triggerFileSelect = () => {
    if (fileInputRef.current && !disabled && !isUploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="mb-6">
      {/* 错误提示 */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 上传区域 */}
      <div
        onClick={triggerFileSelect}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          disabled
            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-gray-800'
        } ${isUploading ? 'border-indigo-500 dark:border-indigo-400' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              上传中... {uploadProgress}%
            </p>
            <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center ${
              disabled
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'bg-indigo-100 dark:bg-indigo-900'
            }`}>
              <Upload className={`w-6 h-6 ${
                disabled
                  ? 'text-gray-400'
                  : 'text-indigo-600 dark:text-indigo-400'
              }`} />
            </div>
            <p className={`text-sm font-medium mb-1 ${
              disabled
                ? 'text-gray-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {disabled ? '上传已禁用' : '点击或拖拽图片到此处上传'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              支持 JPEG、PNG、GIF、WebP（最大5MB）
            </p>
          </div>
        )}
      </div>

      {/* 图片预览 */}
      {images.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              已上传 {images.length}/{maxImages} 张图片
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={`${UPLOAD_BASE_URL}${image}`}
                  alt={`上传的图片 ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={() => removeImage(image)}
                  disabled={disabled}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  title="删除图片"
                >
                  <X size={14} />
                </button>
                {/* 图片序号 */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;