/**
 * 日志工具 - 根据环境控制日志级别
 * 生产环境只保留 error 和 warn 级别
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * 日志级别优先级：debug < info < warn < error
 * 生产环境只显示 warn 和 error
 */
const logger = {
  /**
   * 调试日志 - 仅在非生产环境显示
   */
  debug: (...args) => {
    if (!isProduction) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * 信息日志 - 仅在非生产环境显示
   */
  info: (...args) => {
    if (!isProduction) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * 警告日志 - 所有环境都显示
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * 错误日志 - 所有环境都显示
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * 请求日志中间件 - 生产环境简化，开发环境详细
   */
  requestLogger: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      
      // 生产环境只记录错误请求（状态码 >= 400）
      if (isProduction) {
        if (statusCode >= 400) {
          console.warn(`[REQUEST] ${req.method} ${req.path} ${statusCode} - ${duration}ms - ${req.ip || req.connection.remoteAddress}`);
        }
        // 正常请求不记录，减少日志量
        return;
      }
      
      // 开发环境：详细记录
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path} ${statusCode} - ${duration}ms - ${req.ip || req.connection.remoteAddress}`);
    });
    
    next();
  }
};

module.exports = logger;
