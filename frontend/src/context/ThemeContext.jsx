import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useConfig } from './ConfigContext';

// 主题类型
const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// 主题存储键名
const THEME_STORAGE_KEY = 'theme';

// 主题色配置 (HSL 格式)
const PRIMARY_COLORS = {
  indigo: { h: 239, s: 84, l: 67 },
  blue: { h: 217, s: 91, l: 60 },
  purple: { h: 271, s: 91, l: 65 },
  pink: { h: 330, s: 81, l: 60 },
  red: { h: 0, s: 84, l: 60 },
  orange: { h: 25, s: 95, l: 53 },
  yellow: { h: 45, s: 93, l: 47 },
  green: { h: 142, s: 71, l: 45 },
  teal: { h: 173, s: 80, l: 40 },
  cyan: { h: 189, s: 94, l: 43 },
  gray: { h: 218, s: 11, l: 65 },
};

/**
 * 主题上下文 - 管理应用主题状态
 */
const ThemeContext = createContext(null);

/**
 * ThemeProvider组件 - 提供主题相关的状态和方法
 */
export const ThemeProvider = ({ children }) => {
  const { defaultTheme, primaryColor, loading: configLoading } = useConfig();
  
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
   * 应用主题色到 CSS 变量
   */
  const applyPrimaryColor = useCallback((color) => {
    const root = document.documentElement;
    const colorConfig = PRIMARY_COLORS[color] || PRIMARY_COLORS.indigo;
    
    // 设置 HSL 格式的 CSS 变量（与 Tailwind 配置兼容）
    const { h, s, l } = colorConfig;
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
    root.style.setProperty('--accent', `${h} ${s}% ${l}%`);
    
    // 设置额外的变体颜色
    root.style.setProperty('--primary-hover', `${h} ${s}% ${Math.max(l - 10, 20)}%`);
    root.style.setProperty('--primary-light', `${h} ${Math.max(s - 20, 10)}% ${Math.min(l + 30, 95)}%`);
  }, []);

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
   * 根据系统配置设置默认主题
   */
  useEffect(() => {
    if (configLoading) return;
    
    // 如果用户没有手动设置过主题，则使用系统配置
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (defaultTheme === THEME_TYPES.AUTO) {
      // 自动模式：跟随系统
      if (!savedTheme) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? THEME_TYPES.DARK 
          : THEME_TYPES.LIGHT;
        setTheme(systemTheme);
        applyTheme(systemTheme);
      }
    } else if (defaultTheme === THEME_TYPES.LIGHT || defaultTheme === THEME_TYPES.DARK) {
      // 强制模式：使用配置的主题
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
      localStorage.setItem(THEME_STORAGE_KEY, defaultTheme);
    }
  }, [defaultTheme, configLoading, applyTheme]);

  /**
   * 应用主题色
   */
  useEffect(() => {
    if (configLoading) return;
    if (primaryColor) {
      applyPrimaryColor(primaryColor);
    }
  }, [primaryColor, configLoading, applyPrimaryColor]);

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
   * 监听系统主题变化（仅在 auto 模式下生效）
   */
  useEffect(() => {
    if (defaultTheme !== THEME_TYPES.AUTO) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // 只在 auto 模式下且用户没有手动设置时跟随系统主题
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme || defaultTheme === THEME_TYPES.AUTO) {
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
  }, [defaultTheme, applyTheme]);

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
