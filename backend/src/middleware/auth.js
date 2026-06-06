const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/database');
const { redis } = require('../config/redis');

// 内存黑名单配置
const MEMORY_BLACKLIST_MAX_SIZE = 10000; // 最大容量
const MEMORY_BLACKLIST_MAX_AGE = 24 * 60 * 60 * 1000; // 最大存活时间 24小时

// 内存黑名单（使用 Map 存储 token 和过期时间，支持 LRU 淘汰）
const TOKEN_BLACKLIST_MEMORY = new Map();
const BLACKLIST_TIMERS = new Map(); // 存储定时器 ID

/**
 * 清理过期的内存黑名单条目
 */
const cleanupMemoryBlacklist = () => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, expireTime] of TOKEN_BLACKLIST_MEMORY) {
    if (expireTime <= now) {
      TOKEN_BLACKLIST_MEMORY.delete(token);
      const timer = BLACKLIST_TIMERS.get(token);
      if (timer) {
        clearTimeout(timer);
        BLACKLIST_TIMERS.delete(token);
      }
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Auth] 清理了 ${cleaned} 个过期的内存黑名单条目`);
  }
};

// 定期清理过期条目（每10分钟）
setInterval(cleanupMemoryBlacklist, 10 * 60 * 1000);

/**
 * 检查Token是否在黑名单中
 * @param {string} token - JWT Token
 * @returns {Promise<boolean>}
 */
const isTokenBlacklisted = async (token) => {
  try {
    // 优先检查Redis
    const result = await redis.exists(`blacklist:${token}`);
    if (result === 1) {
      return true;
    }
  } catch (error) {
    console.error('[Auth] Redis检查黑名单失败:', error.message);
  }
  
  // Redis失败时回退到内存检查
  const expireTime = TOKEN_BLACKLIST_MEMORY.get(token);
  if (expireTime) {
    // 检查是否已过期
    if (expireTime > Date.now()) {
      return true;
    }
    // 已过期，清理
    TOKEN_BLACKLIST_MEMORY.delete(token);
  }
  return false;
};

/**
 * 将Token加入内存黑名单（带 LRU 淘汰）
 * @param {string} token - JWT Token
 * @param {number} expiresInSeconds - Token过期时间（秒）
 */
const addToMemoryBlacklist = (token, expiresInSeconds) => {
  // 如果超过最大容量，淘汰最旧的条目
  if (TOKEN_BLACKLIST_MEMORY.size >= MEMORY_BLACKLIST_MAX_SIZE) {
    // Map 会保持插入顺序，第一个就是最旧的
    const oldestKey = TOKEN_BLACKLIST_MEMORY.keys().next().value;
    if (oldestKey) {
      TOKEN_BLACKLIST_MEMORY.delete(oldestKey);
      const oldTimer = BLACKLIST_TIMERS.get(oldestKey);
      if (oldTimer) {
        clearTimeout(oldTimer);
        BLACKLIST_TIMERS.delete(oldestKey);
      }
      console.log(`[Auth] 内存黑名单已满，淘汰最旧条目`);
    }
  }
  
  // 限制过期时间不超过最大值
  const ttl = Math.min(expiresInSeconds * 1000, MEMORY_BLACKLIST_MAX_AGE);
  const expireTime = Date.now() + ttl;
  
  TOKEN_BLACKLIST_MEMORY.set(token, expireTime);
  
  // 设置定时清理（使用存储定时器 ID 以便需要时清理）
  const timerId = setTimeout(() => {
    TOKEN_BLACKLIST_MEMORY.delete(token);
    BLACKLIST_TIMERS.delete(token);
  }, ttl);
  
  BLACKLIST_TIMERS.set(token, timerId);
  
  console.log(`[Auth] Token已加入内存黑名单，${expiresInSeconds}秒后过期，当前数量: ${TOKEN_BLACKLIST_MEMORY.size}`);
};

/**
 * 将Token加入黑名单
 * @param {string} token - JWT Token
 * @param {number} expiresInSeconds - Token过期时间（秒）
 */
const blacklistToken = async (token, expiresInSeconds = 3600) => {
  try {
    // 存入Redis，TTL为Token剩余过期时间
    await redis.setex(`blacklist:${token}`, expiresInSeconds, '1');
    console.log(`[Auth] Token已加入Redis黑名单，${expiresInSeconds}秒后过期`);
  } catch (error) {
    console.error('[Auth] Redis加入黑名单失败，使用内存备份:', error.message);
    // Redis失败时存入内存
    addToMemoryBlacklist(token, expiresInSeconds);
  }
};

/**
 * 获取Token黑名单状态
 * @returns {Promise<Object>} - { redisCount: number, memoryCount: number }
 */
const getBlacklistStatus = async () => {
  try {
    const keys = await redis.keys('blacklist:*');
    return {
      redisCount: keys.length,
      memoryCount: TOKEN_BLACKLIST_MEMORY.size,
      totalCount: keys.length + TOKEN_BLACKLIST_MEMORY.size
    };
  } catch (error) {
    return {
      redisCount: 0,
      memoryCount: TOKEN_BLACKLIST_MEMORY.size,
      totalCount: TOKEN_BLACKLIST_MEMORY.size
    };
  }
};

/**
 * 主认证中间件
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '未提供认证令牌',
        code: 'NO_TOKEN'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '令牌格式错误，必须使用Bearer认证',
        code: 'INVALID_AUTH_FORMAT'
      });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim().length === 0) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '令牌不能为空',
        code: 'EMPTY_TOKEN'
      });
    }

    // 检查Token是否在黑名单中
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '令牌已失效',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'AuthenticationError',
          message: '访问令牌已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'AuthenticationError',
          message: '无效的访问令牌',
          code: 'INVALID_TOKEN'
        });
      }
      if (tokenError.name === 'NotBeforeError') {
        return res.status(401).json({ 
          error: 'AuthenticationError',
          message: '令牌尚未生效',
          code: 'TOKEN_NOT_ACTIVE'
        });
      }
      throw tokenError;
    }
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '令牌数据无效',
        code: 'INVALID_TOKEN_DATA'
      });
    }
    
    // 检查用户会话缓存
    let user = null;
    try {
      const cachedUser = await redis.hgetall(`session:${decoded.userId}`);
      if (cachedUser && cachedUser.id) {
        // 解析缓存的用户数据
        user = {
          id: cachedUser.id,
          email: cachedUser.email,
          username: cachedUser.username,
          role: cachedUser.role,
          avatarUrl: cachedUser.avatarUrl || null,
          isBanned: cachedUser.isBanned === 'true',
          createdAt: cachedUser.createdAt ? new Date(cachedUser.createdAt) : null
        };
      }
    } catch (error) {
      console.error('[Auth] 读取会话缓存失败:', error.message);
    }
    
    // 缓存未命中或解析失败，从数据库查询
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { 
          id: true, 
          email: true, 
          username: true,
          role: true,
          avatarUrl: true,
          isBanned: true,
          createdAt: true 
        },
      });

      if (user) {
        // 写入缓存，TTL 5分钟
        try {
          await redis.hset(`session:${user.id}`, 'id', user.id);
          await redis.hset(`session:${user.id}`, 'email', user.email);
          await redis.hset(`session:${user.id}`, 'username', user.username);
          await redis.hset(`session:${user.id}`, 'role', user.role);
          await redis.hset(`session:${user.id}`, 'avatarUrl', user.avatarUrl || '');
          await redis.hset(`session:${user.id}`, 'isBanned', String(user.isBanned));
          await redis.hset(`session:${user.id}`, 'createdAt', user.createdAt.toISOString());
          await redis.expire(`session:${user.id}`, 300);
        } catch (error) {
          console.error('[Auth] 写入会话缓存失败:', error.message);
        }
      }
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '用户不存在或已被删除',
        code: 'USER_NOT_FOUND'
      });
    }

    // 检查用户是否被封禁
    if (user.isBanned) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: '您的账户已被封禁，请联系管理员',
        code: 'ACCOUNT_BANNED'
      });
    }

    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('认证错误:', error.message, error.stack);
    return res.status(401).json({ 
      error: 'AuthenticationError',
      message: '认证失败，请重新登录',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim().length === 0) {
      req.user = null;
      return next();
    }

    // 检查Token是否在黑名单中
    if (await isTokenBlacklisted(token)) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      req.user = null;
      return next();
    }
    
    // 尝试从缓存获取用户信息
    let user = null;
    try {
      const cachedUser = await redis.hgetall(`session:${decoded.userId}`);
      if (cachedUser && cachedUser.id) {
        user = {
          id: cachedUser.id,
          email: cachedUser.email,
          username: cachedUser.username,
          role: cachedUser.role,
          avatarUrl: cachedUser.avatarUrl || null,
        };
      }
    } catch (error) {
      console.error('[Auth] 读取会话缓存失败:', error.message);
    }
    
    // 缓存未命中，从数据库查询
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { 
          id: true, 
          email: true, 
          username: true,
          role: true,
          avatarUrl: true,
        },
      });
    }

    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * 管理员权限检查中间件
 */
const adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'AuthenticationError',
        message: '未登录',
        code: 'NO_AUTH'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: '需要管理员权限',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('权限检查错误:', error.message);
    return res.status(500).json({
      error: 'ServerError',
      message: '权限检查失败',
    });
  }
};

/**
 * 清除用户会话缓存（用于用户信息更新时）
 * @param {string} userId - 用户ID
 */
const clearUserSessionCache = async (userId) => {
  try {
    await redis.del(`session:${userId}`);
    console.log(`[Auth] 用户 ${userId} 的会话缓存已清除`);
  } catch (error) {
    console.error(`[Auth] 清除用户 ${userId} 会话缓存失败:`, error.message);
  }
};

/**
 * 批量清除会话缓存
 * @param {string[]} userIds - 用户ID数组
 */
const clearUserSessionCaches = async (userIds) => {
  try {
    const keys = userIds.map(id => `session:${id}`);
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`[Auth] 已清除 ${keys.length} 个用户的会话缓存`);
    }
  } catch (error) {
    console.error('[Auth] 批量清除会话缓存失败:', error.message);
  }
};

module.exports = { 
  auth, 
  optionalAuth,
  adminOnly,
  blacklistToken,
  isTokenBlacklisted,
  getBlacklistStatus,
  clearUserSessionCache,
  clearUserSessionCaches,
};
