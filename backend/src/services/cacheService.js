/**
 * 缓存服务
 * 使用Redis替代数据库存储敏感状态数据
 * 替代原有的 Map 存储（verificationCodes, loginAttempts 等）
 * 
 * Redis Key设计：
 * - verify_code:${email} - 邮箱验证码
 * - captcha:${captchaId} - 图片验证码
 * - login_attempts:${identifier} - 登录尝试次数
 * - code_send:${identifier} - 验证码发送频率
 * - blacklist:${token} - Token黑名单
 * - rate_limit:${ip}:${endpoint} - API限流
 * - session:${userId} - 用户会话
 * - config:${key} - 系统配置
 * - hot_diaries - 热门日记列表
 */

const { redis } = require('../config/redis');

class CacheService {
  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {any|null} - 缓存值或null
   */
  async get(key) {
    try {
      const value = await redis.get(key);
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`[CacheService] get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值（会被JSON序列化）
   * @param {number} ttlSeconds - 过期时间（秒）
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redis.setex(key, ttlSeconds, valueStr);
      } else {
        await redis.set(key, valueStr);
      }
    } catch (error) {
      console.error(`[CacheService] set error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async del(key) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`[CacheService] del error for key ${key}:`, error.message);
      // 忽略不存在的错误
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[CacheService] exists error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * 原子递增
   * @param {string} key - 缓存键
   * @param {number} amount - 增量
   * @param {number} ttlSeconds - 过期时间（秒）
   * @returns {number} - 递增后的值
   */
  async incr(key, amount = 1, ttlSeconds = 3600) {
    try {
      const multi = redis.multi();
      multi.incrby(key, amount);
      multi.ttl(key);
      const results = await multi.exec();
      
      // 如果key是新创建的，设置过期时间
      if (results && results[1] && results[1][1] === -1) {
        await redis.expire(key, ttlSeconds);
      }
      
      return results[0][1];
    } catch (error) {
      console.error(`[CacheService] incr error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * 原子递减
   * @param {string} key - 缓存键
   * @param {number} amount - 减量
   * @param {number} ttlSeconds - 过期时间（秒）
   * @returns {number} - 递减后的值
   */
  async decr(key, amount = 1, ttlSeconds = 3600) {
    try {
      const multi = redis.multi();
      multi.decrby(key, amount);
      multi.ttl(key);
      const results = await multi.exec();
      
      // 如果key是新创建的，设置过期时间
      if (results && results[1] && results[1][1] === -1) {
        await redis.expire(key, ttlSeconds);
      }
      
      return results[0][1];
    } catch (error) {
      console.error(`[CacheService] decr error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * 获取剩余过期时间（秒）
   * @param {string} key - 缓存键
   * @returns {number} - 剩余秒数，-1表示不存在或没有过期时间，-2表示key不存在
   */
  async ttl(key) {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error(`[CacheService] ttl error for key ${key}:`, error.message);
      return -2;
    }
  }

  /**
   * 设置过期时间
   * @param {string} key - 缓存键
   * @param {number} ttlSeconds - 过期时间（秒）
   * @returns {boolean}
   */
  async expire(key, ttlSeconds) {
    try {
      const result = await redis.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error(`[CacheService] expire error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * 批量获取
   * @param {string[]} keys - 缓存键数组
   * @returns {Array|null} - 缓存值数组
   */
  async mget(keys) {
    try {
      if (!keys || keys.length === 0) {
        return [];
      }
      const values = await redis.mget(keys);
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      console.error(`[CacheService] mget error:`, error.message);
      return keys.map(() => null);
    }
  }

  /**
   * 批量设置
   * @param {Object} keyValues - 键值对对象
   * @param {number} ttlSeconds - 过期时间（秒）
   */
  async mset(keyValues, ttlSeconds = 3600) {
    try {
      const entries = Object.entries(keyValues).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      ]).flat();
      
      await redis.mset(entries);
      
      // 为每个key设置过期时间
      if (ttlSeconds > 0) {
        const pipeline = redis.pipeline();
        Object.keys(keyValues).forEach(key => {
          pipeline.expire(key, ttlSeconds);
        });
        await pipeline.exec();
      }
    } catch (error) {
      console.error(`[CacheService] mset error:`, error.message);
      throw error;
    }
  }

  /**
   * 获取并删除（原子操作）
   * @param {string} key - 缓存键
   * @returns {any|null}
   */
  async getDel(key) {
    try {
      const value = await redis.getdel(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`[CacheService] getDel error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 设置哈希字段
   * @param {string} key - 缓存键
   * @param {string} field - 字段名
   * @param {any} value - 字段值
   */
  async hset(key, field, value) {
    try {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.hset(key, field, valueStr);
    } catch (error) {
      console.error(`[CacheService] hset error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * 获取哈希字段
   * @param {string} key - 缓存键
   * @param {string} field - 字段名
   * @returns {any|null}
   */
  async hget(key, field) {
    try {
      const value = await redis.hget(key, field);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`[CacheService] hget error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 获取所有哈希字段
   * @param {string} key - 缓存键
   * @returns {Object|null}
   */
  async hgetall(key) {
    try {
      const result = await redis.hgetall(key);
      if (!result || Object.keys(result).length === 0) {
        return null;
      }
      const parsed = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      console.error(`[CacheService] hgetall error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 删除哈希字段
   * @param {string} key - 缓存键
   * @param {string} field - 字段名
   */
  async hdel(key, field) {
    try {
      await redis.hdel(key, field);
    } catch (error) {
      console.error(`[CacheService] hdel error for key ${key}:`, error.message);
    }
  }

  /**
   * 列表-左侧推入
   * @param {string} key - 缓存键
   * @param {any} value - 值
   * @param {number} maxLength - 最大长度（超出时从右侧弹出）
   */
  async lpush(key, value, maxLength = null) {
    try {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.lpush(key, valueStr);
      if (maxLength) {
        await redis.ltrim(key, 0, maxLength - 1);
      }
    } catch (error) {
      console.error(`[CacheService] lpush error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * 列表-右侧推入
   * @param {string} key - 缓存键
   * @param {any} value - 值
   * @param {number} maxLength - 最大长度（超出时从左侧弹出）
   */
  async rpush(key, value, maxLength = null) {
    try {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.rpush(key, valueStr);
      if (maxLength) {
        await redis.ltrim(key, -maxLength, -1);
      }
    } catch (error) {
      console.error(`[CacheService] rpush error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * 列表-获取范围
   * @param {string} key - 缓存键
   * @param {number} start - 开始索引
   * @param {number} stop - 结束索引（-1表示到最后）
   * @returns {Array}
   */
  async lrange(key, start = 0, stop = -1) {
    try {
      const values = await redis.lrange(key, start, stop);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      console.error(`[CacheService] lrange error for key ${key}:`, error.message);
      return [];
    }
  }

  /**
   * 列表-获取长度
   * @param {string} key - 缓存键
   * @returns {number}
   */
  async llen(key) {
    try {
      return await redis.llen(key);
    } catch (error) {
      console.error(`[CacheService] llen error for key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * 清理所有缓存（危险操作）
   * @param {string} pattern - 匹配模式，默认所有
   * @returns {number} - 删除的key数量
   */
  async flush(pattern = '*') {
    try {
      if (pattern === '*') {
        await redis.flushdb();
        return -1;
      } else {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(keys);
        }
        return keys.length;
      }
    } catch (error) {
      console.error(`[CacheService] flush error:`, error.message);
      throw error;
    }
  }

  /**
   * 按模式扫描key
   * @param {string} pattern - 匹配模式
   * @param {number} count - 每次扫描数量
   * @returns {string[]} - key列表
   */
  async scan(pattern, count = 100) {
    try {
      const keys = [];
      let cursor = '0';
      do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');
      return keys;
    } catch (error) {
      console.error(`[CacheService] scan error:`, error.message);
      return [];
    }
  }

  /**
   * 获取Redis连接状态
   * @returns {string}
   */
  getStatus() {
    return redis.status;
  }
}

// 导出单例实例
module.exports = new CacheService();