const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 版本信息常量
const VERSION_INFO = {
  version: '2.0.0',
  name: 'Mio的日记本',
  description: '个人日记管理系统',
  author: 'Mio',
  github: 'https://github.com/zlyawa/mio-diary',
  license: 'MIT',
  techStack: {
    backend: ['Node.js', 'Express', 'Prisma', 'SQLite', 'JWT'],
    frontend: ['React', 'Vite', 'Tailwind CSS', 'React Quill']
  }
};

/**
 * 获取版本信息
 * GET /api/config/version
 */
router.get('/version', (req, res) => {
  res.json({
    ...VERSION_INFO,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * 获取公开系统配置
 * 用于前端功能开关控制
 * GET /api/config/public
 */
router.get('/public', async (req, res) => {
  try {
    // 从SystemConfig表中获取配置
    const configs = await prisma.systemConfig.findMany();
    const configMap = {};
    configs.forEach(config => {
      try {
        // 尝试将 JSON 字符串解析为对应的类型
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        // 如果解析失败，直接返回原始值
        configMap[config.key] = config.value;
      }
    });

    // 返回前端需要的配置项
    res.json({
      siteName: configMap.siteName || 'Mio日记',
      siteDescription: configMap.siteDescription || '',
      siteIcon: configMap.siteIcon || '',
      siteIco: configMap.siteIco || '',
      enableReview: configMap.enableUserReview || false,
      enableEmailVerify: configMap.enableEmailVerify || false,
      siteAnnouncement: configMap.siteAnnouncement || ''
    });
  } catch (error) {
    console.error('[获取公开配置错误]', error);
    res.status(500).json({ 
      message: '获取配置失败',
      error: error.message 
    });
  }
});

module.exports = router;