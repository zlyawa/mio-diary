# 开发指南

## 目录

- [开发环境](#开发环境)
- [项目结构](#项目结构)
- [数据库操作](#数据库操作)
- [API 接口](#api-接口)
- [审核系统](#审核系统)
- [AI 内容审核](#ai-内容审核)
- [代码规范](#代码规范)
- [常见问题](#常见问题)

---

## 开发环境

### 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 必须 |
| npm | 9+ | 必须 |
| Redis | 6+ | 必须（验证码、限流、缓存） |

### 启动开发服务

```bash
# 方式一：使用管理脚本
./mio.sh start-log

# 方式二：分别启动
cd backend && npm start      # 后端 :3001
cd frontend && npm run dev   # 前端 :5173
```

### 热重载

- 前端：Vite 自动热重载
- 后端：使用 nodemon，修改代码自动重启

---

## 项目结构

```
mio-diary/
├── backend/                    # 后端服务
│   ├── prisma/                # 数据库
│   │   ├── schema.prisma      # 数据模型
│   │   ├── migrations/        # 迁移文件
│   │   └── dev.db             # SQLite 数据库
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── database.js    # 数据库配置
│   │   │   └── redis.js       # Redis 配置
│   │   ├── controllers/       # 控制器
│   │   │   ├── adminController.js    # 管理员接口
│   │   │   ├── authController.js     # 认证接口
│   │   │   ├── categoryController.js # 分类接口
│   │   │   ├── commentController.js  # 评论接口
│   │   │   ├── diaryController.js    # 日记接口
│   │   │   ├── interactionController.js # 点赞/收藏
│   │   │   ├── statsController.js    # 统计接口
│   │   │   └── uploadController.js   # 上传接口
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.js        # 认证中间件
│   │   │   ├── errorHandler.js # 错误处理
│   │   │   ├── ipBlacklist.js # IP黑名单
│   │   │   ├── maintenance.js # 维护模式
│   │   │   ├── rateLimiter.js # 限流
│   │   │   ├── upload.js      # 文件上传
│   │   │   └── validator.js   # 参数验证
│   │   ├── plugins/           # 插件
│   │   │   ├── commentModeration.js    # AI评论审核
│   │   │   └── moderationConfig.js     # 审核配置
│   │   ├── routes/            # 路由
│   │   ├── services/          # 服务层
│   │   │   ├── aiModeration.js        # AI审核服务
│   │   │   ├── aiModerationQueue.js   # 审核队列
│   │   │   ├── cacheService.js        # 缓存服务
│   │   │   └── rateLimiter.js         # 限流服务
│   │   ├── utils/             # 工具函数
│   │   │   ├── emailService.js # 邮件服务
│   │   │   ├── fileUtil.js    # 文件工具
│   │   │   ├── jwt.js         # JWT工具
│   │   │   ├── logger.js      # 日志工具
│   │   │   ├── notification.js # 通知服务
│   │   │   └── response.js    # 响应格式化
│   │   ├── app.js             # Express 应用
│   │   └── server.js          # 服务器入口
│   ├── tests/                 # 测试文件
│   ├── uploads/               # 上传文件
│   │   ├── avatars/           # 头像
│   │   ├── backgrounds/       # 背景图
│   │   └── comments/          # 评论图片
│   └── package.json
│
├── frontend/                  # 前端应用
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   ├── admin/         # 管理员组件
│   │   │   ├── comments/      # 评论组件
│   │   │   ├── common/        # 通用组件
│   │   │   ├── diary/         # 日记组件
│   │   │   ├── interactions/  # 互动组件
│   │   │   ├── layout/        # 布局组件
│   │   │   └── profile/       # 个人主页组件
│   │   ├── context/           # React Context
│   │   │   ├── AuthContext.jsx    # 认证状态
│   │   │   ├── ConfigContext.jsx  # 系统配置
│   │   │   ├── ThemeContext.jsx   # 主题状态
│   │   │   └── ToastContext.jsx   # Toast 通知
│   │   ├── pages/             # 页面
│   │   ├── services/          # 前端服务
│   │   └── utils/             # 工具函数
│   ├── public/                # 静态资源
│   └── package.json
│
├── docs/                      # 文档
├── logs/                      # 日志
└── mio.sh                     # 管理脚本
```

---

## 数据库操作

### Prisma 常用命令

```bash
cd backend

# 生成 Prisma 客户端
npx prisma generate

# 创建迁移
npx prisma migrate dev --name <migration_name>

# 推送数据库变更（开发环境）
npx prisma db push

# 重置数据库（会删除所有数据）
npx prisma migrate reset

# 打开 Prisma Studio 可视化管理
npx prisma studio

# 格式化 schema 文件
npx prisma format
```

### 数据模型

```prisma
// 用户模型
model User {
  id            String         @id @default(uuid())
  username      String         @unique
  email         String         @unique
  password      String
  avatarUrl     String?
  backgroundUrl String?
  bio           String?
  role          String         @default("user")  // user, admin
  isBanned      Boolean        @default(false)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  diaries       Diary[]
  comments      Comment[]
  likes         DiaryLike[]
  favorites     Favorite[]
  notifications Notification[]
}

// 日记模型
model Diary {
  id          String     @id @default(uuid())
  title       String
  content     String
  mood        String?
  tags        String?
  images      String?
  status      String     @default("approved")  // pending, approved, rejected
  userId      String
  categoryId  String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category?  @relation(fields: [categoryId], references: [id])
  comments    Comment[]
  likes       DiaryLike[]
  favorites   Favorite[]
}

// 评论模型
model Comment {
  id               String               @id @default(uuid())
  content          String
  images           String?              // JSON数组存储图片URL
  userId           String
  diaryId          String
  parentId         String?
  status           String               @default("approved")
  auditReason      String?
  moderationSource String?
  moderatedAt      DateTime?
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  user             User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  diary            Diary                @relation(fields: [diaryId], references: [id], onDelete: Cascade)
  parent           Comment?             @relation("CommentToComment", fields: [parentId], references: [id])
  replies          Comment[]            @relation("CommentToComment")
  likes            CommentLike[]
  reports          CommentReport[]
}

// 分类模型
model Category {
  id        String   @id @default(uuid())
  name      String
  color     String?
  parentId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  parent    Category?  @relation("CategoryToCategory", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryToCategory")
  diaries   Diary[]
}
```

---

## API 接口

### 认证 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 用户注册 | ❌ |
| POST | /api/auth/login | 用户登录 | ❌ |
| POST | /api/auth/logout | 用户登出 | ✅ |
| POST | /api/auth/refresh-token | 刷新令牌 | ✅ |
| GET | /api/auth/captcha | 获取图片验证码 | ❌ |
| PUT | /api/auth/username | 修改用户名 | ✅ |
| POST | /api/auth/forgot-password | 忘记密码 | ❌ |
| POST | /api/auth/reset-password | 重置密码 | ❌ |
| POST | /api/auth/send-verify-code | 发送验证码 | ❌ |

### 日记 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/diaries | 日记列表 | ✅ |
| POST | /api/diaries | 创建日记 | ✅ |
| GET | /api/diaries/:id | 日记详情 | ✅ |
| PUT | /api/diaries/:id | 更新日记 | ✅ |
| DELETE | /api/diaries/:id | 删除日记 | ✅ |
| GET | /api/diaries/dashboard/stats | 仪表盘统计 | ✅ |

### 分类 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/categories | 分类列表 | ✅ |
| POST | /api/categories | 创建分类 | ✅ |
| PUT | /api/categories/:id | 更新分类 | ✅ |
| DELETE | /api/categories/:id | 删除分类 | ✅ |

### 评论 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/comments/:diaryId | 获取日记评论 | 可选 |
| POST | /api/comments | 发表评论 | ✅ |
| PUT | /api/comments/:id | 更新评论 | ✅ |
| DELETE | /api/comments/:id | 删除评论 | ✅ |
| POST | /api/comments/:commentId/like | 点赞评论 | ✅ |
| GET | /api/comments/:commentId/replies | 回复列表 | 可选 |
| GET | /api/comments/my/list | 我的评论列表 | ✅ |
| GET | /api/comments/admin/list | 管理员评论列表 | ✅ (管理员) |
| PATCH | /api/comments/:id/review | 审核评论 | ✅ (管理员) |
| POST | /api/comments/batch-review | 批量审核 | ✅ (管理员) |
| POST | /api/comments/batch-delete | 批量删除 | ✅ (管理员) |

### 互动 API (点赞/收藏)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/interactions/like/:diaryId | 点赞/取消点赞 | ✅ |
| GET | /api/interactions/likes/:diaryId | 获取点赞状态 | 可选 |
| POST | /api/interactions/favorite/:diaryId | 收藏/取消收藏 | ✅ |
| GET | /api/interactions/favorites | 收藏列表 | ✅ |
| POST | /api/interactions/folders | 创建收藏夹 | ✅ |
| GET | /api/interactions/folders | 收藏夹列表 | ✅ |

### 统计 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/stats/all | 所有统计数据 | ✅ |
| GET | /api/stats/heatmap | 写作热力图 | ✅ |
| GET | /api/stats/mood-trend | 心情趋势 | ✅ |
| GET | /api/stats/word-cloud | 词云数据 | ✅ |
| GET | /api/stats/habits | 写作习惯 | ✅ |

### 用户 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/profile | 获取个人资料 | ✅ |
| PUT | /api/profile | 更新个人资料 | ✅ |
| PUT | /api/profile/avatar | 更新头像 | ✅ |
| PUT | /api/profile/background | 更新背景图 | ✅ |
| GET | /api/profile/:username | 获取用户公开信息 | 可选 |

### 通知 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/notifications | 通知列表 | ✅ |
| GET | /api/notifications/unread-count | 未读数量 | ✅ |
| PUT | /api/notifications/:id/read | 标记已读 | ✅ |
| PUT | /api/notifications/read-all | 全部已读 | ✅ |
| DELETE | /api/notifications/:id | 删除通知 | ✅ |
| DELETE | /api/notifications/clear-all | 清空通知 | ✅ |

### 管理员 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/dashboard | 仪表盘统计 | ✅ (管理员) |
| GET | /api/admin/users | 用户列表 | ✅ (管理员) |
| PUT | /api/admin/users/:id/ban | 封禁用户 | ✅ (管理员) |
| PUT | /api/admin/users/:id/reset-password | 重置密码 | ✅ (管理员) |
| GET | /api/admin/diaries | 日记列表 | ✅ (管理员) |
| GET | /api/admin/reviews | 待审核列表 | ✅ (管理员) |
| PUT | /api/admin/reviews/:id | 审核日记 | ✅ (管理员) |
| GET | /api/admin/settings | 系统配置 | ✅ (管理员) |
| PUT | /api/admin/settings | 更新配置 | ✅ (管理员) |
| GET | /api/admin/health | 系统健康检查 | ✅ (管理员) |
| POST | /api/admin/test-email | 发送测试邮件 | ✅ (管理员) |
| POST | /api/admin/test-ai-moderation | 测试AI审核 | ✅ (管理员) |

### 公共配置 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/config/public | 公开配置 | ❌ |
| GET | /api/config/export | 导出数据库 | ✅ (管理员) |
| POST | /api/config/import | 导入数据库 | ✅ (管理员) |
| GET | /api/config/stats | 系统统计 | ❌ |
| GET | /api/config/version | 版本信息 | ❌ |

---

## 审核系统

### 日记审核流程

```
┌─────────────────────────────────────────────────────────────┐
│                    enableUserReview 开关                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     enableUserReview = false        enableUserReview = true
              │                               │
              ▼                               ▼
        日记直接发布                    进入管理员审核
                                      (status: pending)
                                              │
                                              ▼
                                      管理员审核操作
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
                          approved                       rejected
                              │                               │
                              ▼                               ▼
                         日记发布                       日记拒绝
```

### 评论审核流程

```
┌─────────────────────────────────────────────────────────────┐
│                  enableCommentReview 开关                    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
   enableCommentReview = false      enableCommentReview = true
              │                               │
              ▼                               ▼
        评论直接发布                    是否启用AI审核？
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
                    aiModerationEnabled = true    aiModerationEnabled = false
                              │                               │
                              ▼                               ▼
                         AI 审核评论                     直接进入管理员审核
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
           PASS           PENDING         REJECT
              │               │               │
              ▼               ▼               ▼
          直接发布      管理员审核       拒绝提交
```

---

## AI 内容审核

### 配置说明

在系统设置中配置 AI 审核：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| aiModerationEnabled | 是否启用 AI 审核 | false |
| zhipuApiKey | 智谱 AI API Key | - |
| zhipuModel | 使用的模型 | glm-4-flash |
| aiModerationThreshold | 审核阈值（low/medium/high） | medium |

### 审核结果

| 结果 | 说明 |
|------|------|
| pass | 内容安全，直接发布 |
| pending | 疑似违规，进入管理员审核队列 |
| reject | 高风险内容，拒绝提交 |

### 风险等级

| 等级 | 说明 |
|------|------|
| low | 安全内容 |
| medium | 疑似违规 |
| high | 确定违规 |

### 降级机制

当 AI 审核服务不可用时的降级策略：

1. **队列过载**：队列积压超过阈值时自动降级
2. **请求超时**：等待超过最大时间后降级
3. **API 错误**：连续失败后降级

降级后评论会进入管理员审核队列。

---

## 代码规范

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
refactor: 重构
style: 代码格式
test: 测试
chore: 构建/工具
```

### 前端规范

- 使用函数式组件和 Hooks
- 组件使用 PascalCase 命名
- 文件使用 camelCase 或 PascalCase
- 安装依赖使用 `--legacy-peer-deps`
- 使用 Tailwind CSS 进行样式

```javascript
// 组件示例
const MyComponent = ({ prop }) => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // 副作用
  }, [dependencies]);
  
  return (
    <div className="...">
      {/* 内容 */}
    </div>
  );
};

export default MyComponent;
```

### 后端规范

- 使用 async/await 处理异步
- 统一错误处理
- 验证逻辑放中间件
- 使用 Prisma 进行数据库操作

```javascript
// 控制器示例
const myController = async (req, res, next) => {
  try {
    const { param } = req.body;
    
    // 业务逻辑
    const result = await prisma.model.findMany({
      where: { param }
    });
    
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
```

---

## 常见问题

### 依赖安装失败

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3001  # 后端端口
lsof -i :5173  # 前端端口

# 终止进程
kill -9 <PID>
```

### 重置数据库

```bash
cd backend
npx prisma migrate reset
```

### Redis 连接失败

```bash
# 检查 Redis 状态
redis-cli ping

# 启动 Redis
redis-server

# 或使用 mio.sh
./mio.sh start
```

### 查看后端日志

```bash
./mio.sh log-backend
# 或
tail -f logs/backend.log
```

### 数据库迁移问题

```bash
# 强制推送数据库变更（开发环境）
cd backend
npx prisma db push

# 重置并重新迁移
npx prisma migrate reset
```

### JWT Token 失效

- 检查 JWT_SECRET 环境变量
- 清除浏览器 localStorage
- 重新登录

---

## 调试技巧

### 后端调试

```javascript
// 添加日志
console.log('[调试] 变量:', variable);

// 使用 Prisma 日志
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### 前端调试

```javascript
// React 开发者工具
// 浏览器控制台
console.log('状态:', state);

// 网络请求
// 使用浏览器开发者工具 Network 面板
```

### 数据库调试

```bash
# 打开 Prisma Studio
npx prisma studio

# 查看数据库结构
sqlite3 prisma/dev.db ".schema"

# 查询数据
sqlite3 prisma/dev.db "SELECT * FROM User;"
```