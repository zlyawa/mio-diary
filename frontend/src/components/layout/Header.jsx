import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { getImageUrl } from '../../utils/api';
import api from '../../utils/api';
import { Moon, Sun, LogOut, User, BookOpen, Menu, X, Home, LayoutDashboard, Settings, PenTool, Bell, ChevronDown } from 'lucide-react';

/**
 * 导航菜单项配置
 */
const NAV_ITEMS = [
  { path: '/features', label: '首页', icon: Home },
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/diaries', label: '日记列表', icon: BookOpen },
  { path: '/diaries/new', label: '写日记', icon: PenTool },
  { path: '/notifications', label: '通知', icon: Bell },
  { path: '/settings', label: '设置', icon: Settings },
];

/**
 * 头部导航组件
 * 提供导航、主题切换、用户信息显示等功能
 */
const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { siteName, siteIcon } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navMenuRef = useRef(null);

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
   * 获取未读通知数量
   */
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const response = await api.get('/notifications/unread-count');
        setUnreadNotifications(response.data.count);
      } catch (error) {
        console.error('获取未读通知数量失败:', error);
      }
    };

    fetchUnreadCount();
    // 每隔30秒刷新一次
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  /**
   * 点击外部关闭用户菜单
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setNavMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-colors overflow-hidden">
              {siteIcon ? (
                <img 
                  src={getImageUrl(siteIcon)} 
                  alt="网站图标" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <BookOpen className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${siteIcon ? 'hidden' : 'block'}`} />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {siteName || 'Mio的日记本'}
            </span>
          </Link>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-3 md:gap-4">
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
                {/* 导航下拉按钮（桌面端） */}
                <div className="relative hidden md:block" ref={navMenuRef}>
                  <button
                    onClick={() => setNavMenuOpen(!navMenuOpen)}
                    className={`p-2 rounded-lg transition-colors ${
                      navMenuOpen || NAV_ITEMS.some(item => isActive(item.path))
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title="导航菜单"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  {/* 导航下拉菜单 */}
                  {navMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      {NAV_ITEMS.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setNavMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            isActive(item.path)
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {item.icon && <item.icon size={16} />}
                          <span>{item.label}</span>
                        </Link>
                      ))}
                      {/* 管理员后台入口 - 仅管理员可见 */}
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setNavMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-t border-gray-200 dark:border-gray-700 mt-1 pt-2"
                        >
                          <LayoutDashboard size={16} />
                          <span>管理后台</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* 通知按钮（桌面端） */}
                <button
                  onClick={() => navigate('/notifications')}
                  className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors hidden md:block"
                  title="通知中心"
                >
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>

                {/* 用户下拉菜单（桌面端） */}
                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                      {user.avatarUrl ? (
                        <img
                          src={getImageUrl(user.avatarUrl)}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <User className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 下拉菜单 */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      {/* 用户信息头部 */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
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
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigate(`/profile/${user.username}`);
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <User className="w-4 h-4" />
                        <span>个人主页</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="w-4 h-4" />
                        <span>设置</span>
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <button
                        onClick={() => {
                          handleLogout();
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>登出</span>
                      </button>
                    </div>
                  )}
                </div>

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

              {/* 管理员后台入口（移动端）- 仅管理员可见 */}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-medium">管理后台</span>
                </Link>
              )}

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