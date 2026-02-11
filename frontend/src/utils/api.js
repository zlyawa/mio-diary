import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 请求配置常量
const API_CONFIG = {
  TIMEOUT: 30000, // 30秒超时
  MAX_RETRIES: 3, // 最大重试次数
  RETRY_DELAY: 1000, // 重试延迟（毫秒）
  ENABLE_LOGGING: import.meta.env.DEV, // 开发环境启用日志
};

// Token刷新状态标志
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * 订阅Token刷新
 */
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

/**
 * 通知Token刷新完成
 */
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * 生成请求唯一ID
 */
const generateRequestId = () => {
  return `req_${uuidv4()}_${Date.now()}`;
};

/**
 * 日志工具
 */
const logger = {
  request: (config) => {
    if (API_CONFIG.ENABLE_LOGGING) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        requestId: config.metadata?.requestId,
        baseURL: config.baseURL,
        data: config.data,
        headers: config.headers,
        timeout: config.timeout,
      });
    }
  },
  response: (response) => {
    if (API_CONFIG.ENABLE_LOGGING) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        requestId: response.config.metadata?.requestId,
        status: response.status,
        statusText: response.statusText,
        duration: Date.now() - response.config.metadata?.startTime,
        dataSize: JSON.stringify(response.data).length,
      });
    }
  },
  error: (error) => {
    if (API_CONFIG.ENABLE_LOGGING) {
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        requestId: error.config?.metadata?.requestId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        data: error.response?.data,
        isNetworkError: !error.response,
        isTimeout: error.code === 'ECONNABORTED',
      });
    }
  },
};

/**
 * 创建Axios实例
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器 - 添加Token和请求ID
 */
api.interceptors.request.use(
  (config) => {
    // 生成请求ID
    const requestId = generateRequestId();
    
    // 添加请求元数据
    config.metadata = {
      requestId,
      startTime: Date.now(),
    };

    // 添加Token
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加请求ID到响应头（用于追踪）
    config.headers['X-Request-ID'] = requestId;

    // 记录请求日志
    logger.request(config);

    return config;
  },
  (error) => {
    logger.error(error);
    return Promise.reject(error);
  }
);

/**
 * 刷新AccessToken
 */
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);

    return accessToken;
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw error;
  }
};

/**
 * 响应拦截器 - 处理Token刷新和错误
 */
api.interceptors.response.use(
  (response) => {
    logger.response(response);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    logger.error(error);

    // Token过期，尝试刷新
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh-token'
    ) {
      if (isRefreshing) {
        // 等待Token刷新完成
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onTokenRefreshed(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    // 处理网络错误
    if (!error.response && error.code === 'ECONNABORTED') {
      error.message = '请求超时，请检查网络连接';
    }

    // 处理其他错误
    if (error.response?.data?.error) {
      error.message = error.response.data.error;
    }

    return Promise.reject(error);
  }
);

/**
 * 取消请求
 */
const cancelRequest = (requestId) => {
  api.get('/cancel', {
    cancelToken: axios.CancelToken.source().token,
  });
};

/**
 * 请求工具方法
 */
const requestHelpers = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data, config = {}) => api.post(url, data, config),
  put: (url, data, config = {}) => api.put(url, data, config),
  patch: (url, data, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
  
  // 文件上传
  upload: (url, formData, onProgress) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  
  // 取消请求
  cancel: cancelRequest,
};

/**
 * 获取完整的图片URL
 * @param {string} url - 图片URL（相对路径或绝对路径）
 * @returns {string} 完整的图片URL
 */
const getImageUrl = (url) => {
  if (!url) return null;
  
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果是相对路径，添加基础URL
  // 从 VITE_API_URL 中提取基础URL（移除 /api 后缀）
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');
  
  return `${baseUrl}${url}`;
};

// 导出API实例和工具方法
export default api;
export { requestHelpers, API_CONFIG, API_BASE_URL, getImageUrl };