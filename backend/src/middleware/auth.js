const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/database');

const TOKEN_BLACKLIST = new Set();

const isTokenBlacklisted = (token) => {
  return TOKEN_BLACKLIST.has(token);
};

const blacklistToken = (token) => {
  TOKEN_BLACKLIST.add(token);
  setTimeout(() => {
    TOKEN_BLACKLIST.delete(token);
  }, 3600000);
};

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

    if (isTokenBlacklisted(token)) {
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
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        username: true,
        createdAt: true 
      },
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '用户不存在或已被删除',
        code: 'USER_NOT_FOUND'
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

    if (isTokenBlacklisted(token)) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      req.user = null;
      return next();
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        username: true 
      },
    });

    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { 
  auth, 
  optionalAuth,
  blacklistToken,
  isTokenBlacklisted
};