import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getImageUrl } from '../../utils/api';
import { Moon, Sun, LogOut, User, BookOpen, Menu, X, Home, LayoutDashboard, Sparkles, Settings, PenTool } from 'lucide-react';

/**
 * 导航菜单项配置
 */
const NAV_ITEMS = [
  { path: '/features', label: '首页', icon: Home },
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/diaries', label: '日记列表', icon: BookOpen },
  { path: '/diaries/new', label: '写日记', icon: PenTool },
  { path: '/settings', label: '设置', icon: Settings },
];

/**
 * 头部导航组件
 * 提供导航、主题切换、用户信息显示等功能
 */
const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /**
   * 处理滚动效果
   */
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /**
   * 处理登出
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  /**
   * 处理移动端菜单切换
   */
  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  /**
   * 关闭移动端菜单
   */
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  /**
   * 检查当前路径是否激活
   */
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-md border-b border-gray-200 dark:border-gray-700' 
          : 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 group"
            onClick={closeMobileMenu}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-colors">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Mio的日记本
            </span>
          </Link>

          {/* 桌面端导航 */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.icon && <item.icon size={18} />}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          )}

          {/* 右侧操作区 */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* 主题切换 */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="切换主题"
              title={isDark ? '切换到亮色主题' : '切换到暗色主题'}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {user && (
              <>
                {/* 用户信息（桌面端） - 点击头像访问个人主页 */}
                <button
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="访问个人主页"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                    {user.avatarUrl ? (
                      <img
                        src={getImageUrl(user.avatarUrl)}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.username}
                  </span>
                </button>

                {/* 登出按钮（桌面端） */}
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                  aria-label="登出"
                  title="登出"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">登出</span>
                </button>

                {/* 移动端菜单按钮 */}
                <button
                  onClick={handleMobileMenuToggle}
                  className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  ) : (
                    <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 移动端导航菜单 */}
        {mobileMenuOpen && user && (
          <nav className="md:hidden pb-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <div className="flex flex-col space-y-1 py-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.icon && <item.icon size={20} />}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

              {/* 用户信息（移动端） - 点击头像访问个人主页 */}
              <button
                onClick={() => {
                  navigate(`/profile/${user.username}`);
                  closeMobileMenu();
                }}
                className="flex items-center space-x-3 px-4 py-3 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                  {user.avatarUrl ? (
                    <img
                      src={getImageUrl(user.avatarUrl)}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </button>

              {/* 登出按钮（移动端） */}
              <button
                onClick={() => {
                  handleLogout();
                  closeMobileMenu();
                }}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">登出</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;