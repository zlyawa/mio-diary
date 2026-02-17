/**
 * AI内容审核服务
 * 使用智谱AI API进行内容审核
 * 
 * 模型选择说明：
 * - 纯文本审核：使用 glm-4.7-flash（免费，30B参数）
 * - 图文审核：使用 glm-4.6v-flash（免费，视觉模型）
 * 
 * 注意：实际模型选择在 plugins/commentModeration.js 中根据内容类型自动切换
 */

const axios = require('axios');

/**
 * 审核内容
 * @param {string} content - 需要审核的内容
 * @param {object} config - 审核配置
 * @param {string} config.zhipuApiKey - 智谱AI API Key
 * @param {string} config.zhipuModel - 智谱AI模型名称
 * @param {string} config.aiModerationPrompt - 系统提示词
 * @returns {Promise<object>} - 审核结果
 */
const reviewContent = async (content, config) => {
  const { zhipuApiKey, zhipuModel, aiModerationPrompt, imageBase64 } = config;

  if (!zhipuApiKey) {
    throw new Error('智谱AI API Key未配置');
  }

  try {
    // 构建消息内容
    let userContent;
    if (imageBase64) {
      // 多模态消息格式（文本+图片）
      userContent = [
        { type: 'text', text: content },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ];
    } else {
      userContent = content;
    }

    const model = zhipuModel || 'glm-4.7-flash';
    console.log(`[AI审核] 调用模型: ${model}, 内容长度: ${typeof userContent === 'string' ? userContent.length : 'multi-modal'}`);

    // 调用智谱AI API
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: aiModerationPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${zhipuApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('[AI审核] API响应状态:', response.status);

    const data = response.data;
    
    // 解析AI返回的内容
    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('AI返回结果为空');
    }

    // 尝试解析JSON结果
    let result;
    try {
      // 提取JSON内容（AI有时会返回markdown格式的代码块）
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)```/) || 
                       aiResponse.match(/```\s*([\s\S]*?)```/) ||
                       [null, aiResponse];
      const jsonStr = jsonMatch[1].trim();
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[AI审核] 解析AI响应失败:', aiResponse);
      // 如果解析失败，根据内容简单判断
      result = {
        approved: !aiResponse.includes('不通过') && !aiResponse.includes('违规'),
        reason: aiResponse,
        category: 'unknown'
      };
    }

    return {
      approved: result.approved ?? true,
      reason: result.reason || '',
      category: result.category || 'none',
      raw: aiResponse
    };
  } catch (error) {
    // 处理 axios 错误
    if (error.code === 'ECONNABORTED') {
      console.error('[AI审核错误] 请求超时');
      throw new Error('AI审核请求超时，请稍后重试');
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('[AI审核错误] 无法连接到智谱AI服务器');
      throw new Error('无法连接到智谱AI服务器，请检查网络');
    }
    if (error.code === 'ENOTFOUND') {
      console.error('[AI审核错误] DNS解析失败');
      throw new Error('智谱AI域名解析失败，请检查网络');
    }
    // 处理 HTTP 错误响应
    if (error.response) {
      const errorMsg = error.response.data?.error?.message || error.response.statusText;
      console.error('[AI审核错误] HTTP', error.response.status, errorMsg);
      throw new Error(`智谱AI API请求失败: ${errorMsg}`);
    }
    console.error('[AI审核错误]', error.message);
    throw error;
  }
};

/**
 * 根据阈值判断是否通过审核
 * @param {object} result - AI审核结果
 * @param {string} threshold - 审核阈值 (low, medium, high)
 * @returns {boolean} - 是否通过
 */
const checkThreshold = (result, threshold = 'medium') => {
  if (result.approved) {
    return true;
  }

  // 根据阈值判断
  const categoryRiskLevel = {
    'none': 0,
    'spam': 1,
    'political': 2,
    'hate': 2,
    'violence': 3,
    'pornography': 3,
    'unknown': 1
  };

  const thresholdLevel = {
    'low': 1,
    'medium': 2,
    'high': 3
  };

  const riskLevel = categoryRiskLevel[result.category] || 1;
  const requiredLevel = thresholdLevel[threshold] || 2;

  return riskLevel < requiredLevel;
};

/**
 * 批量审核多条内容
 * @param {Array<{id: string, content: string}>} items - 待审核内容列表
 * @param {object} config - 审核配置
 * @returns {Promise<Array>} - 审核结果列表
 */
const batchReview = async (items, config) => {
  const results = [];
  
  for (const item of items) {
    try {
      const result = await reviewContent(item.content, config);
      results.push({
        id: item.id,
        ...result,
        passed: checkThreshold(result, config.aiModerationThreshold)
      });
    } catch (error) {
      console.error(`[AI审核] 审核内容 ${item.id} 失败:`, error.message);
      results.push({
        id: item.id,
        approved: false,
        reason: '审核服务异常',
        category: 'error',
        passed: false,
        error: error.message
      });
    }
  }

  return results;
};

module.exports = {
  reviewContent,
  checkThreshold,
  batchReview
};