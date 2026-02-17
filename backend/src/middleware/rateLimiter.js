/**
 * 登录限流中间件
 * 基于数据库持久化存储，防止暴力破解
 */

const rateLimiter = require('../services/rateLimiter');

/**
 * 登录接口限流中间件
 * 使用方式: router.post('/login', loginRateLimiter, login)
 */
const loginRateLimiter = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(); // 如果没有邮箱，让后续验证处理
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // 检查登录限流
    const check = await rateLimiter.checkLoginAttempts(sanitizedEmail, {
      maxAttempts: 5,
      lockoutDuration: 15 * 60, // 15分钟
    });

    if (!check.allowed) {
      return res.status(429).json({
        error: 'TooManyAttempts',
        message: check.message,
        remainingTime: check.remainingTime,
      });
    }

    // 将剩余尝试次数附加到请求对象，供后续使用
    req.loginAttemptsInfo = check;
    next();
  } catch (error) {
    console.error('[登录限流中间件错误]', error.message);
    next(); // 出错时不阻断请求
  }
};

/**
 * IP级别的限流中间件（更严格）
 * 防止使用多个账号进行分布式爆破
 */
const ipRateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;

    // 使用IP作为标识符
    const check = await rateLimiter.checkLoginAttempts(`ip:${ip}`, {
      maxAttempts: 20, // IP级别更宽松，但跨账号累计
      lockoutDuration: 30 * 60, // 30分钟
    });

    if (!check.allowed) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: '请求过于频繁，请稍后再试',
        remainingTime: check.remainingTime,
      });
    }

    next();
  } catch (error) {
    console.error('[IP限流中间件错误]', error.message);
    next();
  }
};

/**
 * 验证码发送限流中间件
 */
const codeSendRateLimiter = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next();
    }

    const sanitizedEmail = email.toLowerCase().trim();

    const check = await rateLimiter.checkCodeSendRate(sanitizedEmail, {
      maxAttempts: 5,
      cooldownSeconds: 60, // 60秒冷却
    });

    if (!check.allowed) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: check.message,
        remainingTime: check.remainingTime,
      });
    }

    next();
  } catch (error) {
    console.error('[验证码限流中间件错误]', error.message);
    next();
  }
};

module.exports = {
  loginRateLimiter,
  ipRateLimiter,
  codeSendRateLimiter,
};
