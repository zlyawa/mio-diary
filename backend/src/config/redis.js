/**
 * Redis连接配置
 * 用于缓存、限流、Token黑名单等
 */

const Redis = require('ioredis');

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  // 连接重试策略
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[Redis] 重连尝试 ${times}，延迟 ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  // 连接超时
  connectTimeout: 10000,
  // 是否启用离线队列
  enableOfflineQueue: true,
  // 是否启用就绪检查
  enableReadyCheck: true,
};

// 创建Redis实例
const redis = new Redis(redisConfig);

// 连接事件监听
redis.on('connect', () => {
  console.log('[Redis] 正在连接...');
});

redis.on('ready', () => {
  console.log('[Redis] 连接成功，服务就绪');
});

redis.on('error', (err) => {
  console.error('[Redis] 连接错误:', err.message);
});

redis.on('close', () => {
  console.log('[Redis] 连接已关闭');
});

redis.on('reconnecting', (delay) => {
  console.log(`[Redis] 正在重连，延迟 ${delay}ms`);
});

redis.on('end', () => {
  console.log('[Redis] 连接已结束');
});

/**
 * 检查Redis连接状态
 * @returns {boolean}
 */
const isConnected = () => {
  return redis.status === 'ready';
};

/**
 * 健康检查
 * @returns {Promise<boolean>}
 */
const healthCheck = async () => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('[Redis] 健康检查失败:', error.message);
    return false;
  }
};

/**
 * 优雅关闭连接
 */
const closeConnection = async () => {
  console.log('[Redis] 正在关闭连接...');
  await redis.quit();
  console.log('[Redis] 连接已关闭');
};

module.exports = {
  redis,
  isConnected,
  healthCheck,
  closeConnection,
};
