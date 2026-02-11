import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, X, Check } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';

const AvatarUploader = ({ currentAvatar, onSuccess }) => {
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: 'px',
    width: 200,
    aspect: 1,
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('只支持 JPG, PNG, GIF, WebP 格式');
      return;
    }

    if (file.size > 500 * 1024) {
      setError('文件大小不能超过 500KB');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (crop) => {
    setCompletedCrop(crop);
  };

  const generateCroppedPreview = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    const sourceX = completedCrop.x * scaleX;
    const sourceY = completedCrop.y * scaleY;
    const sourceWidth = completedCrop.width * scaleX;
    const sourceHeight = completedCrop.height * scaleY;

    // 设置预览画布尺寸
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // 绘制圆形路径
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 绘制裁剪后的图片
    ctx.drawImage(
      imgRef.current,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      200,
      200
    );

    // 转换为 Blob URL
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        resolve(URL.createObjectURL(blob));
      }, 'image/webp', 0.9);
    });
  };

  // 当裁剪区域变化时更新预览
  React.useEffect(() => {
    if (completedCrop) {
      generateCroppedPreview().then(setPreviewUrl);
    }
  }, [completedCrop]);

  const getCroppedImg = () => {
    if (!imgRef.current || !completedCrop) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    // 计算裁剪区域在原始图片上的坐标（考虑边界情况）
    let sourceX = Math.floor(completedCrop.x * scaleX);
    let sourceY = Math.floor(completedCrop.y * scaleY);
    let sourceWidth = Math.floor(completedCrop.width * scaleX);
    let sourceHeight = Math.floor(completedCrop.height * scaleY);

    // 确保裁剪区域不超出原始图片边界
    sourceX = Math.max(0, sourceX);
    sourceY = Math.max(0, sourceY);
    sourceWidth = Math.min(sourceWidth, imgRef.current.naturalWidth - sourceX);
    sourceHeight = Math.min(sourceHeight, imgRef.current.naturalHeight - sourceY);

    // 输出固定尺寸 200x200
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // 设置高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 绘制裁剪后的图片
    ctx.drawImage(
      imgRef.current,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      200,
      200
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/webp', 0.95); // 提高质量
    });
  };

  const handleUpload = async () => {
    if (!completedCrop) {
      setError('请先裁剪图片');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const blob = await getCroppedImg();
      if (!blob) return;

      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.webp');

      await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
      setImage(null);
      setPreviewUrl(null);
      setCompletedCrop(null);
    } catch (error) {
      setError(error.response?.data?.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImage(null);
    setPreviewUrl(null);
    setCompletedCrop(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 清理 previewUrl
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
          {currentAvatar ? (
            <img
              src={getImageUrl(currentAvatar)}
              alt="当前头像"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            选择图片
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            支持 JPG, PNG, GIF, WebP 格式，最大 500KB
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {image && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">
            请调整头像裁剪区域
          </h3>
          
          <div className="max-w-md mx-auto">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={handleCropComplete}
              aspect={1}
              circularCrop
            >
              <img
                ref={imgRef}
                src={image}
                alt="裁剪预览"
                className="max-w-full"
              />
            </ReactCrop>
          </div>

          {completedCrop && (
            <div className="flex flex-col items-center space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                预览
              </h4>
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-md">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="裁剪预览"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleUpload}
              disabled={loading || !completedCrop}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                '上传中...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  确认上传
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarUploader;