import { useState, useRef } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';

/**
 * 最大标签数量
 */
const MAX_TAGS = 10;

/**
 * 标签输入组件
 * 支持标签的添加、删除和管理
 */
const TagInput = ({ tags = [], onChange, disabled = false, maxTags = MAX_TAGS }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  /**
   * 添加标签
   */
  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    
    // 验证标签
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) {
      alert('该标签已存在');
      return;
    }
    if (tags.length >= maxTags) {
      alert(`最多只能添加${maxTags}个标签`);
      return;
    }
    if (trimmedTag.length > 20) {
      alert('标签长度不能超过20个字符');
      return;
    }

    onChange([...tags, trimmedTag]);
    setInput('');
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addTag(input.trim());
    } else if (e.key === 'Backspace' && !input.trim() && tags.length > 0) {
      // 当输入框为空且按下退格键时，删除最后一个标签
      removeTag(tags[tags.length - 1]);
    }
  };

  /**
   * 移除标签
   */
  const removeTag = (tagToRemove) => {
    if (disabled) return;
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  /**
   * 清空所有标签
   */
  const clearAllTags = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="mb-6">
      {/* 标签列表 */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium transition-all ${
              disabled ? 'opacity-60' : 'hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
            }`}
          >
            <TagIcon size={14} />
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className={`ml-0.5 p-0.5 rounded-full hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-label={`删除标签${tag}`}
              title="删除标签"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {/* 标签数量提示 */}
      {tags.length > 0 && (
        <div className="flex items-center justify-between mb-2 text-xs text-gray-500 dark:text-gray-400">
          <span>已添加 {tags.length}/{maxTags} 个标签</span>
          {!disabled && tags.length > 0 && (
            <button
              type="button"
              onClick={clearAllTags}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              清空全部
            </button>
          )}
        </div>
      )}

      {/* 输入框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length >= maxTags ? `已达到最大标签数 (${maxTags})` : '输入标签后按回车添加'}
          disabled={disabled || tags.length >= maxTags}
          maxLength={20}
          className={`w-full px-4 py-3 rounded-lg border ${
            tags.length >= maxTags
              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          } text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {/* 字符计数 */}
        {input && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
            {input.length}/20
          </div>
        )}
      </div>

      {/* 提示文本 */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        按回车键添加标签，按退格键删除最后一个标签
      </p>
    </div>
  );
};

export default TagInput;