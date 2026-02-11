import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

// Token刷新阈值（毫秒）- Token过期前5分钟刷新
const REFRESH_THRESHOLD = 5 * 60 * 1000;

// Token存储键名
const TOKEN_KEYS = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
};

/**
 * 认证上下文 - 管理用户认证状态和Token
 */
const AuthContext = createContext(null);

/**
 * AuthProvider组件 - 提供认证相关的状态和方法
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimerRef = useRef(null);

  /**
   * 安全存储Token到localStorage
   */
  const setTokens = useCallback((accessToken, refreshToken) => {
    try {
      localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
      localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
    } catch (error) {
      console.error('Token存储失败:', error);
    }
  }, []);

  /**
   * 安全清除Token
   */
  const clearTokens = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEYS.ACCESS);
      localStorage.removeItem(TOKEN_KEYS.REFRESH);
    } catch (error) {
      console.error('Token清除失败:', error);
    }
  }, []);

  /**
   * 获取当前Token
   */
  const getAccessToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEYS.ACCESS);
  }, []);

  /**
   * 获取RefreshToken
   */
  const getRefreshToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEYS.REFRESH);
  }, []);

  /**
   * 解析JWT Token获取过期时间
   */
  const getTokenExpiration = useCallback((token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // 转换为毫秒
    } catch (error) {
      console.error('Token解析失败:', error);
      return null;
    }
  }, []);

  /**
   * 检查Token是否需要刷新
   */
  const shouldRefreshToken = useCallback((token) => {
    const expiration = getTokenExpiration(token);
    if (!expiration) return false;
    const now = Date.now();
    return expiration - now < REFRESH_THRESHOLD;
  }, [getTokenExpiration]);

  /**
   * 刷新AccessToken
   */
  const refreshAccessToken = useCallback(async () => {
    if (refreshing) return false;
    
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    setRefreshing(true);
    try {
      const response = await api.post('/auth/refresh-token', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken, user: userData } = response.data;
      
      setTokens(accessToken, newRefreshToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Token刷新失败:', error);
      // Token刷新失败，清除所有Token并登出
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, getRefreshToken, setTokens, clearTokens]);

  /**
   * 设置Token刷新定时器
   */
  const setupRefreshTimer = useCallback((token) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const expiration = getTokenExpiration(token);
    if (!expiration) return;

    const now = Date.now();
    const timeToRefresh = expiration - now - REFRESH_THRESHOLD;

    if (timeToRefresh > 0) {
      refreshTimerRef.current = setTimeout(() => {
        refreshAccessToken();
      }, timeToRefresh);
    } else {
      // Token已经接近过期，立即刷新
      refreshAccessToken();
    }
  }, [getTokenExpiration, refreshAccessToken]);

  /**
   * 获取用户信息
   */
  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/profile');
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      
      // 设置Token刷新定时器
      const token = getAccessToken();
      if (token) {
        setupRefreshTimer(token);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, clearTokens, setupRefreshTimer]);

  /**
   * 初始化认证状态
   */
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      // 检查Token是否需要刷新
      if (shouldRefreshToken(token)) {
        refreshAccessToken().then(() => {
          if (getAccessToken()) {
            fetchProfile();
          } else {
            setLoading(false);
          }
        });
      } else {
        fetchProfile();
      }
    } else {
      setLoading(false);
    }

    // 清理定时器
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [getAccessToken, shouldRefreshToken, refreshAccessToken, fetchProfile]);

  /**
   * 用户登录
   */
  const login = useCallback(async (credentials) => {
    console.log('[AuthContext] 开始登录请求');
    console.log('[AuthContext] 登录凭证:', JSON.stringify({ ...credentials, password: '***' }));
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('[AuthContext] 登录请求成功:', response.data);
      const { accessToken, refreshToken, user: userData } = response.data;
      
      setTokens(accessToken, refreshToken);
      setUser(userData);
      setIsAuthenticated(true);
      setupRefreshTimer(accessToken);
      
      return response.data;
    } catch (error) {
      console.error('[AuthContext] 登录请求失败:', error);
      console.error('[AuthContext] 错误响应:', error.response?.data);
      console.error('[AuthContext] 错误状态:', error.response?.status);
      throw error;
    }
  }, [setTokens, setupRefreshTimer]);

  /**
   * 用户注册
   */
  const register = useCallback(async (userData) => {
    console.log('[AuthContext] 开始注册请求');
    console.log('[AuthContext] 请求数据:', JSON.stringify({ ...userData, password: '***' }));
    try {
      const response = await api.post('/auth/register', userData);
      console.log('[AuthContext] 注册请求成功:', response.data);
      return response.data;
    } catch (error) {
      console.error('[AuthContext] 注册请求失败:', error);
      console.error('[AuthContext] 错误响应:', error.response?.data);
      console.error('[AuthContext] 错误状态:', error.response?.status);
      throw error;
    }
  }, []);

  /**
   * 用户登出
   */
  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('登出错误:', error);
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    }
  }, [getRefreshToken, clearTokens]);

  /**
   * 修改密码
   */
  const changePassword = useCallback(async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  }, []);

  /**
   * 检查认证状态
   */
  const checkAuth = useCallback(() => {
    const token = getAccessToken();
    return isAuthenticated && !!token && !shouldRefreshToken(token);
  }, [isAuthenticated, getAccessToken, shouldRefreshToken]);

  /**
   * 重新加载用户信息
   */
  const reloadUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  /**
   * 更新用户信息
   */
  const updateUser = useCallback((userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  }, []);

  // 上下文值
  const value = {
    user,
    loading,
    isAuthenticated,
    refreshing,
    login,
    register,
    logout,
    fetchProfile,
    changePassword,
    checkAuth,
    reloadUser,
    updateUser,
    getAccessToken,
    getRefreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth Hook - 访问认证上下文
 * @returns {Object} 认证上下文
 * @throws {Error} 如果在AuthProvider外部使用
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};