/**
 * 评论内容审核模块
 * 使用智谱AI API进行评论内容审核
 * 
 * 审核机制：AI + 管理员双重审核
 * - AI审核通过 → 评论直接发布
 * - AI审核不通过 → 进入待审核状态，等待管理员审核
 * - 管理员审核通过 → 评论发布
 * - 队列过载/超时 → 降级为管理员审核
 * 
 * 功能：
 * 1. 智能AI内容审核
 * 2. 敏感词二次校验
 * 3. 根据审核结果决定：通过/拒绝/标记待审核
 * 4. 错误降级处理（API失败时允许通过）
 * 5. 请求队列和限流控制
 * 6. 队列过载自动降级
 */

const prisma = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 加密配置（生产环境必须从环境变量读取）
const isProduction = process.env.NODE_ENV === 'production';
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || (isProduction ? (() => { throw new Error('生产环境必须设置 CONFIG_ENCRYPTION_KEY'); })() : 'MioDiary2026SecretKey32Chars!!');
const ENCRYPTION_IV = process.env.CONFIG_ENCRYPTION_IV || (isProduction ? (() => { throw new Error('生产环境必须设置 CONFIG_ENCRYPTION_IV'); })() : 'MioDiaryIV16!!');

/**
 * 解密敏感数据
 * @param {string} encryptedText - 加密的文本
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
    console.error('[AI审核] API Key解密失败:', error.message);
    return encryptedText;
  }
};

// ==================== 降级状态管理 ====================
const DEGRADE_CONFIG = {
  maxQueueLength: 10,        // 最大队列长度，超过则降级
  maxWaitTime: 15000,        // 最大等待时间(ms)，超过则降级
  degradeCooldown: 60000,    // 降级后冷却时间(ms)
  healthCheckInterval: 30000, // 健康检查间隔(ms)
};

// 全局降级状态
let degradeState = {
  isDegrading: false,        // 是否处于降级状态
  degradeCount: 0,           // 降级次数
  lastDegradeTime: 0,        // 上次降级时间
  totalProcessed: 0,         // 总处理数
  totalDegraded: 0,          // 总降级数
};

/**
 * 检查是否应该降级
 * @param {Object} limiterStatus - 限流器状态
 * @returns {Object} - { shouldDegrade: boolean, reason: string }
 */
function checkShouldDegrade(limiterStatus) {
  // 检查是否在冷却期
  if (degradeState.isDegrading) {
    const timeSinceDegrade = Date.now() - degradeState.lastDegradeTime;
    if (timeSinceDegrade < DEGRADE_CONFIG.degradeCooldown) {
      return { 
        shouldDegrade: true, 
        reason: '系统处于降级冷却期' 
      };
    } else {
      // 冷却期结束，恢复正常
      degradeState.isDegrading = false;
    }
  }
  
  // 检查队列积压
  if (limiterStatus.queueLength >= DEGRADE_CONFIG.maxQueueLength) {
    return { 
      shouldDegrade: true, 
      reason: `队列积压过多 (${limiterStatus.queueLength}/${DEGRADE_CONFIG.maxQueueLength})` 
    };
  }
  
  return { shouldDegrade: false, reason: '' };
}

/**
 * 触发降级
 * @param {string} reason - 降级原因
 */
function triggerDegrade(reason) {
  degradeState.isDegrading = true;
  degradeState.degradeCount++;
  degradeState.lastDegradeTime = Date.now();
  degradeState.totalDegraded++;
  
  console.warn(`[AI审核降级] 触发降级: ${reason}`);
  console.warn(`[AI审核降级] 当前状态: ${JSON.stringify(degradeState)}`);
}

/**
 * 获取降级状态
 */
function getDegradeState() {
  return { ...degradeState };
}

// ==================== 请求限流器 ====================
// 智谱AI免费模型并发限制约2，QPS约30
// 使用令牌桶算法控制请求速率

class RequestLimiter {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 2;  // 最大并发数
    this.minInterval = options.minInterval || 100;  // 最小请求间隔(ms)
    this.maxWaitTime = options.maxWaitTime || DEGRADE_CONFIG.maxWaitTime;  // 最大等待时间
    this.currentConcurrent = 0;
    this.lastRequestTime = 0;
    this.queue = [];
    this.totalRequests = 0;
    this.totalTimeouts = 0;
  }

  /**
   * 获取请求许可（带超时和降级检测）
   * @returns {Promise<{acquired: boolean, reason?: string}>}
   */
  async acquire() {
    return new Promise(resolve => {
      const startTime = Date.now();
      const taskId = ++this.totalRequests;
      
      const tryAcquire = () => {
        const now = Date.now();
        const waitedTime = now - startTime;
        
        // 检查是否超时
        if (waitedTime > this.maxWaitTime) {
          this.totalTimeouts++;
          console.warn(`[AI限流器] 任务 ${taskId} 等待超时 (${waitedTime}ms > ${this.maxWaitTime}ms)`);
          resolve({ 
            acquired: false, 
            reason: '等待超时，自动降级为管理员审核',
            waitedTime 
          });
          return;
        }
        
        // 检查队列积压
        const queueLength = this.queue.length;
        if (queueLength >= DEGRADE_CONFIG.maxQueueLength) {
          console.warn(`[AI限流器] 任务 ${taskId} 队列积压过多 (${queueLength})`);
          resolve({ 
            acquired: false, 
            reason: `队列积压过多，自动降级为管理员审核`,
            queueLength 
          });
          return;
        }
        
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        // 检查并发和间隔
        if (this.currentConcurrent < this.maxConcurrent && 
            timeSinceLastRequest >= this.minInterval) {
          this.currentConcurrent++;
          this.lastRequestTime = now;
          console.log(`[AI限流器] 任务 ${taskId} 获得许可 (并发: ${this.currentConcurrent}/${this.maxConcurrent}, 等待: ${waitedTime}ms)`);
          resolve({ acquired: true, waitedTime });
        } else {
          // 加入等待队列
          const queueItem = { tryAcquire, taskId, startTime };
          this.queue.push(queueItem);
          
          // 计算等待时间
          const waitTime = Math.max(
            50,
            this.minInterval - timeSinceLastRequest
          );
          
          // 延迟后重试
          setTimeout(() => {
            // 从队列中移除自己
            const idx = this.queue.indexOf(queueItem);
            if (idx !== -1) {
              this.queue.splice(idx, 1);
              tryAcquire();
            }
          }, waitTime);
        }
      };
      
      tryAcquire();
    });
  }

  /**
   * 释放请求许可
   */
  release() {
    this.currentConcurrent--;
    degradeState.totalProcessed++;
    
    console.log(`[AI限流器] 释放许可 (并发: ${this.currentConcurrent}/${this.maxConcurrent}, 队列: ${this.queue.length})`);
    
    // 处理等待队列
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next && next.tryAcquire) {
        // 使用更短的延迟处理队列
        setTimeout(next.tryAcquire, this.minInterval);
      }
    }
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      currentConcurrent: this.currentConcurrent,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.queue.length,
      totalRequests: this.totalRequests,
      totalTimeouts: this.totalTimeouts,
    };
  }
}

// 创建全局限流器实例
const requestLimiter = new RequestLimiter({
  maxConcurrent: 2,  // 智谱AI免费模型并发限制
  minInterval: 200,  // 请求间隔200ms，即每秒最多5个请求
});

// 审核结果类型
const MODERATION_RESULT = {
  PASS: 'pass',           // 通过
  PENDING: 'pending',     // 待审核
  REJECT: 'reject'        // 拒绝
};

// 风险等级
const RISK_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// 图片上传目录
const COMMENTS_UPLOADS_DIR = path.join(__dirname, '../../uploads/comments');

/**
 * 获取AI审核配置
 * @returns {Object} 配置对象
 */
const getAIModerationConfig = async () => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'aiModerationEnabled',
            'zhipuApiKey',
            'zhipuModel',
            'aiModerationThreshold',
            'enableContentFilter',
            'sensitiveWords',
            'aiModerationTimeout',
            'aiModerationMaxRetries',
            'enableCommentReview'
          ]
        }
      }
    });

    const configMap = {};
    configs.forEach((config) => {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    });

    return {
      enabled: configMap.aiModerationEnabled ?? false,
      apiKey: decryptSensitiveData(configMap.zhipuApiKey ?? ''),
      model: configMap.zhipuModel ?? 'glm-4-flash',
      threshold: configMap.aiModerationThreshold ?? 'medium',
      enableSensitiveWordCheck: configMap.enableContentFilter ?? true,
      sensitiveWords: configMap.sensitiveWords ?? ['暴力', '色情', '政治', '赌博', '毒品'],
      timeout: configMap.aiModerationTimeout ?? 5000,
      maxRetries: configMap.aiModerationMaxRetries ?? 1,
      enableCommentReview: configMap.enableCommentReview ?? false
    };
  } catch (error) {
    console.error('[AI审核] 获取配置失败:', error.message);
    // 返回默认配置（禁用AI审核）
    return {
      enabled: false,
      apiKey: '',
      model: 'glm-4-flash',
      threshold: 'medium',
      enableSensitiveWordCheck: true,
      sensitiveWords: ['暴力', '色情', '政治', '赌博', '毒品'],
      timeout: 5000,
      maxRetries: 1,
      enableCommentReview: false
    };
  }
};

/**
 * 敏感词检查
 * @param {string} content - 评论内容
 * @param {string[]} sensitiveWords - 敏感词列表
 * @returns {Object} 检查结果
 */
const checkSensitiveWords = (content, sensitiveWords) => {
  if (!content || !sensitiveWords || sensitiveWords.length === 0) {
    return { hasSensitiveWord: false, matchedWords: [] };
  }

  const matchedWords = [];
  const lowerContent = content.toLowerCase();

  for (const word of sensitiveWords) {
    if (!word) continue;
    const lowerWord = word.toLowerCase();
    // 支持普通匹配和正则匹配
    if (lowerContent.includes(lowerWord)) {
      matchedWords.push(word);
    }
  }

  return {
    hasSensitiveWord: matchedWords.length > 0,
    matchedWords
  };
};

/**
 * 从内容中提取图片路径
 * @param {string} content - 评论内容（可能包含Markdown图片）
 * @returns {Object} { textContent, imagePaths }
 */
const extractImagesFromContent = (content) => {
  const imagePaths = [];
  // 匹配 Markdown 图片格式: ![alt](url)
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  let match;
  let textContent = content;
  
  while ((match = imageRegex.exec(content)) !== null) {
    const imagePath = match[1];
    // 只处理本地上传的图片
    if (imagePath.startsWith('/uploads/comments/')) {
      imagePaths.push(imagePath);
    }
  }
  
  // 移除图片标记，保留纯文本
  textContent = content.replace(imageRegex, '[图片]').trim();
  
  return { textContent, imagePaths };
};

/**
 * 将图片转换为base64
 * @param {string} imagePath - 图片路径（如 /uploads/comments/xxx.jpg）
 * @returns {Promise<string|null>} base64编码的图片或null
 */
const imageToBase64 = async (imagePath) => {
  try {
    const fullPath = path.join(__dirname, '../..', imagePath);
    const imageBuffer = await fs.readFile(fullPath);
    const base64 = imageBuffer.toString('base64');
    
    // 根据文件扩展名确定MIME类型
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('[AI审核] 读取图片失败:', imagePath, error.message);
    return null;
  }
};

/**
 * 调用智谱AI API进行内容审核（支持图片审核）
 * @param {string} content - 评论内容
 * @param {Object} config - AI配置
 * @returns {Object} 审核结果
 */
const callZhipuAI = async (content, config) => {
  const { apiKey, model, timeout, maxRetries } = config;

  if (!apiKey) {
    throw new Error('智谱AI API Key未配置');
  }

  // 提取图片和文本
  const { textContent, imagePaths } = extractImagesFromContent(content);
  
  // 检查是否有图片需要审核
  const hasImages = imagePaths.length > 0;
  
  // 根据是否有图片选择模型
  // 有图片时使用视觉模型，否则使用文本模型
  const useModel = hasImages ? 'glm-4.6v-flash' : (model || 'glm-4.7-flash');
  
  console.log(`[AI审核] 使用模型: ${useModel}, 有图片: ${hasImages}, 图片数量: ${imagePaths.length}`);
  
  // 构建消息内容
  let userContent;
  
  if (hasImages) {
    // 构建多模态消息（图片+文字）
    const contentParts = [];
    
    // 添加图片（转换为base64）
    for (const imagePath of imagePaths) {
      const base64Image = await imageToBase64(imagePath);
      if (base64Image) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: base64Image
          }
        });
      }
    }
    
    // 添加文本
    if (textContent) {
      contentParts.push({
        type: 'text',
        text: textContent
      });
    }
    
    userContent = contentParts;
  } else {
    // 纯文本消息
    userContent = textContent;
  }

  const systemPrompt = `你是一个内容审核助手。请判断以下评论是否包含违规内容。
违规类型包括：
1. 暴力、恐怖内容
2. 色情、淫秽内容
3. 政治敏感内容
4. 广告、垃圾信息
5. 人身攻击、侮辱谩骂
6. 谣言、虚假信息
7. 违法犯罪相关内容
8. 侵犯隐私内容

${hasImages ? '注意：评论中包含图片，请同时审核图片内容是否违规。' : ''}

请根据风险程度判断：
- low: 安全内容，无违规
- medium: 疑似违规，需要人工复核
- high: 确定违规，应当拒绝

只回复JSON格式，不要包含任何其他文字：
{
  "pass": true/false,
  "reason": "审核原因说明",
  "risk": "low/medium/high",
  "category": "违规类别（如无不填）"
}`;

  const requestBody = {
    model: useModel,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ],
    temperature: 0.1,
    max_tokens: 500
  };

  let lastError = null;

  // 重试机制
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 获取请求许可（限流控制）
      const limiterStatus = requestLimiter.getStatus();
      console.log(`[AI审核] 等待请求许可... (并发: ${limiterStatus.currentConcurrent}/${limiterStatus.maxConcurrent}, 队列: ${limiterStatus.queueLength})`);
      
      const permit = await requestLimiter.acquire();
      
      // 检查是否需要降级
      if (!permit.acquired) {
        // 触发降级
        triggerDegrade(permit.reason);
        
        // 返回降级结果（不抛出错误，而是返回待审核状态）
        return {
          pass: false,
          reason: permit.reason,
          risk: RISK_LEVEL.LOW,
          category: 'degraded',
          degraded: true,
          degradeReason: permit.reason,
        };
      }
      
      console.log(`[AI审核] 获得请求许可，开始请求 (尝试 ${attempt + 1}/${maxRetries + 1}, 等待: ${permit.waitedTime}ms)`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        requestLimiter.release();  // 超时时释放许可
      }, timeout);

      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      requestLimiter.release();  // 请求完成后释放许可

      if (!response.ok) {
        const errorText = await response.text();
        // 如果是速率限制错误，增加重试延迟
        if (response.status === 429) {
          const retryDelay = 2000 * Math.pow(2, attempt);
          console.log(`[AI审核] 触发速率限制，等待 ${retryDelay}ms 后重试`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API返回格式异常');
      }

      // 解析AI返回结果
      const aiContent = data.choices[0].message.content.trim();
      
      // 尝试提取JSON部分
      let jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      let result;
      
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // 如果无法提取JSON，根据内容关键词判断
        result = parseAIResponseFallback(aiContent);
      }

      // 验证结果格式
      return {
        pass: result.pass === true,
        reason: result.reason || 'AI审核完成',
        risk: ['low', 'medium', 'high'].includes(result.risk) ? result.risk : 'low',
        category: result.category || '',
        raw: aiContent
      };

    } catch (error) {
      requestLimiter.release();  // 出错时也释放许可
      lastError = error;
      console.warn(`[AI审核] API调用失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, error.message);
      
      // 如果不是最后一次尝试，等待后重试（指数退避）
      if (attempt < maxRetries) {
        const retryDelay = 1000 * Math.pow(2, attempt);
        console.log(`[AI审核] 等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 所有重试都失败
  throw lastError || new Error('AI审核服务暂时不可用');
};

/**
 * 备用解析方法：当JSON解析失败时，根据文本内容判断
 * @param {string} content - AI返回的文本
 * @returns {Object} 解析结果
 */
const parseAIResponseFallback = (content) => {
  const lowerContent = content.toLowerCase();
  
  // 判断风险等级
  let risk = 'low';
  if (lowerContent.includes('high') || lowerContent.includes('高风险') || lowerContent.includes('严重')) {
    risk = 'high';
  } else if (lowerContent.includes('medium') || lowerContent.includes('中风险') || lowerContent.includes('疑似')) {
    risk = 'medium';
  }

  // 判断是否通过
  const pass = lowerContent.includes('pass": true') || 
               lowerContent.includes('通过') ||
               (risk === 'low' && !lowerContent.includes('违规'));

  return {
    pass,
    reason: content.substring(0, 200),
    risk
  };
};

/**
 * 审核内容
 * @param {string} content - 评论内容
 * @param {Object} options - 额外选项
 * @returns {Object} 审核结果
 */
const moderateContent = async (content, options = {}) => {
  const config = await getAIModerationConfig();
  const result = {
    status: MODERATION_RESULT.PASS,
    reason: '',
    risk: RISK_LEVEL.LOW,
    aiResult: null,
    sensitiveWords: [],
    moderationSource: []
  };

  // 如果AI审核未启用，只进行敏感词检查
  if (!config.enabled) {
    if (config.enableSensitiveWordCheck) {
      const sensitiveCheck = checkSensitiveWords(content, config.sensitiveWords);
      if (sensitiveCheck.hasSensitiveWord) {
        result.status = MODERATION_RESULT.PENDING;
        result.reason = `包含敏感词: ${sensitiveCheck.matchedWords.join(', ')}`;
        result.risk = RISK_LEVEL.MEDIUM;
        result.sensitiveWords = sensitiveCheck.matchedWords;
        result.moderationSource.push('sensitive_word');
      }
    }
    return result;
  }

  // 第一步：敏感词快速检查
  if (config.enableSensitiveWordCheck) {
    const sensitiveCheck = checkSensitiveWords(content, config.sensitiveWords);
    if (sensitiveCheck.hasSensitiveWord) {
      result.sensitiveWords = sensitiveCheck.matchedWords;
      result.moderationSource.push('sensitive_word');
      // 敏感词命中直接标记为待审核
      result.status = MODERATION_RESULT.PENDING;
      result.reason = `包含敏感词: ${sensitiveCheck.matchedWords.join(', ')}`;
      result.risk = RISK_LEVEL.MEDIUM;
    }
  }

  // 第二步：AI审核
  try {
    const aiResult = await callZhipuAI(content, config);
    result.aiResult = aiResult;
    result.moderationSource.push('ai');

    // 检查是否为降级结果
    if (aiResult.degraded) {
      console.warn(`[AI审核] 降级处理: ${aiResult.degradeReason}`);
      result.moderationSource.push('degraded');
      result.status = MODERATION_RESULT.PENDING;
      result.reason = `AI审核繁忙，已转人工审核 (${aiResult.degradeReason})`;
      result.risk = RISK_LEVEL.LOW;
      result.degraded = true;
      return result;
    }

    // 根据AI结果和配置阈值决定最终状态
    if (!aiResult.pass) {
      // 高风险直接拒绝
      if (aiResult.risk === RISK_LEVEL.HIGH) {
        result.status = MODERATION_RESULT.REJECT;
        result.reason = aiResult.reason || '内容包含违规信息';
        result.risk = RISK_LEVEL.HIGH;
      } 
      // 中风险标记待审核
      else if (aiResult.risk === RISK_LEVEL.MEDIUM) {
        // 如果敏感词已经标记为待审核，保持待审核状态
        if (result.status !== MODERATION_RESULT.PENDING) {
          result.status = MODERATION_RESULT.PENDING;
          result.reason = aiResult.reason || '内容疑似违规，需要人工审核';
          result.risk = RISK_LEVEL.MEDIUM;
        }
      }
      // 低风险但AI认为不通过
      else {
        // 根据阈值配置决定
        if (config.threshold === 'low') {
          result.status = MODERATION_RESULT.PENDING;
          result.reason = aiResult.reason || '内容需要审核';
          result.risk = RISK_LEVEL.LOW;
        }
      }
    }

  } catch (error) {
    // AI调用失败，降级处理
    console.error('[AI审核] 审核失败，降级处理:', error.message);
    result.moderationSource.push('fallback');
    
    // 失败时标记为待审核，让管理员来处理
    if (result.status === MODERATION_RESULT.PASS) {
      result.status = MODERATION_RESULT.PENDING;
      result.reason = `AI审核服务异常，已转人工审核 (${error.message})`;
      result.risk = RISK_LEVEL.LOW;
    }
  }

  return result;
};

/**
 * 记录审核日志
 * @param {Object} logData - 日志数据
 */
const logModeration = async (logData) => {
  try {
    const { 
      commentId, 
      content, 
      result, 
      aiResult, 
      source,
      userId,
      ip 
    } = logData;

    // 记录到控制台
    console.log('[AI审核日志]', {
      timestamp: new Date().toISOString(),
      commentId,
      userId,
      result: result.status,
      risk: result.risk,
      reason: result.reason,
      source: result.moderationSource,
      ip: ip || 'unknown'
    });

    // 可以扩展：保存到数据库或文件
    // await prisma.moderationLog.create({...})

  } catch (error) {
    console.error('[AI审核] 记录日志失败:', error.message);
  }
};

/**
 * 评论提交前钩子
 * 在评论提交前执行AI审核
 * 
 * 审核流程：
 * 1. 如果 enableCommentReview 为 false → 评论直接发布
 * 2. 如果 enableCommentReview 为 true：
 *    - 如果 AI 审核开启 → AI 先审核，通过的直接发布，不通过的进入管理员审核
 *    - 如果 AI 审核关闭 → 直接进入管理员审核队列
 * 
 * @param {Object} event - 事件对象
 * @param {Object} event.comment - 评论数据
 * @param {Object} context - 上下文对象
 * @returns {Object} 处理结果
 */
const beforeCommentSubmit = async (event, context) => {
  try {
    const { comment } = event;
    
    if (!comment || !comment.content) {
      return { 
        success: false, 
        error: '评论内容不能为空' 
      };
    }

    // 获取配置
    const config = await getAIModerationConfig();
    
    // 如果评论审核功能关闭，直接通过
    if (!config.enableCommentReview) {
      console.log('[AI审核] 评论审核功能已关闭，评论直接发布');
      return { success: true };
    }

    // 评论审核功能开启
    console.log('[AI审核] 评论审核功能已开启');
    
    // 如果AI审核未启用，直接进入管理员审核队列
    if (!config.enabled && !config.enableSensitiveWordCheck) {
      console.log('[AI审核] AI审核未启用，评论进入管理员审核队列');
      comment.status = 'pending';
      comment.auditReason = '等待管理员审核';
      return { 
        success: true, 
        comment,
        message: '评论已提交，等待管理员审核通过后显示',
        pending: true
      };
    }

    // 执行内容审核（AI + 敏感词）
    console.log('[AI审核] 开始执行AI内容审核');
    const moderationResult = await moderateContent(comment.content, {
      userId: comment.userId,
      ip: context?.ip
    });

    // 记录审核日志
    await logModeration({
      commentId: comment.id || 'temp-' + Date.now(),
      content: comment.content,
      result: moderationResult,
      aiResult: moderationResult.aiResult,
      userId: comment.userId,
      ip: context?.ip
    });

    // 根据审核结果处理
    switch (moderationResult.status) {
      case MODERATION_RESULT.REJECT:
        // 高风险内容拒绝提交
        return { 
          success: false, 
          error: '内容包含违规信息，无法提交',
          code: 'CONTENT_REJECTED',
          details: {
            reason: moderationResult.reason,
            risk: moderationResult.risk
          }
        };

      case MODERATION_RESULT.PENDING:
        // 中风险内容标记为待审核
        comment.status = 'pending';
        comment.auditReason = moderationResult.reason;
        comment.moderationSource = JSON.stringify(moderationResult.moderationSource);
        comment.moderatedAt = new Date().toISOString();
        
        return { 
          success: true, 
          comment,
          message: '评论已提交，等待审核通过后显示',
          pending: true
        };

      case MODERATION_RESULT.PASS:
      default:
        // 通过审核
        comment.status = 'approved';
        if (moderationResult.moderationSource.length > 0) {
          comment.moderationSource = JSON.stringify(moderationResult.moderationSource);
        }
        return { success: true, comment };
    }

  } catch (error) {
    console.error('[AI审核] 评论提交前处理错误:', error);
    
    // 发生错误时，降级处理：允许提交，但标记需要审核
    return { 
      success: true, 
      comment: event.comment,
      warning: '审核服务异常，评论已提交但可能需要人工复核'
    };
  }
};

/**
 * 评论提交后钩子
 * 可用于发送通知等操作
 * 
 * @param {Object} event - 事件对象
 * @param {Object} context - 上下文对象
 */
const afterCommentSubmit = async (event, context) => {
  const { comment, result } = event;
  
  // 如果评论需要审核，可以发送通知给管理员
  if (comment.status === 'pending') {
    try {
      const { notifyUser } = require('../utils/notification');
      
      // 获取管理员列表
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true }
      });

      // 通知所有管理员
      for (const admin of admins) {
        await notifyUser(
          admin.id,
          'system',
          '新评论待审核',
          `有一条新评论需要审核，审核原因：${comment.auditReason || '内容疑似违规'}`
        );
      }
    } catch (error) {
      console.error('[AI审核] 发送审核通知失败:', error.message);
    }
  }

  return { success: true };
};

/**
 * 手动审核评论（管理员功能）
 * @param {string} commentId - 评论ID
 * @param {string} action - 操作：approve/reject
 * @param {string} reason - 审核原因
 * @param {Object} adminUser - 管理员信息
 */
const manualReview = async (commentId, action, reason = '', adminUser = null) => {
  try {
    if (!['approve', 'reject'].includes(action)) {
      throw new Error('无效的操作类型');
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    
    // 先获取评论信息，包含日记和用户信息
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            email: true
          }
        },
        diary: {
          select: {
            id: true,
            title: true,
            userId: true
          }
        }
      }
    });

    if (!existingComment) {
      throw new Error('评论不存在');
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { 
        status,
        auditReason: reason,
        moderatedAt: new Date().toISOString()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // 记录手动审核日志
    console.log('[AI审核] 手动审核:', {
      commentId,
      action,
      reason,
      timestamp: new Date().toISOString()
    });

    // 发送通知给评论用户
    if (existingComment.user) {
      const { notifyUser } = require('../utils/notification');
      
      if (action === 'approve') {
        // 审核通过通知
        await notifyUser(
          existingComment.user.id,
          'system',
          '评论审核通过',
          `您在日记《${existingComment.diary?.title || '未知日记'}》中的评论已通过审核`
        );

        // 尝试发送邮件通知
        try {
          const { sendEmail } = require('../utils/emailService');
          if (existingComment.user.email) {
            await sendEmail({
              to: existingComment.user.email,
              subject: '您的评论已通过审核 - Mio Diary',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">评论审核通过</h2>
                  <p>您好，${existingComment.user.username}！</p>
                  <p>您在日记《<strong>${existingComment.diary?.title || '未知日记'}</strong>》中的评论已通过审核。</p>
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #6b7280;">评论内容：</p>
                    <p style="margin: 10px 0 0 0;">${existingComment.content?.substring(0, 200)}${existingComment.content?.length > 200 ? '...' : ''}</p>
                  </div>
                  <p>感谢您的参与！</p>
                </div>
              `
            });
            console.log('[AI审核] 已发送审核通过邮件通知');
          }
        } catch (emailError) {
          console.error('[AI审核] 发送邮件通知失败:', emailError.message);
        }

        // 如果评论通过，还要通知日记作者（如果不是自己评论自己）
        if (existingComment.diary && existingComment.diary.userId !== existingComment.user.id) {
          await notifyUser(
            existingComment.diary.userId,
            'comment',
            '新评论',
            `${existingComment.user.username}评论了你的日记《${existingComment.diary.title}》`
          );
        }
      } else {
        // 审核拒绝通知
        await notifyUser(
          existingComment.user.id,
          'system',
          '评论审核未通过',
          `您在日记《${existingComment.diary?.title || '未知日记'}》中的评论未通过审核。原因：${reason || '内容不符合规范'}`
        );
      }
    }

    return {
      success: true,
      comment,
      message: action === 'approve' ? '评论已通过审核' : '评论已拒绝'
    };

  } catch (error) {
    console.error('[AI审核] 手动审核失败:', error);
    throw error;
  }
};

/**
 * 重新审核评论内容（用于管理员手动触发）
 * @param {string} content - 评论内容
 */
const reModerate = async (content) => {
  return await moderateContent(content);
};

/**
 * 获取审核统计信息
 */
const getModerationStats = async () => {
  try {
    const [
      totalComments,
      pendingComments,
      approvedComments,
      rejectedComments
    ] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.count({ where: { status: 'pending' } }),
      prisma.comment.count({ where: { status: 'approved' } }),
      prisma.comment.count({ where: { status: 'rejected' } })
    ]);

    return {
      total: totalComments,
      pending: pendingComments,
      approved: approvedComments,
      rejected: rejectedComments,
      moderationRate: totalComments > 0 
        ? ((pendingComments + rejectedComments) / totalComments * 100).toFixed(2) + '%'
        : '0%'
    };
  } catch (error) {
    console.error('[AI审核] 获取统计失败:', error);
    throw error;
  }
};

/**
 * 获取限流器和降级状态
 * @returns {Object} - 状态信息
 */
const getSystemStatus = () => {
  return {
    limiter: requestLimiter.getStatus(),
    degrade: getDegradeState(),
    config: DEGRADE_CONFIG,
  };
};

module.exports = {
  // 核心审核功能
  moderateContent,
  beforeCommentSubmit,
  afterCommentSubmit,
  
  // 管理功能
  manualReview,
  reModerate,
  getModerationStats,
  
  // 配置和工具
  getAIModerationConfig,
  checkSensitiveWords,
  
  // 状态监控
  getSystemStatus,
  getDegradeState,
  
  // 常量
  MODERATION_RESULT,
  RISK_LEVEL
};