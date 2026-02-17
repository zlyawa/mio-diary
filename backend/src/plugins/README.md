# 评论内容审核模块

## 简介

本模块为 Mio日记 系统提供评论内容的 AI + 管理员双重审核功能，使用智谱AI API进行智能内容审核。

## 审核流程

系统采用 **AI + 管理员双重审核** 机制：

```
评论提交
    │
    ▼
┌─────────────────────┐
│  AI审核是否开启？   │
└─────────────────────┘
    │
    ├── 否 ──▶ 根据系统设置决定是否需要管理员审核
    │
    └── 是
         │
         ▼
    ┌─────────────────────┐
    │   AI智能审核        │
    │  （智谱AI API）     │
    └─────────────────────┘
         │
         ├── 通过 ──▶ 评论直接发布 ✓
         │
         └── 不通过 ──▶ 进入待审核状态
                           │
                           ▼
                    ┌─────────────────────┐
                    │   管理员手动审核    │
                    └─────────────────────┘
                           │
                           ├── 通过 ──▶ 评论发布 ✓
                           │
                           └── 拒绝 ──▶ 评论被拒绝 ✗
```

**核心逻辑：AI 或管理员任意一方审核通过，评论即可发布。**

## 功能特性

- 智能AI内容审核（基于智谱AI）
- 敏感词二次校验
- 三级风险管控：通过/待审核/拒绝
- 错误降级处理（API失败时不影响正常使用）
- 完整的审核日志记录
- 支持超时和重试机制

## 文件说明

| 文件 | 说明 |
|------|------|
| `commentModeration.js` | AI审核核心逻辑 |
| `moderationConfig.js` | 审核配置文件 |

## 安装使用

### 1. 数据库配置

在系统配置中添加以下配置项：

```javascript
// 在系统设置中配置
aiModerationEnabled: Boolean,     // 是否启用AI审核
zhipuApiKey: String,              // 智谱AI API Key
zhipuModel: String,               // 模型名称（默认 glm-4-flash）
aiModerationThreshold: String,    // 审核阈值（low/medium/high）
aiModerationTimeout: Number,      // API超时时间（毫秒，默认5000）
aiModerationMaxRetries: Number,   // 最大重试次数（默认1）
```

### 2. 在评论控制器中集成

修改 `commentController.js`：

```javascript
const aiModeration = require('../plugins/commentModeration');

// 在 createComment 函数中使用
const createComment = async (req, res, next) => {
  try {
    // ... 原有验证代码 ...
    
    // AI内容审核
    const moderationResult = await aiModeration.beforeCommentSubmit({
      comment: { content, userId }
    }, { ip: req.ip });
    
    if (!moderationResult.success) {
      return res.status(400).json({ 
        error: moderationResult.error,
        code: moderationResult.code 
      });
    }
    
    // 使用审核后的评论数据
    const moderatedComment = moderationResult.comment;
    
    // 创建评论...
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId,
        diaryId,
        parentId: parentId || null,
        status: moderatedComment.status || 'approved',
        auditReason: moderatedComment.auditReason || null
      }
    });
    
    // 发送通知（如果需要审核）
    await aiModeration.afterCommentSubmit({
      comment: moderatedComment,
      result: moderationResult
    });
    
    // ... 返回响应 ...
  } catch (error) {
    next(error);
  }
};
```

### 3. 添加管理接口

在 `admin.js` 路由中添加审核管理接口：

```javascript
const aiModeration = require('../plugins/commentModeration');

// 获取审核统计
router.get('/moderation/stats', auth, adminOnly, async (req, res) => {
  try {
    const stats = await aiModeration.getModerationStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 重新审核内容
router.post('/moderation/review', auth, adminOnly, async (req, res) => {
  try {
    const { content } = req.body;
    const result = await aiModeration.reModerate(content);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 手动审核评论
router.patch('/comments/:id/moderate', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const result = await aiModeration.manualReview(id, action, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## API 参考

### moderateContent(content, options)

审核评论内容。

**参数：**
- `content` (string): 评论内容
- `options` (Object): 可选参数
  - `userId`: 用户ID
  - `ip`: 用户IP

**返回：**
```javascript
{
  status: 'pass' | 'pending' | 'reject',
  reason: string,
  risk: 'low' | 'medium' | 'high',
  aiResult: Object,
  sensitiveWords: string[],
  moderationSource: string[]
}
```

### beforeCommentSubmit(event, context)

评论提交前钩子。

**参数：**
- `event.comment`: 评论数据
- `context.ip`: 用户IP

### afterCommentSubmit(event, context)

评论提交后钩子，用于发送通知。

### manualReview(commentId, action, reason)

手动审核评论。

**参数：**
- `commentId` (string): 评论ID
- `action` (string): 'approve' 或 'reject'
- `reason` (string): 审核原因

### getModerationStats()

获取审核统计信息。

**返回：**
```javascript
{
  total: number,
  pending: number,
  approved: number,
  rejected: number,
  moderationRate: string
}
```

## 配置说明

### aiModerationEnabled
- 类型: boolean
- 默认值: false
- 说明: 是否启用AI审核功能

### zhipuApiKey
- 类型: string
- 默认值: ''
- 说明: 智谱AI的API Key，从 https://open.bigmodel.cn/ 获取

### zhipuModel
- 类型: string
- 默认值: 'glm-4-flash'
- 可选值: 'glm-4-flash', 'glm-4', 'glm-4v', 'chatglm3-turbo'
- 说明: 使用的AI模型

### aiModerationThreshold
- 类型: string
- 默认值: 'medium'
- 可选值: 'low', 'medium', 'high'
- 说明: 审核阈值，越低越严格

### aiModerationTimeout
- 类型: number
- 默认值: 5000
- 单位: 毫秒
- 说明: API调用超时时间

### aiModerationMaxRetries
- 类型: number
- 默认值: 1
- 说明: API调用失败时的最大重试次数

## 审核规则

### 风险等级定义

- **low**: 安全内容，直接通过
- **medium**: 疑似违规，标记为待审核
- **high**: 确定违规，直接拒绝

### 审核内容类型

AI审核会检查以下违规类型：

1. 暴力、恐怖内容
2. 色情、淫秽内容
3. 政治敏感内容
4. 广告、垃圾信息
5. 人身攻击、侮辱谩骂
6. 谣言、虚假信息
7. 违法犯罪相关内容
8. 侵犯隐私内容

### 降级策略

当AI服务不可用时：
- 如果敏感词检查发现问题 → 标记待审核
- 如果无敏感词问题 → 允许通过（fail-safe）

## 智谱AI API

- 文档: https://open.bigmodel.cn/dev/api
- 模型: glm-4-flash（免费版）/ glm-4（标准版）
- 接口: https://open.bigmodel.cn/api/paas/v4/chat/completions

## 常见问题

### Q: AI审核和管理员审核是什么关系？
**A:** 采用"任意一方通过即通过"的逻辑：
- AI审核通过 → 评论直接发布
- AI审核不通过 → 进入待审核，等待管理员审核
- 管理员审核通过 → 评论发布

### Q: 如何关闭AI审核？
**A:** 在系统设置中将 `aiModerationEnabled` 设为 false。

### Q: AI审核失败怎么办？
**A:** 系统采用 fail-safe 原则，AI服务不可用时会降级处理，不影响正常评论。

### Q: 如何添加自定义敏感词？
**A:** 在系统设置中配置 `sensitiveWords` 数组。

## 更新日志

### v2.0.0
- 重命名审核模块文件名
- 更新文档说明，明确 AI + 管理员双重审核机制

### v1.0.0
- 初始版本
- 支持智谱AI内容审核
- 支持敏感词二次校验
- 支持三级风险管控
- 支持错误降级处理