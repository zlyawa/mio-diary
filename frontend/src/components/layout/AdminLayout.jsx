import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { getImageUrl } from '../../utils/api';
import api from '../../utils/api';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Info,
  User,
  Home,
  Moon,
  Sun,
  ChevronDown,
  BookOpen,
  CheckSquare,
  Bell,
  MessageCircle,
} from 'lucide-react';

/**
 * 管理后台布局组件
 * 电脑端使用顶部导航栏，移动端使用侧边栏
 */
const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [diaryMenuOpen, setDiaryMenuOpen] = useState(false);
  const [commentMenuOpen, setCommentMenuOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { siteName, siteIcon } = useConfig();

  const displaySiteName = siteName || 'Mio日记';

  // 获取未读通知数量
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      try {
        const response = await api.get('/notifications/unread-count', {
          signal: abortControllerRef.current.signal
        });
        setUnreadNotifications(response.data.count);
      } catch (error) {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          return; // 忽略取消的请求
        }
        console.error('获取未读通知数量失败:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearInterval(interval);
      // 组件卸载时取消请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setNavMenuOpen(false);
        setDiaryMenuOpen(false);
        setCommentMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      path: '/admin',
      icon: LayoutDashboard,
      label: '仪表盘',
      exact: true,
    },
    {
      path: '/admin/users',
      icon: Users,
      label: '用户管理',
    },
    {
      type: 'group',
      icon: BookOpen,
      label: '日记管理',
      key: 'diary',
      children: [
        {
          path: '/admin/diaries',
          icon: FileText,
          label: '日记列表',
        },
        {
          path: '/admin/reviews',
          icon: CheckSquare,
          label: '日记审核',
        },
      ],
    },
    {
      type: 'group',
      icon: MessageCircle,
      label: '评论管理',
      key: 'comment',
      children: [
        {
          path: '/admin/comments',
          icon: FileText,
          label: '评论列表',
        },
        {
          path: '/admin/comments/review',
          icon: CheckSquare,
          label: '评论审核',
        },
      ],
    },
    {
      path: '/admin/settings',
      icon: Settings,
      label: '系统设置',
    },
    {
      path: '/admin/about',
      icon: Info,
      label: '关于',
    },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (children) => {
    return children?.some(child => location.pathname.startsWith(child.path));
  };

  const isAnyActive = () => {
    return menuItems.some(item => {
      if (item.type === 'group') {
        return isGroupActive(item.children);
      }
      return isActive(item.path, item.exact);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 电脑端顶部导航栏 - 浅色风格 */}
      <header className="hidden md:block sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center overflow-hidden">
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
                <Shield className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${siteIcon ? 'hidden' : 'block'}`} />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">{displaySiteName}</span>
              <span className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">管理后台</span>
            </Link>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-3">
              {/* 主题切换 */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>

              {/* 导航下拉按钮 */}
              <div className="relative" ref={navMenuRef}>
                <button
                  onClick={() => setNavMenuOpen(!navMenuOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    navMenuOpen || isAnyActive()
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
                    {menuItems.map((item) => {
                      if (item.type === 'group') {
                        const active = isGroupActive(item.children);
                        const Icon = item.icon;
                        const isMenuOpen = item.key === 'diary' ? diaryMenuOpen : 
                                          item.key === 'comment' ? commentMenuOpen : false;
                        const setMenuOpen = item.key === 'diary' ? setDiaryMenuOpen : 
                                           item.key === 'comment' ? setCommentMenuOpen : () => {};
                        return (
                          <div key={item.key}>
                            <button
                              onClick={() => setMenuOpen(!isMenuOpen)}
                              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                                active
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <Icon size={16} />
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isMenuOpen && (
                              <div className="pl-4">
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon;
                                  const childActive = isActive(child.path);
                                  return (
                                    <Link
                                      key={child.path}
                                      to={child.path}
                                      onClick={() => {
                                        setNavMenuOpen(false);
                                        setDiaryMenuOpen(false);
                                        setCommentMenuOpen(false);
                                      }}
                                      className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                                        childActive
                                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <ChildIcon size={16} />
                                      <span>{child.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      const Icon = item.icon;
                      const active = isActive(item.path, item.exact);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setNavMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    
                    {/* 分割线和返回用户端 */}
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                      <Link
                        to="/"
                        onClick={() => setNavMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      >
                        <Home size={16} />
                        <span>返回用户端</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* 通知按钮 */}
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="通知中心"
              >
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {/* 用户下拉菜单 */}
              {user && (
                <div className="relative" ref={userMenuRef}>
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
                          navigate('/admin/settings');
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="w-4 h-4" />
                        <span>系统设置</span>
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
                        <span>退出登录</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 移动端头部 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 flex items-center justify-between px-4">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
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
            <Shield className={`w-5 h-5 text-white ${siteIcon ? 'hidden' : 'block'}`} />
          </div>
          <span className="font-bold text-gray-900 dark:text-white">{displaySiteName}</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          ) : (
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* 菜单内容 */}
          <div className="absolute top-16 left-0 right-0 bottom-0 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="p-4 space-y-1">
              {menuItems.map((item) => {
                if (item.type === 'group') {
                  const active = isGroupActive(item.children);
                  const Icon = item.icon;
                  const isMenuOpen = item.key === 'diary' ? diaryMenuOpen : 
                                    item.key === 'comment' ? commentMenuOpen : false;
                  const setMenuOpen = item.key === 'diary' ? setDiaryMenuOpen : 
                                     item.key === 'comment' ? setCommentMenuOpen : () => {};
                  return (
                    <div key={item.key}>
                      <button
                        onClick={() => setMenuOpen(!isMenuOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isMenuOpen && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = isActive(child.path);
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                  childActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <ChildIcon className="w-4 h-4" />
                                <span className="text-sm">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors ${
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-1">
              {/* 主题切换 */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="font-medium">{isDark ? '亮色模式' : '暗色模式'}</span>
              </button>
              {/* 用户主页 */}
              {user && (
                <Link
                  to={`/profile/${user.username}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">我的主页</span>
                </Link>
              )}
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">返回用户端</span>
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">退出登录</span>
              </button>
            </div>
            {/* 用户信息 */}
            {user && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img
                        src={getImageUrl(user.avatarUrl)}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span 
                      className={`text-sm font-medium text-indigo-600 dark:text-indigo-400 ${user.avatarUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
                    >
                      {user.username?.charAt(0)?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.username || '管理员'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email || ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <main className="flex-1 pt-16 md:pt-0">
        <div className="h-full overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;