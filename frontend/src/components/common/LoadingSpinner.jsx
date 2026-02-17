/**
 * 加载动画组件
 * 提供多种尺寸和动画效果的加载动画
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'indigo',
  text = null,
  fullScreen = false,
  variant = 'spinner'
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
      indigo: { 
        primary: 'text-indigo-600', 
        bg: 'bg-indigo-100',
        border: 'border-indigo-200', 
        spinner: 'border-t-indigo-600',
        dot: 'bg-indigo-600'
      },
      blue: { 
        primary: 'text-blue-600',
        bg: 'bg-blue-100',
        border: 'border-blue-200', 
        spinner: 'border-t-blue-600',
        dot: 'bg-blue-600'
      },
      green: { 
        primary: 'text-green-600',
        bg: 'bg-green-100',
        border: 'border-green-200', 
        spinner: 'border-t-green-600',
        dot: 'bg-green-600'
      },
      red: { 
        primary: 'text-red-600',
        bg: 'bg-red-100',
        border: 'border-red-200', 
        spinner: 'border-t-red-600',
        dot: 'bg-red-600'
      },
      white: { 
        primary: 'text-white',
        bg: 'bg-white/20',
        border: 'border-white/30', 
        spinner: 'border-t-white',
        dot: 'bg-white'
      },
    };
    return colorMap[color] || colorMap.indigo;
  };

  const colorClasses = getColorClasses();
  const sizeClasses = getSizeClasses();

  /**
   * 渲染点状动画
   */
  const renderDots = () => {
    const dotSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4',
      xl: 'w-5 h-5',
    };
    const dotSize = dotSizes[size] || dotSizes.md;
    
    return (
      <div className="flex items-center gap-1.5" role="status" aria-label="加载中">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dotSize} ${colorClasses.dot} rounded-full animate-bounce`}
            style={{ 
              animationDelay: `${i * 150}ms`,
              animationDuration: '0.8s'
            }}
          />
        ))}
      </div>
    );
  };

  /**
   * 渲染脉冲动画
   */
  const renderPulse = () => {
    return (
      <div className={`relative ${sizeClasses}`} role="status" aria-label="加载中">
        <div className={`absolute inset-0 ${colorClasses.dot} rounded-full animate-ping opacity-30`} />
        <div className={`relative w-full h-full ${colorClasses.dot} rounded-full animate-pulse`} />
      </div>
    );
  };

  /**
   * 渲染圆环动画
   */
  const renderRingSpinner = () => {
    return (
      <div className={`relative ${sizeClasses}`} role="status" aria-label="加载中">
        <div className={`absolute inset-0 rounded-full border-4 ${colorClasses.border} ${colorClasses.spinner} animate-spin`} 
          style={{ animationDuration: '1s' }} 
        />
        <div className="absolute inset-2 bg-white dark:bg-gray-900 rounded-full" />
      </div>
    );
  };

  /**
   * 渲染主内容
   */
  const renderContent = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'ring':
        return renderRingSpinner();
      case 'spinner':
      default:
        return (
          <div
            className={`${sizeClasses} border-4 ${colorClasses.border} ${colorClasses.spinner} rounded-full animate-spin`}
          />
        );
    }
  };

  /**
   * 渲染全屏加载
   */
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-5">
          {renderContent()}
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
      <div className="flex flex-col items-center space-y-3">
        {renderContent()}
        {text && (
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;