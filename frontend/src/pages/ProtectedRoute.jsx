import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * 受保护路由组件
 * 保护需要登录才能访问的路由
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - 子组件
 * @param {boolean} props.requireAdmin - 是否需要管理员权限（预留）
 */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">正在验证身份...</p>
        </div>
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (!user || !isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // 需要管理员权限但用户不是管理员（预留功能）
  if (requireAdmin && user.role !== 'admin') {
    return (
      <Navigate 
        to="/" 
        replace 
      />
    );
  }

  // 已登录且有权限，渲染子组件
  return children;
};

export default ProtectedRoute;