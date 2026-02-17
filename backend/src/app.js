const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const diaryRoutes = require('./routes/diaries');
const uploadRoutes = require('./routes/upload');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const configRoutes = require('./routes/config');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');
const categoryRoutes = require('./routes/categories');
const commentRoutes = require('./routes/comments');
const interactionRoutes = require('./routes/interactions');
const { errorHandler } = require('./middleware/errorHandler');
const { maintenanceMiddleware } = require('./middleware/maintenance');
const { ipBlacklist } = require('./middleware/ipBlacklist');
const logger = require('./utils/logger');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// CORS 配置 - 根据环境区分
const getCorsOrigins = () => {
  if (isProduction) {
    // 生产环境：严格限制，从环境变量读取允许的域名
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [];
    return allowedOrigins;
  } else {
    // 开发环境：允许本地和局域网访问
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,  // 局域网IP
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // 私有IP段
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/, // 172.16-31.x.x
    ];
  }
};

const corsOrigins = getCorsOrigins();

app.use(cors({
  origin: function (origin, callback) {
    // 允许无origin的请求（如Postman、移动端App）
    if (!origin) {
      return callback(null, true);
    }

    // 检查是否在允许列表中
    const isAllowed = corsOrigins.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return pattern === origin;
    });

    if (isAllowed || !isProduction) {
      callback(null, true);
    } else {
      console.log(`[CORS] 拒绝访问: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id', 'X-Request-ID'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Captcha-Id'],
  maxAge: 86400,
  optionsSuccessStatus: 204
}));

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf.length > 10 * 1024 * 1024) {
      throw new Error('请求体过大');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件 - 生产环境只记录错误请求
app.use(logger.requestLogger);

app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // 添加 CSP 头
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  
  if (isProduction && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});

// IP黑名单中间件 - 在安全头之后，请求限流之前
app.use(ipBlacklist);

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1分钟窗口
const RATE_LIMIT_MAX = 300; // 每分钟最多300次请求（提高阈值）
const RATE_LIMIT_WHITELIST = [
  '/api/health',
  '/uploads',
]; // 白名单路径

app.use((req, res, next) => {
  // 获取真实IP（考虑代理）
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.headers['x-real-ip'] || 
             req.ip || 
             req.connection.remoteAddress;
  
  // 白名单路径跳过限流
  if (RATE_LIMIT_WHITELIST.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  const now = Date.now();
  const key = ip;
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const requestData = requestCounts.get(key);
  
  // 如果窗口已过期，重置计数
  if (now > requestData.resetTime) {
    requestData.count = 1;
    requestData.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  // 检查是否超过限制
  if (requestData.count >= RATE_LIMIT_MAX) {
    const resetTime = Math.ceil((requestData.resetTime - now) / 1000);
    console.log(`[RateLimit] IP ${ip} 被限流，${resetTime}秒后重置，当前计数: ${requestData.count}`);
    return res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      resetIn: `${resetTime}秒`
    });
  }
  
  requestData.count++;
  next();
});

// 定期清理过期的限流记录
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[RateLimit] 清理了 ${cleaned} 个过期限流记录`);
  }
}, RATE_LIMIT_WINDOW);

// 维护模式中间件 - 必须在路由之前注册
app.use(maintenanceMiddleware);

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: isProduction ? '7d' : '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public');
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/interactions', interactionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Mio的日记本 API运行正常',
    version: '2.0.2',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 添加统计API文档端点
app.get('/api/stats/docs', (req, res) => {
  res.json({
    name: '写作统计 API',
    version: '1.0.0',
    description: '提供写作数据统计分析功能',
    endpoints: {
      heatmap: {
        path: '/api/stats/heatmap',
        method: 'GET',
        description: '获取写作热力图数据（过去一年）',
        response: '{ data: [{ date, count }], stats: { totalDays, maxCount, totalDiaries } }'
      },
      moodTrend: {
        path: '/api/stats/mood-trend',
        method: 'GET',
        description: '获取心情趋势分析（按月统计）',
        response: '{ months, moods: { happy: [...], sad: [...], ... }, moodLabels, moodColors }'
      },
      wordCloud: {
        path: '/api/stats/word-cloud',
        method: 'GET',
        description: '获取词云数据（高频词汇）',
        response: '{ words: [{ text, count }] }'
      },
      writingHabits: {
        path: '/api/stats/writing-habits',
        method: 'GET',
        description: '获取写作习惯分析（24小时分布）',
        response: '{ hours, counts, stats: { totalDiaries, peakHours, timeRanges } }'
      },
      all: {
        path: '/api/stats/all',
        method: 'GET',
        description: '获取所有统计数据',
        response: '{ heatmap, moodTrend, wordCloud, writingHabits }'
      }
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Mio的日记本 API',
    version: '2.0.0',
    description: '个人日记网站后端API',
    endpoints: {
      auth: '/api/auth',
      diaries: '/api/diaries',
      upload: '/api/upload',
      profile: '/api/profile',
      admin: '/api/admin',
      config: '/api/config',
      health: '/api/health'
    },
    documentation: 'https://github.com/mio-diary/docs',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `找不到路径: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

module.exports = app;