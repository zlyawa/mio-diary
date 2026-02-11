import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 主题类型
const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// 主题存储键名
const THEME_STORAGE_KEY = 'theme';

/**
 * 主题上下文 - 管理应用主题状态
 */
const ThemeContext = createContext(null);

/**
 * ThemeProvider组件 - 提供主题相关的状态和方法
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // 优先使用localStorage中保存的主题
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && (savedTheme === THEME_TYPES.LIGHT || savedTheme === THEME_TYPES.DARK)) {
      return savedTheme;
    }
    // 如果没有保存的主题，使用系统主题偏好
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? THEME_TYPES.DARK 
      : THEME_TYPES.LIGHT;
  });
  const [mounted, setMounted] = useState(false);

  /**
   * 应用主题到DOM
   */
  const applyTheme = useCallback((newTheme) => {
    const root = document.documentElement;
    
    // 添加过渡动画类
    root.classList.add('theme-transition');
    
    // 移除旧主题类
    root.classList.remove(THEME_TYPES.LIGHT, THEME_TYPES.DARK);
    
    // 添加新主题类
    if (newTheme === THEME_TYPES.DARK) {
      root.classList.add(THEME_TYPES.DARK);
    } else {
      root.classList.add(THEME_TYPES.LIGHT);
    }
    
    // 存储主题偏好
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    
    // 移除过渡动画类
    setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
  }, []);

  /**
   * 切换主题
   */
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === THEME_TYPES.DARK ? THEME_TYPES.LIGHT : THEME_TYPES.DARK;
      applyTheme(newTheme);
      return newTheme;
    });
  }, [applyTheme]);

  /**
   * 设置特定主题
   */
  const setThemeMode = useCallback((newTheme) => {
    if (newTheme === THEME_TYPES.LIGHT || newTheme === THEME_TYPES.DARK) {
      setTheme(newTheme);
      applyTheme(newTheme);
    }
  }, [applyTheme]);

  /**
   * 应用初始主题
   */
  useEffect(() => {
    applyTheme(theme);
    setMounted(true);
  }, [theme, applyTheme]);

  /**
   * 监听系统主题变化
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // 只在没有用户偏好设置时跟随系统主题
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        const systemTheme = e.matches ? THEME_TYPES.DARK : THEME_TYPES.LIGHT;
        setTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    // 添加监听器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 兼容旧浏览器
      mediaQuery.addListener(handleChange);
    }

    // 清理监听器
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [applyTheme]);

  /**
   * 判断是否为暗黑主题
   */
  const isDark = theme === THEME_TYPES.DARK;

  /**
   * 判断是否为亮色主题
   */
  const isLight = theme === THEME_TYPES.LIGHT;

  // 上下文值
  const value = {
    theme,
    isDark,
    isLight,
    mounted,
    toggleTheme,
    setTheme: setThemeMode,
    THEME_TYPES,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * useTheme Hook - 访问主题上下文
 * @returns {Object} 主题上下文
 * @throws {Error} 如果在ThemeProvider外部使用
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};