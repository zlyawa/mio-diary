import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    enableReview: false,
    enableEmailVerify: false,
    siteName: 'Mio日记',
    siteIcon: '',
    siteIco: '',
    loginBg: '',
    registerBg: '',
    forgotPasswordBg: '',
    siteAnnouncement: '',
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
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export default ConfigContext;