const prisma = require('../config/database');
const { verifyAccessToken } = require('../utils/jwt');

// 维护模式缓存
let maintenanceCache = {
  enabled: null,
  message: null,
  lastCheck: 0
};

const CACHE_TTL = 30000; // 30秒缓存

/**
 * 获取维护模式配置
 * 使用缓存减少数据库查询
 */
const getMaintenanceConfig = async () => {
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (maintenanceCache.lastCheck > 0 && (now - maintenanceCache.lastCheck) < CACHE_TTL) {
    return {
      enabled: maintenanceCache.enabled,
      message: maintenanceCache.message
    };
  }

  try {
    const [modeConfig, messageConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'maintenanceMode' } }),
      prisma.systemConfig.findUnique({ where: { key: 'maintenanceMessage' } })
    ]);

    // 安全解析布尔值
    let enabled = false;
    if (modeConfig) {
      try {
        enabled = JSON.parse(modeConfig.value);
      } catch {
        enabled = modeConfig.value === 'true';
      }
    }
    
    // 安全解析消息（支持原始字符串或 JSON 字符串）
    let message = '系统正在维护中，请稍后再试';
    if (messageConfig) {
      try {
        message = JSON.parse(messageConfig.value);
      } catch {
        // 如果不是有效的 JSON，直接使用原始值
        message = messageConfig.value;
      }
    }

    // 更新缓存
    maintenanceCache = {
      enabled,
      message,
      lastCheck: now
    };

    return { enabled, message };
  } catch (error) {
    console.error('[Maintenance] 读取维护配置失败:', error.message);
    // 出错时默认关闭维护模式，避免锁定系统
    return { enabled: false, message: '系统正在维护中，请稍后再试' };
  }
};

/**
 * 从请求头解析JWT Token
 * 返回解码后的用户信息或null
 */
const parseTokenFromHeader = (req) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim().length === 0) {
      return null;
    }

    const decoded = verifyAccessToken(token);
    return decoded;
  } catch (error) {
    // Token无效或过期，返回null
    return null;
  }
};

/**
 * 检查用户是否为管理员
 */
const isAdminUser = async (userId) => {
  if (!userId) return false;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user && user.role === 'admin';
  } catch (error) {
    console.error('[Maintenance] 查询用户角色失败:', error.message);
    return false;
  }
};

/**
 * 维护模式中间件
 * 
 * 规则：
 * 1. 维护模式关闭时，所有请求正常通过
 * 2. 维护模式开启时：
 *    - 公开接口（白名单）允许访问
 *    - 管理员用户允许访问
 *    - 其他用户返回503维护信息
 */
const maintenanceMiddleware = async (req, res, next) => {
  try {
    // 获取维护模式配置
    const { enabled, message } = await getMaintenanceConfig();

    // 维护模式未开启，正常放行
    if (!enabled) {
      return next();
    }

    // 定义允许访问的白名单路径
    // 这些路径即使在维护模式下也应该允许访问
    const whitelistPaths = [
      // 配置相关
      '/api/config/public',
      '/api/config/version',
      '/api/config/check-update',
      // 认证相关（登录注册本身需要可用）
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh-token',
      '/api/auth/logout',
      '/api/auth/captcha',
      '/api/auth/send-verification-code',
      '/api/auth/check',
      '/api/auth/reset-password',
      // 健康检查
      '/api/health',
      '/api',
      '/api/stats/docs'
    ];

    // 检查是否在白名单中
    const path = req.path;
    if (whitelistPaths.some(whitelistPath => path === whitelistPath || path.startsWith(whitelistPath + '/'))) {
      return next();
    }

    // 解析JWT Token判断用户身份
    const decoded = parseTokenFromHeader(req);
    
    // 如果有有效的Token，检查是否为管理员
    if (decoded && decoded.userId) {
      const isAdmin = await isAdminUser(decoded.userId);
      if (isAdmin) {
        // 管理员允许访问
        return next();
      }
    }

    // 非管理员用户，返回503服务不可用
    return res.status(503).json({
      message: message,
      maintenance: true,
      code: 'SYSTEM_MAINTENANCE'
    });

  } catch (error) {
    console.error('[Maintenance] 中间件错误:', error.message);
    // 出错时放行，避免误拦截
    next();
  }
};

/**
 * 手动清除维护模式缓存
 * 用于管理员在后台更新维护配置后调用
 */
const clearMaintenanceCache = () => {
  maintenanceCache = {
    enabled: null,
    message: null,
    lastCheck: 0
  };
  console.log('[Maintenance] 维护模式缓存已清除');
};

module.exports = {
  maintenanceMiddleware,
  clearMaintenanceCache,
  getMaintenanceConfig
};