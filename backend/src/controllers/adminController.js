const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const { sendEmail, verifySMTPConfig } = require('../utils/emailService');
const { sendReviewNotification, sendAccountStatusNotification, sendPasswordResetNotification } = require('../utils/notification');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const { successResponse, errorResponse, validationError, notFoundError } = require('../utils/response');
const { clearUserSessionCache } = require('../middleware/auth');

// 缓存键常量
const CACHE_KEYS = {
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_CONFIG_HASH: 'system:config:hash',
  HEALTH_STATUS: 'system:health',
  ANNOUNCEMENTS: 'system:announcements',
  UPLOAD_CONFIG: 'system:upload_config',
};

// 默认配置
const DEFAULT_CONFIG = {
  siteName: 'Mio日记',
  siteDescription: '',
  siteIcon: '',
  siteIco: '',
  loginBg: '',
  registerBg: '',
  forgotPasswordBg: '',
  enableEmailVerify: false,
  enableUserReview: false,
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
  },
  // 内容安全配置
  enableContentFilter: false,
  sensitiveWords: ['暴力', '色情', '政治'],
  maxImageSize: 10,
  maxDiaryLength: 50000,
  allowedImageTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  enableIpBlacklist: false,
  ipBlacklist: [],
  // 外观配置
  primaryColor: 'indigo',
  defaultTheme: 'auto',
  showDiaryCount: false,
  enableHeatmap: false,
  itemsPerPage: 20,
  enableEmojiPicker: false,
  // 功能配置
  enableShare: false,
  enableLike: false,
  enableFavorite: false,
  enableStatistics: false,
  maintenanceMode: false,
  maintenanceMessage: '系统正在维护中，请稍后再试...',
  // 评论配置
  enableComment: true,
  enableCommentReview: false,
  allowGuestComment: false,
  commentMaxLength: 1000,
  commentMinLength: 2,
  commentCooldown: 30,
  enableCommentNotification: false,
  // 用户注册配置
  allowRegister: true,
  requireEmailVerify: false,
  defaultUserRole: 'user',
  registerRequireInvite: false,
  maxUsernameLength: 16,
  minPasswordLength: 8,
  enableCaptcha: false,
  // AI审核配置
  aiModerationEnabled: false,
  zhipuApiKey: '',
  zhipuModel: 'glm-4-flash',
  aiModerationThreshold: 'medium',
  aiModerationPrompt: '你是一个内容审核助手。请审核以下内容是否包含违规信息（如暴力、色情、政治敏感、仇恨言论、广告垃圾信息等）。\n\n请按以下JSON格式返回结果：\n{\n  "approved": true/false,\n  "reason": "原因说明",\n  "category": "违规类别"\n}\n\n只返回JSON，不要其他内容。',
};

// 敏感配置项（需要加密存储）
const SENSITIVE_KEYS = ['smtp.pass', 'zhipuApiKey', 'emailPassword', 'apiSecret'];

// 配置验证规则
const CONFIG_VALIDATION = {
  'smtp.port': {
    type: 'number',
    min: 1,
    max: 65535,
    message: 'SMTP端口必须在1-65535之间',
  },
  'minPasswordLength': {
    type: 'number',
    min: 6,
    max: 32,
    message: '密码最小长度必须在6-32之间',
  },
  'maxUsernameLength': {
    type: 'number',
    min: 3,
    max: 32,
    message: '用户名最大长度必须在3-32之间',
  },
  'maxImageSize': {
    type: 'number',
    min: 1,
    max: 100,
    message: '图片大小限制必须在1-100MB之间',
  },
  'maxDiaryLength': {
    type: 'number',
    min: 1000,
    max: 200000,
    message: '日记长度限制必须在1000-200000字符之间',
  },
  'itemsPerPage': {
    type: 'number',
    min: 5,
    max: 100,
    message: '每页条数必须在5-100之间',
  },
  'commentMaxLength': {
    type: 'number',
    min: 10,
    max: 5000,
    message: '评论最大长度必须在10-5000之间',
  },
  'commentMinLength': {
    type: 'number',
    min: 1,
    max: 50,
    message: '评论最小长度必须在1-50之间',
  },
  'commentCooldown': {
    type: 'number',
    min: 0,
    max: 3600,
    message: '评论冷却时间必须在0-3600秒之间',
  },
  'primaryColor': {
    type: 'enum',
    values: ['indigo', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'gray'],
    message: '主题颜色无效',
  },
  'defaultTheme': {
    type: 'enum',
    values: ['light', 'dark', 'auto'],
    message: '默认主题必须是 light、dark 或 auto',
  },
  'defaultUserRole': {
    type: 'enum',
    values: ['user', 'admin'],
    message: '默认用户角色必须是 user 或 admin',
  },
  'aiModerationThreshold': {
    type: 'enum',
    values: ['low', 'medium', 'high'],
    message: 'AI审核阈值必须是 low、medium 或 high',
  },
};

// 加密密钥（必须通过环境变量设置）
// 注意：生产环境必须设置 CONFIG_ENCRYPTION_KEY 和 CONFIG_ENCRYPTION_IV 环境变量
let ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY;
let ENCRYPTION_IV = process.env.CONFIG_ENCRYPTION_IV;

// 验证加密密钥配置
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CONFIG_ENCRYPTION_KEY 环境变量必须设置且至少32个字符');
  }
  // 开发环境使用默认值（与 emailService.js 保持一致）
  logger.warn('[安全警告] CONFIG_ENCRYPTION_KEY 未设置，使用默认值');
  ENCRYPTION_KEY = 'MioDiary2026SecretKey32Chars!!';
}

if (!ENCRYPTION_IV || ENCRYPTION_IV.length < 16) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CONFIG_ENCRYPTION_IV 环境变量必须设置且至少16个字符');
  }
  logger.warn('[安全警告] CONFIG_ENCRYPTION_IV 未设置，使用默认值');
  ENCRYPTION_IV = 'MioDiaryIV16!!';
}

/**
 * 加密敏感数据
 * @param {string} text - 要加密的文本
 * @returns {string} - 加密后的文本（base64）
 */
const encryptSensitiveData = (text) => {
  if (!text) return text;
  // 如果已经是加密格式，跳过
  if (typeof text === 'string' && text.startsWith('enc:')) {
    return text;
  }
  try {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      Buffer.from(ENCRYPTION_IV.padEnd(16).slice(0, 16))
    );
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `enc:${encrypted}`;
  } catch (error) {
    logger.error('[加密失败]', error.message);
    return text;
  }
};

/**
 * 解密敏感数据
 * @param {string} encryptedText - 加密后的文本
 * @returns {string} - 解密后的文本
 */
const decryptSensitiveData = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!encryptedText.startsWith('enc:')) return encryptedText;
  try {
    const encrypted = encryptedText.slice(4);
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      Buffer.from(ENCRYPTION_IV.padEnd(16).slice(0, 16))
    );
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('[解密失败]', error.message);
    return encryptedText;
  }
};

/**
 * 获取嵌套对象值
 * @param {Object} obj - 对象
 * @param {string} path - 路径（如 'smtp.port'）
 * @returns {*} - 值
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * 验证配置值
 * @param {string} key - 配置键
 * @param {*} value - 配置值
 * @returns {Object} - 验证结果
 */
const validateConfigValue = (key, value) => {
  const rule = CONFIG_VALIDATION[key];
  if (!rule) return { valid: true };

  if (rule.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, message: rule.message };
    }
    if (rule.min !== undefined && num < rule.min) {
      return { valid: false, message: rule.message };
    }
    if (rule.max !== undefined && num > rule.max) {
      return { valid: false, message: rule.message };
    }
  }

  if (rule.type === 'enum' && !rule.values.includes(value)) {
    return { valid: false, message: rule.message };
  }

  return { valid: true };
};

/**
 * 验证批量配置
 * @param {Object} config - 配置对象
 * @returns {Object} - 验证结果
 */
const validateConfig = (config) => {
  const errors = [];

  for (const [key, value] of Object.entries(config)) {
    const result = validateConfigValue(key, value);
    if (!result.valid) {
      errors.push({ key, message: result.message });
    }

    // 验证嵌套配置（如 smtp.port）
    if (typeof value === 'object' && value !== null) {
      for (const [subKey, subValue] of Object.entries(value)) {
        const fullKey = `${key}.${subKey}`;
        const subResult = validateConfigValue(fullKey, subValue);
        if (!subResult.valid) {
          errors.push({ key: fullKey, message: subResult.message });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ==================== 原有控制器函数 ====================

// 获取仪表盘统计数据
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    // 并行获取所有统计数据
    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeUsersToday,
      totalDiaries,
      diariesToday,
      diariesWeek,
      diariesMonth,
      pendingDiaries,
      totalComments,
      commentsToday,
      pendingComments,
      totalLikes,
      totalFavorites,
      totalShares,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.user.count({ where: { updatedAt: { gte: today } } }),
      prisma.diary.count({ where: { status: 'approved' } }),
      prisma.diary.count({ where: { status: 'approved', createdAt: { gte: today } } }),
      prisma.diary.count({ where: { status: 'approved', createdAt: { gte: weekAgo } } }),
      prisma.diary.count({ where: { status: 'approved', createdAt: { gte: monthAgo } } }),
      prisma.diary.count({ where: { status: 'pending' } }),
      prisma.comment.count({ where: { status: 'approved' } }),
      prisma.comment.count({ where: { status: 'approved', createdAt: { gte: today } } }),
      prisma.comment.count({ where: { status: 'pending' } }),
      prisma.like.count(),
      prisma.favorite.count(),
      prisma.shareLink.count(),
    ]);

    // 获取过去7天的趋势数据
    const trendDates = [];
    const userTrends = [];
    const diaryTrends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      trendDates.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));

      const [dayUsers, dayDiaries] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
        prisma.diary.count({ where: { status: 'approved', createdAt: { gte: date, lt: nextDate } } }),
      ]);
      userTrends.push(dayUsers);
      diaryTrends.push(dayDiaries);
    }

    // 系统状态
    const os = require('os');
    const uptime = process.uptime();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // 数据库大小估算
    const dbPath = require('path').join(__dirname, '../../prisma/dev.db');
    let dbSize = '0 MB';
    try {
      const fs = require('fs');
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSize = (stats.size / 1024 / 1024).toFixed(2) + ' MB';
      }
    } catch (e) {
      // 忽略错误
    }

    // 获取最近注册的用户
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    // 获取最近的日记
    const recentDiaries = await prisma.diary.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      stats: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersWeek,
          newThisMonth: newUsersMonth,
          activeToday: activeUsersToday,
        },
        diaries: {
          total: totalDiaries,
          publishedToday: diariesToday,
          publishedThisWeek: diariesWeek,
          publishedThisMonth: diariesMonth,
          pendingReview: pendingDiaries,
        },
        comments: {
          total: totalComments,
          today: commentsToday,
          pendingReview: pendingComments,
        },
        interactions: {
          totalLikes,
          totalFavorites,
          totalShares,
        },
        system: {
          diskUsage: Math.round((usedMemory / totalMemory) * 100),
          dbSize,
          uptime: Math.floor(uptime),
        },
      },
      trends: {
        dates: trendDates,
        users: userTrends,
        diaries: diaryTrends,
      },
      recentUsers,
      recentDiaries,
    });
  } catch (error) {
    logger.error(`[管理员仪表盘错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取用户列表
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', isBanned = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isBanned !== '') {
      where.isBanned = isBanned === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          isBanned: true,
          needReview: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: { diaries: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(`[获取用户列表错误] 错误: ${error.message}`);
    next(error);
  }
};

// 封禁/解封用户
const toggleUserBan = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isBanned, reason } = req.body;
    const adminId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '用户不存在',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: '不能封禁管理员账户',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned },
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true,
      },
    });

    // 封禁时立即清除用户会话缓存，使其立即失效
    if (isBanned) {
      try {
        await clearUserSessionCache(userId);
      } catch (cacheErr) {
        console.warn('[封禁用户] 清除会话缓存失败:', cacheErr.message);
      }
      // 同时删除该用户的所有 refresh token
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    await prisma.adminLog.create({
      data: {
        adminId,
        action: isBanned ? 'BAN_USER' : 'UNBAN_USER',
        details: JSON.stringify({
          targetUserId: userId,
          targetUsername: user.username,
          reason,
        }),
      },
    });

    await sendAccountStatusNotification(
      userId,
      user.email,
      user.username,
      isBanned ? 'ban' : 'unban',
      reason
    );

    res.json({
      message: isBanned ? '用户已封禁' : '用户已解封',
      user: updatedUser,
    });
  } catch (error) {
    console.error(`[封禁用户错误] 错误: ${error.message}`);
    next(error);
  }
};

// 重置用户密码
const resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { notifyByEmail = true } = req.body;
    const adminId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '用户不存在',
      });
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let newPassword = '';
    const randomBytes = require('crypto').randomBytes(12);
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(randomBytes[i] % chars.length);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'RESET_PASSWORD',
        details: JSON.stringify({
          targetUserId: userId,
          targetUsername: user.username,
          notifyByEmail,
        }),
      },
    });

    if (notifyByEmail) {
      await sendPasswordResetNotification(userId, user.email, newPassword);
    } else {
      const { notifyUser } = require('../utils/notification');
      await notifyUser(
        userId,
        'password_reset',
        '密码已重置',
        `管理员已重置您的密码。新密码为：${newPassword}。请尽快登录并修改密码。`
      );
    }

    res.json({
      message: '密码重置成功',
      emailSent: notifyByEmail,
    });
  } catch (error) {
    console.error(`[重置密码错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取待审核日记列表
const getPendingDiaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where: { status: 'pending' },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      }),
      prisma.diary.count({ where: { status: 'pending' } }),
    ]);

    res.json({
      diaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(`[获取待审核日记错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取所有日记列表（管理员用）
const getAllDiaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      }),
      prisma.diary.count({ where }),
    ]);

    res.json({
      diaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(`[获取所有日记错误] 错误: ${error.message}`);
    next(error);
  }
};

// 审核日记
const reviewDiary = async (req, res, next) => {
  try {
    const { diaryId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '审核状态必须是 approved 或 rejected',
      });
    }

    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      },
    });

    if (!diary) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '日记不存在',
      });
    }

    if (diary.status !== 'pending') {
      return res.status(400).json({
        error: 'ValidationError',
        message: '该日记已经审核过了',
      });
    }

    const updatedDiary = await prisma.diary.update({
      where: { id: diaryId },
      data: { status },
    });

    await prisma.review.create({
      data: {
        userId: adminId,
        diaryId,
        status,
        reason,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: status === 'approved' ? 'APPROVE_DIARY' : 'REJECT_DIARY',
        details: JSON.stringify({
          diaryId,
          diaryTitle: diary.title,
          authorId: diary.userId,
          authorUsername: diary.user.username,
          reason,
        }),
      },
    });

    await sendReviewNotification(
      diary.userId,
      diary.user.email,
      diary.user.username,
      diary,
      status,
      reason
    );

    res.json({
      message: status === 'approved' ? '日记已通过审核' : '日记已拒绝',
      diary: updatedDiary,
    });
  } catch (error) {
    console.error(`[审核日记错误] 错误: ${error.message}`);
    next(error);
  }
};

// ==================== 增强的系统配置功能 ====================

/**
 * 从数据库获取原始配置
 */
const getRawConfigsFromDB = async () => {
  const configs = await prisma.systemConfig.findMany();
  const configMap = {};
  configs.forEach((config) => {
    try {
      configMap[config.key] = JSON.parse(config.value);
    } catch {
      configMap[config.key] = config.value;
    }
  });
  return configMap;
};

/**
 * 合并配置与默认值
 */
const mergeWithDefaults = (configMap) => {
  const merged = { ...DEFAULT_CONFIG };

  for (const [key, value] of Object.entries(configMap)) {
    if (value !== undefined && value !== null) {
      // 解密敏感数据
      if (SENSITIVE_KEYS.some(sk => key === sk || key.startsWith(sk.split('.')[0]))) {
        if (typeof value === 'object' && value !== null) {
          const decryptedObj = { ...value };
          for (const sk of SENSITIVE_KEYS) {
            const [parent, child] = sk.split('.');
            if (parent === key && child && decryptedObj[child]) {
              decryptedObj[child] = decryptSensitiveData(decryptedObj[child]);
            }
          }
          merged[key] = decryptedObj;
        } else {
          merged[key] = decryptSensitiveData(value);
        }
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
};

// 获取系统配置（带缓存）
const getSystemConfig = async (req, res, next) => {
  try {
    // 尝试从缓存获取
    let config = await cacheService.get(CACHE_KEYS.SYSTEM_CONFIG);

    if (!config) {
      logger.debug('[系统配置] 缓存未命中，从数据库读取');
      const configMap = await getRawConfigsFromDB();
      config = mergeWithDefaults(configMap);

      // 写入缓存（1小时）
      await cacheService.set(CACHE_KEYS.SYSTEM_CONFIG, config, 3600);
    } else {
      logger.debug('[系统配置] 缓存命中');
    }

    res.json({ config });
  } catch (error) {
    console.error(`[获取系统配置错误] 错误: ${error.message}`);
    next(error);
  }
};

// 更新系统配置（带验证和日志）
const updateSystemConfig = async (req, res, next) => {
  try {
    const updates = req.body;
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // 验证配置
    const validation = validateConfig(updates);
    if (!validation.valid) {
      return validationError(res, '配置验证失败', validation.errors);
    }

    // 获取旧配置用于日志
    const oldConfigs = await getRawConfigsFromDB();

    const updatePromises = [];
    const configLogs = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;

      let processedValue = value;

      // 加密敏感数据
      if (SENSITIVE_KEYS.some(sk => key === sk || key.startsWith(sk.split('.')[0]))) {
        if (typeof value === 'object' && value !== null) {
          processedValue = { ...value };
          for (const sk of SENSITIVE_KEYS) {
            const [parent, child] = sk.split('.');
            if (parent === key && child && processedValue[child]) {
              // 如果已经是加密格式（以 enc: 开头），说明前端没修改，保留原值
              if (typeof processedValue[child] === 'string' && processedValue[child].startsWith('enc:')) {
                const oldConfig = oldConfigs[key];
                if (oldConfig && typeof oldConfig === 'object' && oldConfig[child]) {
                  processedValue[child] = oldConfig[child];
                }
              } else if (typeof processedValue[child] === 'string' && processedValue[child].length > 0) {
                // 有新密码需要加密
                processedValue[child] = encryptSensitiveData(processedValue[child]);
              }
            }
          }
        } else if (typeof value === 'string' && value.length > 0 && !value.startsWith('enc:')) {
          processedValue = encryptSensitiveData(value);
        }
      }

      const valueStr = typeof processedValue === 'string'
        ? processedValue
        : JSON.stringify(processedValue);

      updatePromises.push(
        prisma.systemConfig.upsert({
          where: { key },
          update: { value: valueStr },
          create: { key, value: valueStr },
        })
      );

      // 记录配置变更日志
      const oldValue = oldConfigs[key];
      const changeType = oldValue === undefined ? 'create' : 'update';

      configLogs.push({
        adminId,
        configKey: key,
        oldValue: oldValue !== undefined ? String(oldValue) : null,
        newValue: valueStr,
        changeType,
        ipAddress,
        userAgent,
      });
    }

    await prisma.$transaction(updatePromises);

    // 批量创建配置日志
    if (configLogs.length > 0) {
      await prisma.configLog.createMany({ data: configLogs });
    }

    // 清除配置缓存
    await cacheService.del(CACHE_KEYS.SYSTEM_CONFIG);
    await cacheService.del(CACHE_KEYS.UPLOAD_CONFIG);

    // 记录管理员日志
    const logDetails = {};
    for (const [key, value] of Object.entries(updates)) {
      if (SENSITIVE_KEYS.some(sk => key === sk || key.startsWith(sk.split('.')[0]))) {
        if (typeof value === 'object') {
          logDetails[key] = { ...value };
          for (const sk of SENSITIVE_KEYS) {
            const [parent, child] = sk.split('.');
            if (parent === key && child && logDetails[key][child]) {
              logDetails[key][child] = '***';
            }
          }
        } else {
          logDetails[key] = '***';
        }
      } else {
        logDetails[key] = value;
      }
    }

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_SYSTEM_CONFIG',
        details: JSON.stringify(logDetails),
      },
    });

    successResponse(res, null, '系统配置更新成功');
  } catch (error) {
    logger.error(`[更新系统配置错误] 错误: ${error.message}`);
    next(error);
  }
};

// 重置系统配置
const resetSystemConfig = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // 获取旧配置
    const oldConfigs = await prisma.systemConfig.findMany();

    // 删除所有配置
    await prisma.systemConfig.deleteMany({});

    // 记录删除日志
    const configLogs = oldConfigs.map(config => ({
      adminId,
      configKey: config.key,
      oldValue: config.value,
      newValue: 'RESET',
      changeType: 'delete',
      ipAddress,
      userAgent,
    }));

    if (configLogs.length > 0) {
      await prisma.configLog.createMany({ data: configLogs });
    }

    // 清除缓存
    await cacheService.del(CACHE_KEYS.SYSTEM_CONFIG);
    await cacheService.del(CACHE_KEYS.UPLOAD_CONFIG);

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'RESET_SYSTEM_CONFIG',
        details: JSON.stringify({ message: '系统配置已重置为默认值' }),
      },
    });

    successResponse(res, null, '系统配置已重置为默认值');
  } catch (error) {
    logger.error(`[重置系统配置错误] 错误: ${error.message}`);
    next(error);
  }
};

// 清除配置缓存（热更新）
const clearConfigCache = async (req, res, next) => {
  try {
    await cacheService.del(CACHE_KEYS.SYSTEM_CONFIG);
    await cacheService.del(CACHE_KEYS.SYSTEM_CONFIG_HASH);
    await cacheService.del(CACHE_KEYS.UPLOAD_CONFIG);

    successResponse(res, null, '配置缓存已清除');
  } catch (error) {
    logger.error(`[清除配置缓存错误] 错误: ${error.message}`);
    next(error);
  }
};

// 导出系统配置
const exportConfig = async (req, res, next) => {
  try {
    const configMap = await getRawConfigsFromDB();
    const merged = mergeWithDefaults(configMap);

    // 移除敏感数据或标记为加密
    const exportData = {
      version: '2.1.1',
      exportAt: new Date().toISOString(),
      config: merged,
    };

    // 设置下载头
    const filename = `mio-diary-config-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(exportData);
  } catch (error) {
    logger.error(`[导出配置错误] 错误: ${error.message}`);
    next(error);
  }
};

// 导入系统配置
const importConfig = async (req, res, next) => {
  try {
    const { config, template } = req.body;
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    let importData = config;

    // 支持配置模板
    if (template) {
      const templates = {
        strict: {
          enableContentFilter: true,
          enableUserReview: true,
          enableCommentReview: true,
          requireEmailVerify: true,
          minPasswordLength: 10,
        },
        open: {
          allowRegister: true,
          enableComment: true,
          allowGuestComment: true,
          enableShare: true,
          enableLike: true,
          enableFavorite: true,
        },
        maintenance: {
          maintenanceMode: true,
          maintenanceMessage: '系统正在维护中，请稍后再试...',
        },
      };

      if (!templates[template]) {
        return validationError(res, '无效的配置模板');
      }

      importData = templates[template];
    }

    if (!importData || typeof importData !== 'object') {
      return validationError(res, '无效的配置数据');
    }

    // 验证配置
    const validation = validateConfig(importData);
    if (!validation.valid) {
      return validationError(res, '配置验证失败', validation.errors);
    }

    // 获取旧配置
    const oldConfigs = await getRawConfigsFromDB();

    const updatePromises = [];
    const configLogs = [];

    for (const [key, value] of Object.entries(importData)) {
      if (value === undefined) continue;

      let valueStr = typeof value === 'string' ? value : JSON.stringify(value);

      // 加密敏感配置项
      const sensitiveKeys = ['smtp.pass', 'zhipuApiKey', 'encryptionKey', 'encryptionIv'];
      if (sensitiveKeys.includes(key) && valueStr && !valueStr.startsWith('enc:')) {
        valueStr = encryptSensitiveData(valueStr);
      }

      updatePromises.push(
        prisma.systemConfig.upsert({
          where: { key },
          update: { value: valueStr },
          create: { key, value: valueStr },
        })
      );

      const oldValue = oldConfigs[key];
      configLogs.push({
        adminId,
        configKey: key,
        oldValue: oldValue !== undefined ? String(oldValue) : null,
        newValue: valueStr,
        changeType: oldValue === undefined ? 'create' : 'update',
        ipAddress,
        userAgent,
      });
    }

    await prisma.$transaction(updatePromises);
    await prisma.configLog.createMany({ data: configLogs });

    // 清除缓存
    await cacheService.del(CACHE_KEYS.SYSTEM_CONFIG);
    await cacheService.del(CACHE_KEYS.UPLOAD_CONFIG);

    successResponse(res, { importedCount: Object.keys(importData).length }, '配置导入成功');
  } catch (error) {
    logger.error(`[导入配置错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取配置变更日志
const getConfigLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, key } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (key) {
      where.configKey = key;
    }

    const [logs, total] = await Promise.all([
      prisma.configLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.configLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`[获取配置日志错误] 错误: ${error.message}`);
    next(error);
  }
};

// ==================== 系统健康检查 ====================

// 系统健康检查
const healthCheck = async (req, res, next) => {
  try {
    const checks = {
      database: { status: 'unknown', responseTime: 0, message: '' },
      redis: { status: 'unknown', responseTime: 0, message: '' },
      email: { status: 'unknown', message: '' },
      ai: { status: 'unknown', message: '' },
      disk: { status: 'unknown', freeSpace: 0, totalSpace: 0, message: '' },
      memory: { status: 'unknown', used: 0, total: 0, message: '' },
    };

    // 检查数据库
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        message: '连接正常',
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        message: `连接失败: ${error.message}`,
        error: error.message,
      };
    }

    // 检查Redis
    try {
      const redisStart = Date.now();
      // 检查 Redis 连接状态
      const { isConnected, healthCheck: redisHealth } = require('../config/redis');
      
      if (isConnected()) {
        await cacheService.set('health:check', '1', 10);
        await cacheService.get('health:check');
        checks.redis = {
          status: 'healthy',
          responseTime: Date.now() - redisStart,
          message: '连接正常',
        };
      } else {
        checks.redis = {
          status: 'unhealthy',
          message: 'Redis 未连接',
        };
      }
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        message: `连接失败: ${error.message}`,
      };
    }

    // 检查邮件服务配置
    try {
      const configMap = await getRawConfigsFromDB();
      const smtp = configMap.smtp;
      if (smtp && smtp.host && smtp.user) {
        checks.email = {
          status: 'configured',
          message: `SMTP已配置 (${smtp.host})`,
        };
      } else {
        checks.email = {
          status: 'not_configured',
          message: 'SMTP未配置',
        };
      }
    } catch (error) {
      checks.email = {
        status: 'error',
        message: `检查失败: ${error.message}`,
      };
    }

    // 检查AI服务配置
    try {
      const configMap = await getRawConfigsFromDB();
      const aiKey = configMap.zhipuApiKey;
      if (aiKey && aiKey.length > 0) {
        checks.ai = {
          status: 'configured',
          message: '智谱AI已配置',
        };
      } else {
        checks.ai = {
          status: 'not_configured',
          message: '智谱AI未配置',
        };
      }
    } catch (error) {
      checks.ai = {
        status: 'error',
        message: `检查失败: ${error.message}`,
      };
    }

    // 检查磁盘空间
    try {
      const os = require('os');
      const fs = require('fs');
      const path = require('path');
      
      // 获取数据库文件大小
      const dbPath = path.join(__dirname, '../../prisma/dev.db');
      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSize = (stats.size / 1024 / 1024).toFixed(2);
      }
      
      // 获取系统磁盘空间
      let diskTotal = 0;
      let diskUsed = 0;
      let diskPercent = 0;
      
      try {
        const childProcess = require('child_process');
        
        // 根据平台选择不同的命令
        const platform = os.platform();
        let dfOutput;
        
        if (platform === 'win32') {
          // Windows 使用 wmic 命令
          dfOutput = childProcess.execSync('wmic logicaldisk get size,freespace,caption', { 
            encoding: 'utf8',
            timeout: 5000,
          });
          // 解析 Windows 输出格式
          const lines = dfOutput.trim().split('\n').slice(1);
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const freeSpace = parseInt(parts[1]) || 0;
              const totalSize = parseInt(parts[2]) || 0;
              if (totalSize > 0) {
                diskTotal += Math.round(totalSize / 1024 / 1024);
                diskUsed += Math.round((totalSize - freeSpace) / 1024 / 1024);
              }
            }
          }
          if (diskTotal > 0) {
            diskPercent = Math.round((diskUsed / diskTotal) * 100);
          }
        } else {
          // Linux/Mac 使用 df 命令
          dfOutput = childProcess.execSync('df -k . | tail -1', { 
            encoding: 'utf8',
            timeout: 5000,
          });
          const parts = dfOutput.trim().split(/\s+/);
          if (parts.length >= 4) {
            diskTotal = Math.round(parseInt(parts[1]) / 1024);
            diskUsed = Math.round(parseInt(parts[2]) / 1024);
            diskPercent = parseInt(parts[4]?.replace('%', '')) || Math.round((diskUsed / diskTotal) * 100);
          }
        }
      } catch (cmdError) {
        // 命令失败时使用备用方案（仅显示数据库大小）
        console.warn('[磁盘检查] 命令执行失败，使用备用方案:', cmdError.message);
      }
      
      checks.disk = {
        status: diskPercent > 90 ? 'warning' : 'healthy',
        message: diskTotal > 0 
          ? `磁盘使用: ${diskPercent}% (${diskUsed}MB / ${diskTotal}MB)`
          : `数据库大小: ${dbSize} MB`,
        dbSize: parseFloat(dbSize),
        diskTotal,
        diskUsed,
        diskPercent,
      };
    } catch (error) {
      checks.disk = {
        status: 'unknown',
        message: `无法获取磁盘信息: ${error.message}`,
      };
    }

    // 检查内存
    try {
      const os = require('os');
      
      // 获取系统总内存和可用内存
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = Math.round((usedMem / totalMem) * 100);
      
      // 转换为 MB
      const totalMB = Math.round(totalMem / 1024 / 1024);
      const usedMB = Math.round(usedMem / 1024 / 1024);
      
      // 获取 Node.js 进程内存使用
      const processMem = process.memoryUsage();
      const processUsedMB = Math.round(processMem.heapUsed / 1024 / 1024);
      const processTotalMB = Math.round(processMem.heapTotal / 1024 / 1024);
      
      checks.memory = {
        status: usagePercent > 90 ? 'warning' : 'healthy',
        used: usedMB,
        total: totalMB,
        usagePercent,
        message: `系统内存: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`,
        process: {
          used: processUsedMB,
          total: processTotalMB,
          message: `Node进程: ${processUsedMB}MB / ${processTotalMB}MB`,
        },
      };
    } catch (error) {
      checks.memory = {
        status: 'unknown',
        message: `无法获取内存信息: ${error.message}`,
      };
    }

    // 总体状态
    const isHealthy = checks.database.status === 'healthy' && 
                      checks.redis.status === 'healthy';

    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '2.1.1',
      checks,
    });
  } catch (error) {
    logger.error(`[健康检查错误] 错误: ${error.message}`);
    next(error);
  }
};

// ==================== 系统公告管理 ====================

// 获取公告列表
const getAnnouncements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, active = '', type = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (active === 'true') {
      where.isActive = true;
      where.OR = [
        { startAt: null },
        { startAt: { lte: new Date() } },
      ];
      where.AND = [
        {
          OR: [
            { endAt: null },
            { endAt: { gte: new Date() } },
          ],
        },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`[获取公告列表错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取单个公告
const getAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!announcement) {
      return notFoundError(res, '公告不存在');
    }

    // 增加浏览次数
    await prisma.announcement.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ announcement });
  } catch (error) {
    logger.error(`[获取公告错误] 错误: ${error.message}`);
    next(error);
  }
};

// 创建公告
const createAnnouncement = async (req, res, next) => {
  try {
    const {
      title,
      content,
      type = 'info',
      priority = 0,
      isPinned = false,
      isActive = true,
      startAt,
      endAt,
    } = req.body;
    const adminId = req.user.id;

    if (!title || !content) {
      return validationError(res, '标题和内容不能为空');
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type,
        priority: parseInt(priority),
        isPinned,
        isActive,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        createdBy: adminId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 清除公告缓存
    await cacheService.del(CACHE_KEYS.ANNOUNCEMENTS);

    // 记录日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_ANNOUNCEMENT',
        details: JSON.stringify({ announcementId: announcement.id, title }),
      },
    });

    successResponse(res, { announcement }, '公告创建成功', 201);
  } catch (error) {
    logger.error(`[创建公告错误] 错误: ${error.message}`);
    next(error);
  }
};

// 更新公告
const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const adminId = req.user.id;

    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return notFoundError(res, '公告不存在');
    }

    const updateData = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.priority !== undefined) updateData.priority = parseInt(updates.priority);
    if (updates.isPinned !== undefined) updateData.isPinned = updates.isPinned;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.startAt !== undefined) updateData.startAt = updates.startAt ? new Date(updates.startAt) : null;
    if (updates.endAt !== undefined) updateData.endAt = updates.endAt ? new Date(updates.endAt) : null;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 清除公告缓存
    await cacheService.del(CACHE_KEYS.ANNOUNCEMENTS);

    // 记录日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_ANNOUNCEMENT',
        details: JSON.stringify({ announcementId: id, title: announcement.title }),
      },
    });

    successResponse(res, { announcement }, '公告更新成功');
  } catch (error) {
    logger.error(`[更新公告错误] 错误: ${error.message}`);
    next(error);
  }
};

// 删除公告
const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return notFoundError(res, '公告不存在');
    }

    await prisma.announcement.delete({
      where: { id },
    });

    // 清除公告缓存
    await cacheService.del(CACHE_KEYS.ANNOUNCEMENTS);

    // 记录日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_ANNOUNCEMENT',
        details: JSON.stringify({ announcementId: id, title: existing.title }),
      },
    });

    successResponse(res, null, '公告删除成功');
  } catch (error) {
    logger.error(`[删除公告错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取公开公告（用于前端展示）
const getPublicAnnouncements = async (req, res, next) => {
  try {
    const now = new Date();

    // 尝试从缓存获取
    let announcements = await cacheService.get(CACHE_KEYS.ANNOUNCEMENTS);

    if (!announcements) {
      announcements = await prisma.announcement.findMany({
        where: {
          isActive: true,
          OR: [{ startAt: null }, { startAt: { lte: now } }],
          AND: [
            {
              OR: [{ endAt: null }, { endAt: { gte: now } }],
            },
          ],
        },
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          isPinned: true,
          isActive: true,
          createdAt: true,
          endAt: true,
        },
      });

      // 缓存5分钟
      await cacheService.set(CACHE_KEYS.ANNOUNCEMENTS, announcements, 300);
    }

    res.json({ announcements });
  } catch (error) {
    logger.error(`[获取公开公告错误] 错误: ${error.message}`);
    next(error);
  }
};

// ==================== 原有邮件和AI功能 ====================

// 验证SMTP配置
const verifySMTP = async (req, res, next) => {
  try {
    const { smtp } = req.body;

    if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
      return validationError(res, '请提供完整的SMTP配置信息');
    }

    // 验证端口
    const portValidation = validateConfigValue('smtp.port', smtp.port);
    if (!portValidation.valid) {
      return validationError(res, portValidation.message);
    }

    const result = await verifySMTPConfig(smtp);

    if (result.success) {
      successResponse(res, null, 'SMTP配置验证成功');
    } else {
      errorResponse(res, 'SMTPError', result.message, 400);
    }
  } catch (error) {
    logger.error(`[验证SMTP错误] 错误: ${error.message}`);
    next(error);
  }
};

// 发送测试邮件
const sendTestEmail = async (req, res, next) => {
  try {
    const { to } = req.body;

    if (!to) {
      return validationError(res, '请提供收件人邮箱地址');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return validationError(res, '邮箱格式不正确');
    }

    const result = await sendEmail(to, 'test', {});

    successResponse(res, {
      to,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
    }, '测试邮件发送成功');
  } catch (error) {
    logger.error(`[发送测试邮件错误] 错误: ${error.message}`);
    errorResponse(res, 'EmailError', error.message || '邮件发送失败', 500);
  }
};

// 获取管理员日志
const getAdminLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.adminLog.count(),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`[获取管理员日志错误] 错误: ${error.message}`);
    next(error);
  }
};

// 删除日记（管理员权限）
const deleteDiary = async (req, res, next) => {
  try {
    const { diaryId } = req.params;
    const adminId = req.user.id;

    if (!diaryId || diaryId.trim().length === 0) {
      return validationError(res, '日记ID不能为空');
    }

    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!diary) {
      return notFoundError(res, '日记不存在');
    }

    const { extractImageUrls, deleteFilesByUrl } = require('../utils/fileUtil');
    const imageUrls = extractImageUrls(diary.content, diary.images);

    await prisma.diary.delete({
      where: { id: diaryId },
    });

    if (imageUrls.length > 0) {
      const result = await deleteFilesByUrl(imageUrls);
      if (result.failedFiles.length > 0) {
        logger.error('[管理员删除日记] 部分图片删除失败:', result.failedFiles);
      }
    }

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_DIARY',
        details: JSON.stringify({
          diaryId,
          diaryTitle: diary.title,
          authorId: diary.userId,
          authorUsername: diary.user?.username,
        }),
      },
    });

    successResponse(res, { deletedImages: imageUrls.length }, '日记删除成功');
  } catch (error) {
    logger.error(`[管理员删除日记错误] 错误: ${error.message}`);
    next(error);
  }
};

// 测试AI审核配置
const testAIModeration = async (req, res, next) => {
  try {
    const { zhipuApiKey, zhipuModel, aiModerationPrompt, aiModerationThreshold } = req.body;

    if (!zhipuApiKey) {
      return validationError(res, '请提供智谱API Key');
    }

    const { reviewContent, checkThreshold } = require('../services/aiModeration');
    const fs = require('fs').promises;
    const path = require('path');

    const testContents = [
      '这是一条正常的测试评论，用于验证AI审核功能是否正常工作。',
      '这是一条包含敏感词的测试：暴力、恐怖主义。',
    ];

    const results = [];

    // 测试文本审核
    for (const testContent of testContents) {
      try {
        const result = await reviewContent(testContent, {
          zhipuApiKey,
          zhipuModel: zhipuModel || 'glm-4-flash',
          aiModerationPrompt: aiModerationPrompt || DEFAULT_CONFIG.aiModerationPrompt,
        });

        const passed = checkThreshold(result, aiModerationThreshold || 'medium');

        results.push({
          type: 'text',
          content: testContent.substring(0, 30) + '...',
          approved: result.approved,
          passed,
          reason: result.reason,
          category: result.category,
        });
      } catch (err) {
        results.push({
          type: 'text',
          content: testContent.substring(0, 30) + '...',
          error: err.message,
        });
      }
    }

    // 测试图片审核（使用项目中的示例图片）
    const testImagePath = path.join(__dirname, '../../../screenshots/1.jpg');
    console.log('[AI测试] 图片路径:', testImagePath);
    
    try {
      // 检查文件是否存在
      try {
        await fs.access(testImagePath);
      } catch (e) {
        console.log('[AI测试] 图片文件不存在，跳过图片测试');
        results.push({
          type: 'image',
          content: '测试图片审核功能',
          skipped: true,
          error: '测试图片文件不存在',
        });
        // 不把跳过当作错误
      }
      
      if (!results.some(r => r.skipped)) {
        const imageBuffer = await fs.readFile(testImagePath);
        console.log('[AI测试] 图片大小:', imageBuffer.length, 'bytes');
        
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        console.log('[AI测试] Base64长度:', base64Image.length);

        // 使用视觉模型测试图片
        const visionModel = 'glm-4.6v-flash';
        console.log('[AI测试] 调用视觉模型:', visionModel);
        
        const imageResult = await reviewContent('[图片测试]', {
          zhipuApiKey,
          zhipuModel: visionModel,
          aiModerationPrompt: aiModerationPrompt || DEFAULT_CONFIG.aiModerationPrompt,
          imageBase64: base64Image,
        });

        const passed = checkThreshold(imageResult, aiModerationThreshold || 'medium');

        results.push({
          type: 'image',
          content: '测试图片审核功能',
          model: visionModel,
          approved: imageResult.approved,
          passed,
          reason: imageResult.reason,
          category: imageResult.category,
        });
        console.log('[AI测试] 图片测试完成');
      }
    } catch (err) {
      console.error('[AI测试] 图片测试错误:', err.message);
      results.push({
        type: 'image',
        content: '测试图片审核功能',
        error: err.message,
      });
    }

    const hasErrors = results.some(r => r.error && !r.skipped);

    if (hasErrors) {
      return errorResponse(res, 'TestError', 'AI审核测试失败，请检查API Key是否正确', 500, { results });
    }

    successResponse(res, {
      results,
      model: zhipuModel || 'glm-4-flash',
      threshold: aiModerationThreshold || 'medium',
    }, 'AI审核服务连接成功');
  } catch (error) {
    logger.error('[AI审核测试错误]', error);
    errorResponse(res, 'ServerError', error.message || 'AI审核测试失败', 500);
  }
};

module.exports = {
  // 原有功能
  getDashboardStats,
  getUsers,
  toggleUserBan,
  resetUserPassword,
  getPendingDiaries,
  getAllDiaries,
  reviewDiary,
  getSystemConfig,
  updateSystemConfig,
  resetSystemConfig,
  verifySMTP,
  sendTestEmail,
  getAdminLogs,
  deleteDiary,
  testAIModeration,

  // 新增配置功能
  clearConfigCache,
  exportConfig,
  importConfig,
  getConfigLogs,
  healthCheck,

  // 新增公告功能
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getPublicAnnouncements,
};