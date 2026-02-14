import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { getImageUrl } from '../../utils/api';
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
} from 'lucide-react';

/**
 * 管理后台布局组件
 * 电脑端使用顶部导航栏，移动端使用侧边栏
 */
const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [diaryMenuOpen, setDiaryMenuOpen] = useState(true); // 日记菜单默认展开
  const [userMenuOpen, setUserMenuOpen] = useState(false); // 用户菜单状态
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { siteName, siteIcon } = useConfig();

  const displaySiteName = siteName || 'Mio日记';

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

  // 渲染菜单项（用于顶部导航）
  const renderNavMenuItem = (item) => {
    if (item.type === 'group') {
      const active = isGroupActive(item.children);
      const Icon = item.icon;
      return (
        <div key={item.key} className="relative">
          <button
            onClick={() => setDiaryMenuOpen(!diaryMenuOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              active
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                : 'text-white dark:text-gray-300 hover:bg-white/20'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium text-sm">{item.label}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${diaryMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {diaryMenuOpen && (
            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = isActive(child.path);
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => setDiaryMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      childActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ChildIcon className="w-4 h-4" />
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
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          active
            ? 'bg-white/20 text-white'
            : 'text-white/80 hover:bg-white/20'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium text-sm">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 电脑端顶部导航栏 - 使用深色主题 */}
      <header className="hidden lg:block sticky top-0 z-50 bg-indigo-600 dark:bg-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
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
                  <Shield className={`w-5 h-5 text-indigo-600 ${siteIcon ? 'hidden' : 'block'}`} />
                </div>
                <span className="font-bold text-white">{displaySiteName}</span>
              </Link>
              <span className="px-2 py-1 text-xs bg-white/20 text-white rounded">管理后台</span>
            </div>

            {/* 导航菜单 */}
            <nav className="flex items-center gap-1">
              {menuItems.map(renderNavMenuItem)}
            </nav>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-2">
              {/* 主题切换 */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-white" />
                )}
              </button>

              {/* 用户菜单 */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={getImageUrl(user.avatarUrl)}
                        alt={user.username}
                        className="w-7 h-7 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-white hidden sm:inline">
                      {user.username}
                    </span>
                  </button>

                  {/* 用户下拉菜单 */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      <Link
                        to={`/profile/${user.username}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <User className="w-4 h-4" />
                        <span>我的主页</span>
                      </Link>
                      <Link
                        to="/"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Home className="w-4 h-4" />
                        <span>返回用户端</span>
                      </Link>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <button
                        onClick={() => {
                          handleLogout();
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 flex items-center justify-between px-4">
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
        <div className="lg:hidden fixed inset-0 z-40">
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
                  return (
                    <div key={item.key}>
                      <button
                        onClick={() => setDiaryMenuOpen(!diaryMenuOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${diaryMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {diaryMenuOpen && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = isActive(child.path);
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={() => setIsMobileMenuOpen(false)}
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
                className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
      <main className="flex-1 pt-16 lg:pt-16">
        <div className="h-full overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;