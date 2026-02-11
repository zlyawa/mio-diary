/**
 * 骨架屏组件
 * 用于内容加载时的占位符
 */
const Skeleton = ({ 
  className = '', 
  variant = 'default',
  width,
  height,
  ...props 
}) => {
  /**
   * 获取样式配置
   */
  const getStyles = () => {
    const baseStyles = 'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700';
    
    switch (variant) {
      case 'text':
        return `${baseStyles} h-4 w-full`;
      case 'circular':
        return `${baseStyles} rounded-full`;
      case 'rectangular':
        return `${baseStyles}`;
      default:
        return baseStyles;
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles} ${className}`}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
      role="status"
      aria-label="加载中"
      {...props}
    />
  );
};

export default Skeleton;