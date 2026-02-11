import { CheckCircle, X } from 'lucide-react';

/**
 * 成功消息组件
 * 显示成功信息，支持关闭功能
 */
const SuccessMessage = ({ message, onDismiss, variant = 'default' }) => {
  if (!message) return null;

  /**
   * 获取样式配置
   */
  const getStyles = () => {
    const baseStyles = 'rounded-lg p-4 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2 duration-300';
    
    switch (variant) {
      case 'inline':
        return `${baseStyles} inline-flex items-center`;
      default:
        return baseStyles;
    }
  };

  /**
   * 处理关闭
   */
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div 
      className={`${getStyles()} bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800`}
      role="alert"
      aria-live="polite"
    >
      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-green-800 dark:text-green-200 text-sm font-medium">
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors rounded-full hover:bg-green-100 dark:hover:bg-green-900/30"
          aria-label="关闭成功消息"
          title="关闭"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SuccessMessage;