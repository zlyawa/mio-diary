/**
 * 加载动画组件
 * 提供多种尺寸的加载动画
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'indigo',
  text = null,
  fullScreen = false 
}) => {
  /**
   * 获取尺寸类名
   */
  const getSizeClasses = () => {
    const sizeMap = {
      xs: 'w-4 h-4',
      sm: 'w-5 h-5',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    };
    return sizeMap[size] || sizeMap.md;
  };

  /**
   * 获取颜色类名
   */
  const getColorClasses = () => {
    const colorMap = {
      indigo: { border: 'border-indigo-200', spinner: 'border-t-indigo-600' },
      blue: { border: 'border-blue-200', spinner: 'border-t-blue-600' },
      green: { border: 'border-green-200', spinner: 'border-t-green-600' },
      red: { border: 'border-red-200', spinner: 'border-t-red-600' },
      white: { border: 'border-white/30', spinner: 'border-t-white' },
    };
    return colorMap[color] || colorMap.indigo;
  };

  const colorClasses = getColorClasses();
  const sizeClasses = getSizeClasses();

  /**
   * 渲染全屏加载
   */
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4">
          <div
            className={`${sizeClasses} border-4 ${colorClasses.border} ${colorClasses.spinner} rounded-full animate-spin`}
            role="status"
            aria-label="加载中"
          />
          {text && (
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  /**
   * 渲染普通加载
   */
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center space-y-2">
        <div
          className={`${sizeClasses} border-4 ${colorClasses.border} ${colorClasses.spinner} rounded-full animate-spin`}
          role="status"
          aria-label="加载中"
        />
        {text && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;