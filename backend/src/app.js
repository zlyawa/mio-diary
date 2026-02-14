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
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// CORS 配置
app.use(cors({
  origin: true, // 允许所有来源，方便部署
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

app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress
    };
    console.log(`[${logData.timestamp}] ${logData.method} ${logData.path} ${logData.statusCode} - ${logData.duration} - ${logData.ip}`);
  });
  
  next();
});

app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (isProduction && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100;

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const requestData = requestCounts.get(ip);
  
  if (now > requestData.resetTime) {
    requestData.count = 1;
    requestData.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (requestData.count >= RATE_LIMIT_MAX) {
    const resetTime = Math.ceil((requestData.resetTime - now) / 1000);
    return res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      resetIn: `${resetTime}秒`
    });
  }
  
  requestData.count++;
  next();
});

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Mio的日记本 API运行正常',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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