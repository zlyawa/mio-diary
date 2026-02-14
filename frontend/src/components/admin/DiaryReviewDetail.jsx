import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'react-quill/dist/quill.bubble.css';
import api from '../../utils/api';
import { getImageUrl } from '../../utils/api';

const DiaryReviewDetail = ({ diary, onClose, onApprove, onReject }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(diary.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('请填写拒绝原因');
      return;
    }
    setLoading(true);
    try {
      await onReject(diary.id, rejectReason);
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取心情标签
  const getMoodLabel = (mood) => {
    const moodMap = {
      happy: '😊 开心',
      sad: '😢 难过',
      excited: '🤩 兴奋',
      calm: '😌 平静',
      anxious: '😰 焦虑',
      angry: '😠 生气',
      neutral: '😐 一般',
    };
    return moodMap[mood] || mood;
  };

  // 解析标签
  const parseTags = (tagsString) => {
    try {
      return JSON.parse(tagsString);
    } catch {
      return tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              日记审核
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              审核日记内容并决定是否通过
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 日记信息 */}
          <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {diary.title}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <img
                  src={diary.user?.avatarUrl ? getImageUrl(diary.user.avatarUrl) : '/default-avatar.png'}
                  alt={diary.user?.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span>{diary.user?.username}</span>
              </div>
              <span>•</span>
              <span>{formatDate(diary.createdAt)}</span>
              <span>•</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                {getMoodLabel(diary.mood)}
              </span>
            </div>
            {diary.tags && parseTags(diary.tags).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {parseTags(diary.tags).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 富文本内容 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[300px] bg-white dark:bg-gray-900">
            <ReactQuill
              value={diary.content}
              readOnly={true}
              theme="bubble"
              modules={{
                toolbar: false,
              }}
            />
          </div>

          {/* 拒绝原因输入 */}
          {showRejectForm && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                拒绝原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请说明拒绝原因，这将通知给用户..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          {!showRejectForm ? (
            <div className="flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
              >
                取消
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  拒绝
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '处理中...' : '通过'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
              >
                返回
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '处理中...' : '确认拒绝'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiaryReviewDetail;