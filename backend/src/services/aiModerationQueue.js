/**
 * AI审核队列服务
 * 
 * 用于管理AI审核请求的队列，控制并发和速率限制
 * 
 * 智谱AI免费模型限制：
 * - GLM-4.7-Flash / GLM-4-Flash-250414: 并发约2，QPS约30
 * - GLM-4.6V-Flash (视觉): 并发约1-2，QPS更低
 * 
 * 队列策略：
 * - 最大并发: 2（可根据模型调整）
 * - 请求间隔: 500ms（避免触发限流）
 * - 重试次数: 3次
 * - 重试延迟: 指数退避
 */

const EventEmitter = require('events');

class AIModerationQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 队列配置
    this.maxConcurrent = options.maxConcurrent || 2;  // 最大并发数
    this.requestInterval = options.requestInterval || 500;  // 请求间隔(ms)
    this.maxRetries = options.maxRetries || 3;  // 最大重试次数
    this.retryBaseDelay = options.retryBaseDelay || 1000;  // 重试基础延迟(ms)
    
    // 队列状态
    this.queue = [];  // 待处理队列
    this.processing = new Map();  // 正在处理的任务
    this.lastRequestTime = 0;  // 上次请求时间
    
    // 统计信息
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      retried: 0,
    };
    
    // 是否正在处理队列
    this.isProcessing = false;
    
    // 绑定处理方法
    this.processQueue = this.processQueue.bind(this);
  }

  /**
   * 添加审核任务到队列
   * @param {Object} task - 审核任务
   * @param {string} task.id - 任务ID
   * @param {string} task.content - 审核内容
   * @param {Object} task.config - AI配置
   * @param {Function} task.callback - 回调函数
   * @returns {Promise} - 审核结果
   */
  add(task) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: task.content,
        config: task.config,
        resolve,
        reject,
        retries: 0,
        addedAt: Date.now(),
      };
      
      this.queue.push(queueItem);
      this.stats.total++;
      
      console.log(`[AI队列] 添加任务 ${queueItem.id}，队列长度: ${this.queue.length}`);
      this.emit('taskAdded', queueItem);
      
      // 触发队列处理
      this.processQueue();
    });
  }

  /**
   * 处理队列
   */
  async processQueue() {
    // 如果已经在处理或队列为空，直接返回
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    // 如果达到最大并发数，等待
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      // 检查请求间隔
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.requestInterval) {
        // 等待剩余时间
        await this.delay(this.requestInterval - timeSinceLastRequest);
      }
      
      // 从队列取出任务
      const task = this.queue.shift();
      if (!task) break;
      
      // 标记为处理中
      this.processing.set(task.id, task);
      this.lastRequestTime = Date.now();
      
      // 异步处理任务
      this.processTask(task).finally(() => {
        this.processing.delete(task.id);
        // 继续处理队列
        this.processQueue();
      });
    }
    
    this.isProcessing = false;
  }

  /**
   * 处理单个任务
   * @param {Object} task - 任务对象
   */
  async processTask(task) {
    const { reviewContent, checkThreshold } = require('./aiModeration');
    
    try {
      console.log(`[AI队列] 开始处理任务 ${task.id}`);
      this.emit('taskStarted', task);
      
      const result = await reviewContent(task.content, task.config);
      const passed = checkThreshold(result, task.config.aiModerationThreshold);
      
      this.stats.completed++;
      console.log(`[AI队列] 任务完成 ${task.id}`);
      this.emit('taskCompleted', { task, result, passed });
      
      task.resolve({ ...result, passed, taskId: task.id });
    } catch (error) {
      console.error(`[AI队列] 任务失败 ${task.id}:`, error.message);
      
      // 检查是否为速率限制错误
      const isRateLimitError = error.message.includes('速率限制') || 
                               error.message.includes('429') ||
                               error.message.includes('rate');
      
      // 检查是否可以重试
      if (isRateLimitError && task.retries < this.maxRetries) {
        task.retries++;
        this.stats.retried++;
        
        // 指数退避延迟
        const delay = this.retryBaseDelay * Math.pow(2, task.retries - 1);
        console.log(`[AI队列] 任务 ${task.id} 将在 ${delay}ms 后重试 (${task.retries}/${this.maxRetries})`);
        
        await this.delay(delay);
        
        // 重新加入队列头部（优先处理）
        this.queue.unshift(task);
        this.emit('taskRetrying', { task, retries: task.retries, delay });
      } else {
        // 无法重试，标记为失败
        this.stats.failed++;
        this.emit('taskFailed', { task, error });
        task.reject(error);
      }
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取队列状态
   * @returns {Object} - 队列状态
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      stats: { ...this.stats },
      avgWaitTime: this.calculateAvgWaitTime(),
    };
  }

  /**
   * 计算平均等待时间
   * @returns {number} - 平均等待时间(ms)
   */
  calculateAvgWaitTime() {
    if (this.queue.length === 0) return 0;
    
    const now = Date.now();
    const totalWaitTime = this.queue.reduce((sum, task) => sum + (now - task.addedAt), 0);
    return Math.round(totalWaitTime / this.queue.length);
  }

  /**
   * 清空队列
   */
  clear() {
    const count = this.queue.length;
    this.queue.forEach(task => {
      task.reject(new Error('队列已清空'));
    });
    this.queue = [];
    console.log(`[AI队列] 已清空 ${count} 个任务`);
    this.emit('queueCleared', { count });
  }

  /**
   * 更新配置
   * @param {Object} options - 新配置
   */
  updateConfig(options) {
    if (options.maxConcurrent !== undefined) {
      this.maxConcurrent = options.maxConcurrent;
    }
    if (options.requestInterval !== undefined) {
      this.requestInterval = options.requestInterval;
    }
    if (options.maxRetries !== undefined) {
      this.maxRetries = options.maxRetries;
    }
    console.log('[AI队列] 配置已更新:', options);
  }
}

// 创建单例实例
let queueInstance = null;

/**
 * 获取队列实例
 * @param {Object} options - 配置选项
 * @returns {AIModerationQueue} - 队列实例
 */
function getQueue(options = {}) {
  if (!queueInstance) {
    queueInstance = new AIModerationQueue(options);
    
    // 监听事件（可用于日志或监控）
    queueInstance.on('taskAdded', (task) => {
      console.log(`[AI队列事件] 任务添加: ${task.id}`);
    });
    
    queueInstance.on('taskCompleted', ({ task, result, passed }) => {
      console.log(`[AI队列事件] 任务完成: ${task.id}, 通过: ${passed}`);
    });
    
    queueInstance.on('taskFailed', ({ task, error }) => {
      console.error(`[AI队列事件] 任务失败: ${task.id}, 错误: ${error.message}`);
    });
    
    queueInstance.on('taskRetrying', ({ task, retries, delay }) => {
      console.log(`[AI队列事件] 任务重试: ${task.id}, 第${retries}次, 延迟${delay}ms`);
    });
  }
  
  return queueInstance;
}

/**
 * 使用队列审核内容
 * @param {string} content - 审核内容
 * @param {Object} config - AI配置
 * @returns {Promise<Object>} - 审核结果
 */
async function queueReview(content, config) {
  const queue = getQueue();
  return queue.add({ content, config });
}

module.exports = {
  AIModerationQueue,
  getQueue,
  queueReview,
};
