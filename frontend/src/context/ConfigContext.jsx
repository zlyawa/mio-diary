import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    enableReview: false,
    enableEmailVerify: false,
    // 功能开关默认值
    enableLike: false,
    enableComment: false,
    enableFavorite: false,
    enableShare: false,
    enableStatistics: false,
    // 现有配置
    siteName: 'Mio日记',
    siteIcon: '',
    siteIco: '',
    loginBg: '',
    registerBg: '',
    forgotPasswordBg: '',
    siteAnnouncement: '',
    // 主题配置
    primaryColor: 'indigo',
    defaultTheme: 'auto',
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/config/public');
        setConfig({ 
          ...res.data, 
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('获取系统配置失败:', error);
        setConfig(prev => ({ 
          ...prev, 
          loading: false,
          error: error.message || '获取配置失败'
        }));
      }
    };

    fetchConfig();
  }, []);

  // 刷新配置的函数
  const refreshConfig = async () => {
    try {
      setConfig(prev => ({ ...prev, loading: true }));
      const res = await api.get('/config/public');
      setConfig({ 
        ...res.data, 
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('刷新系统配置失败:', error);
      setConfig(prev => ({ 
        ...prev, 
        loading: false,
        error: error.message || '刷新配置失败'
      }));
    }
  };

  return (
    <ConfigContext.Provider value={{ ...config, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    // 返回默认值而不是抛出错误，避免懒加载组件在Provider准备好之前报错
    return {
      enableReview: false,
      enableEmailVerify: false,
      enableLike: false,
      enableComment: false,
      enableFavorite: false,
      enableShare: false,
      enableStatistics: false,
      siteName: 'Mio日记',
      siteIcon: '',
      siteIco: '',
      loginBg: '',
      registerBg: '',
      forgotPasswordBg: '',
      siteAnnouncement: '',
      primaryColor: 'indigo',
      defaultTheme: 'auto',
      loading: true,
      error: null,
      refreshConfig: () => {}
    };
  }
  return context;
};

export default ConfigContext;