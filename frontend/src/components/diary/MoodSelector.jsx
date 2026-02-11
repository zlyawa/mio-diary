/**
 * 心情选项配置
 */
const MOOD_OPTIONS = [
  { value: 'happy', label: '开心', emoji: '😊', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700' },
  { value: 'excited', label: '兴奋', emoji: '🎉', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700' },
  { value: 'grateful', label: '感恩', emoji: '🙏', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
  { value: 'calm', label: '平静', emoji: '😌', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
  { value: 'neutral', label: '一般', emoji: '😐', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600' },
  { value: 'sad', label: '难过', emoji: '😢', color: 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700' },
  { value: 'anxious', label: '焦虑', emoji: '😰', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700' },
  { value: 'angry', label: '生气', emoji: '😠', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700' },
  { value: 'tired', label: '疲惫', emoji: '😴', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700' },
];

/**
 * 心情选择器组件
 * 提供心情选择功能，支持多种心情选项
 */
const MoodSelector = ({ selected, onSelect, disabled = false }) => {
  /**
   * 获取选中心情的配置
   */
  const getSelectedMoodConfig = () => {
    return MOOD_OPTIONS.find(mood => mood.value === selected);
  };

  /**
   * 渲染心情按钮
   */
  const renderMoodButton = (mood) => {
    const isSelected = selected === mood.value;
    
    return (
      <button
        key={mood.value}
        type="button"
        onClick={() => !disabled && onSelect(mood.value)}
        disabled={disabled}
        className={`p-3 rounded-lg border-2 transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : isSelected
            ? `${mood.color} border-current scale-105 shadow-md`
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 hover:scale-102'
        }`}
        title={mood.label}
        aria-pressed={isSelected}
        aria-label={`选择${mood.label}心情`}
      >
        <div className="text-2xl mb-1">{mood.emoji}</div>
        <div className="text-xs font-medium">
          {mood.label}
        </div>
      </button>
    );
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        今日心情
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {MOOD_OPTIONS.map(renderMoodButton)}
      </div>
      
      {/* 已选择提示 */}
      {selected && !disabled && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          已选择: {getSelectedMoodConfig()?.emoji} {getSelectedMoodConfig()?.label}
        </div>
      )}
    </div>
  );
};

export default MoodSelector;