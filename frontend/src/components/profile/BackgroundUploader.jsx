import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';

const BackgroundUploader = ({ currentBackground, onSuccess }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('只支持 JPG, PNG, GIF, WebP 格式');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过 5MB');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files[0]) {
      setError('请选择图片');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('background', fileInputRef.current.files[0]);

      await api.post('/profile/background', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setError(error.response?.data?.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('确定要删除背景图吗？')) return;

    try {
      setError('');
      await api.delete('/profile/background');
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || '删除失败');
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          当前背景图
        </h3>
        {currentBackground ? (
          <div className="relative">
            <div className="h-40 rounded-lg overflow-hidden">
              <img
                src={getImageUrl(currentBackground)}
                alt="当前背景图"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="删除背景图"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="h-40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
            <div className="text-center">
              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                暂无背景图
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          上传新背景图
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {preview && (
          <div className="mb-4">
            <div className="h-32 rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="预览"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
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

          {preview && (
            <>
              <button
                onClick={handleUpload}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? '上传中...' : '确认上传'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          建议尺寸：1920×1080，支持 JPG、PNG、GIF、WebP 格式，最大 5MB
        </p>
      </div>
    </div>
  );
};

export default BackgroundUploader;