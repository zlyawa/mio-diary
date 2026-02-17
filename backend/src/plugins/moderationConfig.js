/**
 * 评论审核配置文件
 * AI内容审核 + 反垃圾配置
 */

module.exports = {
  // AI内容审核配置
  aiModeration: {
    enabled: process.env.AI_MODERATION_ENABLED === 'true',
    provider: 'zhipu',
    apiKey: process.env.ZHIPU_API_KEY,
    model: process.env.ZHIPU_MODEL || 'glm-4.7-flash',
    // 审核阈值
    threshold: {
      low: 'pass',      // 低风险：直接通过
      medium: 'pending', // 中风险：待审核
      high: 'reject'    // 高风险：拒绝
    },
    // 敏感词二次校验
    sensitiveWords: ['暴力', '色情', '政治', '赌博', '毒品'],
  },

  // 通知配置
  notification: {
    // 评论通知管理员
    commentNotification: true,
    // 审核通知
    moderationNotification: true,
  },

  // 反垃圾配置
  antiSpam: {
    // IP限流
    ipLimit: {
      enabled: true,
      maxRequests: 10,  // 每10分钟最多10条评论
      windowMs: 10 * 60 * 1000,
    },
    // 内容长度限制
    contentLength: {
      min: 2,
      max: 2000,
    },
  },
};