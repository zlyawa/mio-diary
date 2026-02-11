import { AlertCircle, X } from 'lucide-react';

/**
 * 错误消息组件
 * 显示错误信息，支持关闭功能
 */
const ErrorMessage = ({ message, onDismiss, variant = 'default' }) => {
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
      className={`${getStyles()} bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-800 dark:text-red-200 text-sm font-medium">
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
          aria-label="关闭错误消息"
          title="关闭"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;