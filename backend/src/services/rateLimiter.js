/**
 * 限流服务
 * 使用Redis实现分布式限流，替代内存中的 Map 存储
 * 
 * Redis Key设计：
 * - login_attempts:${identifier} - 登录尝试记录
 * - code_send:${identifier} - 验证码发送频率
 * - rate_limit:${ip}:${endpoint} - API限流
 */

const { redis } = require('../config/redis');

class RateLimiter {
  /**
   * 检查通用限流
   * @param {string} key - 限流key
   * @param {number} maxAttempts - 最大尝试次数
   * @param {number} windowSeconds - 时间窗口（秒）
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number, current: number }
   */
  async checkLimit(key, maxAttempts = 5, windowSeconds = 900) {
    try {
      const current = await redis.incr(key);
      
      // 如果是第一次请求，设置过期时间
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      // 获取剩余过期时间
      const ttl = await redis.ttl(key);
      
      return {
        allowed: current <= maxAttempts,
        remaining: Math.max(0, maxAttempts - current),
        resetTime: ttl > 0 ? ttl : windowSeconds,
        current
      };
    } catch (error) {
      console.error(`[RateLimiter] checkLimit error for key ${key}:`, error.message);
      // 出错时允许请求通过
      return {
        allowed: true,
        remaining: maxAttempts,
        resetTime: windowSeconds,
        current: 0
      };
    }
  }

  /**
   * 检查登录限流
   * @param {string} identifier - 标识符（邮箱或IP）
   * @param {Object} options - 配置选项
   * @param {number} options.maxAttempts - 最大尝试次数
   * @param {number} options.lockoutDuration - 锁定时长（秒）
   * @returns {Object} - { allowed: boolean, remainingAttempts: number, remainingTime: number|null, message: string|null }
   */
  async checkLoginAttempts(identifier, options = {}) {
    const {
      maxAttempts = 5,
      lockoutDuration = 15 * 60, // 15分钟
    } = options;

    const key = `login_attempts:${identifier}`;
    
    try {
      const data = await redis.get(key);
      
      if (!data) {
        return {
          allowed: true,
          remainingAttempts: maxAttempts,
          remainingTime: null,
          message: null,
        };
      }

      const attempts = JSON.parse(data);
      const now = Date.now();

      if (now > attempts.lockUntil) {
        // 锁定时间已过，清除记录
        await redis.del(key);
        return {
          allowed: true,
          remainingAttempts: maxAttempts,
          remainingTime: null,
          message: null,
        };
      }

      if (attempts.count >= maxAttempts) {
        const remainingTime = Math.ceil((attempts.lockUntil - now) / 1000);
        return {
          allowed: false,
          remainingAttempts: 0,
          remainingTime,
          message: `账户已锁定，请${Math.ceil(remainingTime / 60)}分钟后再试`,
        };
      }

      return {
        allowed: true,
        remainingAttempts: maxAttempts - attempts.count,
        remainingTime: null,
        message: null,
      };
    } catch (error) {
      console.error(`[RateLimiter] checkLoginAttempts error for ${identifier}:`, error.message);
      // 出错时允许请求通过
      return {
        allowed: true,
        remainingAttempts: maxAttempts,
        remainingTime: null,
        message: null,
      };
    }
  }

  /**
   * 记录登录失败
   * @param {string} identifier - 标识符
   * @param {Object} options - 配置选项
   */
  async recordFailedLogin(identifier, options = {}) {
    const {
      maxAttempts = 5,
      lockoutDuration = 15 * 60,
    } = options;

    const key = `login_attempts:${identifier}`;
    const now = Date.now();
    
    try {
      const data = await redis.get(key);
      const attempts = data ? JSON.parse(data) : { count: 0, lockUntil: 0 };

      attempts.count++;

      if (attempts.count >= maxAttempts) {
        attempts.lockUntil = now + lockoutDuration * 1000;
      }

      // 设置缓存，过期时间比锁定时间稍长
      const ttl = attempts.lockUntil > now
        ? Math.ceil((attempts.lockUntil - now) / 1000) + 60
        : lockoutDuration;

      await redis.setex(key, ttl, JSON.stringify(attempts));
      return attempts;
    } catch (error) {
      console.error(`[RateLimiter] recordFailedLogin error for ${identifier}:`, error.message);
      return { count: 0, lockUntil: 0 };
    }
  }

  /**
   * 清除登录尝试记录（登录成功时调用）
   * @param {string} identifier - 标识符
   */
  async clearLoginAttempts(identifier) {
    const key = `login_attempts:${identifier}`;
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`[RateLimiter] clearLoginAttempts error for ${identifier}:`, error.message);
    }
  }

  /**
   * 检查验证码发送频率
   * @param {string} identifier - 标识符（邮箱）
   * @param {Object} options - 配置选项
   * @returns {Object} - { allowed: boolean, remainingTime: number|null, message: string|null }
   */
  async checkCodeSendRate(identifier, options = {}) {
    const {
      maxAttempts = 5,
      cooldownSeconds = 60,
    } = options;

    const key = `code_send:${identifier}`;
    
    try {
      const data = await redis.get(key);
      
      if (!data) {
        return {
          allowed: true,
          remainingTime: null,
          message: null,
        };
      }

      const record = JSON.parse(data);
      const now = Date.now();

      // 检查冷却时间
      if (now - record.lastSent < cooldownSeconds * 1000) {
        const remainingTime = Math.ceil((cooldownSeconds * 1000 - (now - record.lastSent)) / 1000);
        return {
          allowed: false,
          remainingTime,
          message: `请${remainingTime}秒后再试`,
        };
      }

      // 检查最大发送次数
      if (record.count >= maxAttempts) {
        return {
          allowed: false,
          remainingTime: null,
          message: '发送次数过多，请稍后再试',
        };
      }

      return {
        allowed: true,
        remainingTime: null,
        message: null,
      };
    } catch (error) {
      console.error(`[RateLimiter] checkCodeSendRate error for ${identifier}:`, error.message);
      return {
        allowed: true,
        remainingTime: null,
        message: null,
      };
    }
  }

  /**
   * 记录验证码发送
   * @param {string} identifier - 标识符
   * @param {Object} options - 配置选项
   */
  async recordCodeSend(identifier, options = {}) {
    const {
      maxAttempts = 5,
      windowSeconds = 3600, // 1小时窗口
    } = options;

    const key = `code_send:${identifier}`;
    const now = Date.now();
    
    try {
      const data = await redis.get(key);
      const record = data ? JSON.parse(data) : { count: 0, lastSent: 0 };

      record.count++;
      record.lastSent = now;

      await redis.setex(key, windowSeconds, JSON.stringify(record));
      return record;
    } catch (error) {
      console.error(`[RateLimiter] recordCodeSend error for ${identifier}:`, error.message);
      return { count: 0, lastSent: 0 };
    }
  }

  /**
   * 检查API限流（基于IP和端点）
   * @param {string} ip - 客户端IP
   * @param {string} endpoint - API端点
   * @param {Object} options - 配置选项
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  async checkApiLimit(ip, endpoint, options = {}) {
    const {
      maxRequests = 100,
      windowSeconds = 60, // 1分钟
    } = options;

    const key = `rate_limit:${ip}:${endpoint}`;
    return this.checkLimit(key, maxRequests, windowSeconds);
  }

  /**
   * 检查滑动窗口限流
   * @param {string} key - 限流key
   * @param {number} maxAttempts - 最大尝试次数
   * @param {number} windowSeconds - 时间窗口（秒）
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  async checkSlidingWindow(key, maxAttempts = 5, windowSeconds = 60) {
    try {
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;
      
      // 使用Redis Sorted Set实现滑动窗口
      const multi = redis.multi();
      
      // 移除窗口外的记录
      multi.zremrangebyscore(key, 0, windowStart);
      
      // 获取当前窗口内的记录数
      multi.zcard(key);
      
      // 添加当前请求记录
      multi.zadd(key, now, `${now}-${Math.random()}`);
      
      // 设置key过期时间
      multi.pexpire(key, windowSeconds * 1000);
      
      const results = await multi.exec();
      const currentCount = results[1][1];
      
      return {
        allowed: currentCount < maxAttempts,
        remaining: Math.max(0, maxAttempts - currentCount - 1),
        resetTime: windowSeconds,
        current: currentCount + 1
      };
    } catch (error) {
      console.error(`[RateLimiter] checkSlidingWindow error for key ${key}:`, error.message);
      return {
        allowed: true,
        remaining: maxAttempts,
        resetTime: windowSeconds,
        current: 0
      };
    }
  }

  /**
   * 获取限流状态
   * @param {string} key - 限流key
   * @returns {Object} - { current: number, ttl: number }
   */
  async getLimitStatus(key) {
    try {
      const multi = redis.multi();
      multi.get(key);
      multi.ttl(key);
      const results = await multi.exec();
      
      return {
        current: results[0][1] ? parseInt(results[0][1]) : 0,
        ttl: results[1][1]
      };
    } catch (error) {
      console.error(`[RateLimiter] getLimitStatus error for key ${key}:`, error.message);
      return { current: 0, ttl: -1 };
    }
  }

  /**
   * 重置限流
   * @param {string} key - 限流key
   */
  async resetLimit(key) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`[RateLimiter] resetLimit error for key ${key}:`, error.message);
    }
  }
}

// 导出单例实例
module.exports = new RateLimiter();