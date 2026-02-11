const jwt = require('jsonwebtoken');

const validateSecrets = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET 必须至少32个字符');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET 必须至少32个字符');
  }
};

const generateAccessToken = (userId, additionalPayload = {}) => {
  validateSecrets();
  const payload = {
    userId,
    type: 'access',
    ...additionalPayload,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: 'mio-diary-api',
    audience: 'mio-diary-users',
  });
};

const generateRefreshToken = (userId, additionalPayload = {}) => {
  validateSecrets();
  const payload = {
    userId,
    type: 'refresh',
    ...additionalPayload,
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'mio-diary-api',
    audience: 'mio-diary-users',
  });
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'mio-diary-api',
      audience: 'mio-diary-users',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.message = '访问令牌已过期';
    } else if (error.name === 'JsonWebTokenError') {
      error.message = '无效的访问令牌';
    } else if (error.name === 'NotBeforeError') {
      error.message = '访问令牌尚未生效';
    }
    throw error;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'mio-diary-api',
      audience: 'mio-diary-users',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.message = '刷新令牌已过期';
    } else if (error.name === 'JsonWebTokenError') {
      error.message = '无效的刷新令牌';
    } else if (error.name === 'NotBeforeError') {
      error.message = '刷新令牌尚未生效';
    }
    throw error;
  }
};

const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    throw new Error('无法解码令牌');
  }
};

const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.payload || !decoded.payload.exp) {
      return null;
    }
    return new Date(decoded.payload.exp * 1000);
  } catch (error) {
    return null;
  }
};

const isTokenExpired = (token) => {
  try {
    const expiration = getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    return new Date() > expiration;
  } catch (error) {
    return true;
  }
};

const getTimeUntilExpiration = (token) => {
  try {
    const expiration = getTokenExpiration(token);
    if (!expiration) {
      return 0;
    }
    const now = new Date();
    const diff = expiration - now;
    return Math.max(0, diff);
  } catch (error) {
    return 0;
  }
};

const shouldRefreshToken = (token, thresholdMinutes = 5) => {
  try {
    const timeUntilExpiration = getTimeUntilExpiration(token);
    const thresholdMs = thresholdMinutes * 60 * 1000;
    return timeUntilExpiration < thresholdMs;
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  getTimeUntilExpiration,
  shouldRefreshToken,
  validateSecrets,
};