# 开发指南

## 开发环境

```bash
# 后端
cd backend && npm start

# 前端
cd frontend && npm run dev
```

## 项目结构

```
mio-diary/
├── backend/
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── routes/         # 路由
│   │   └── utils/          # 工具函数
│   ├── prisma/            # 数据库
│   └── uploads/           # 上传文件
├── frontend/
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── context/       # Context
│   │   ├── pages/         # 页面
│   │   └── utils/         # 工具函数
│   └── public/            # 静态资源
└── docs/                  # 文档
```

## 数据库操作

```bash
cd backend

npx prisma generate      # 生成客户端
npx prisma migrate dev   # 运行迁移
npx prisma migrate reset # 重置数据库
npx prisma studio        # 可视化管理
```

## API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/captcha | 获取图片验证码 |
| PUT | /api/auth/username | 修改用户名 |
| POST | /api/auth/forgot-password | 忘记密码 |
| POST | /api/auth/reset-password | 重置密码 |

### 日记
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/diaries | 日记列表 |
| POST | /api/diaries | 创建日记 |
| GET | /api/diaries/:id | 日记详情 |
| PUT | /api/diaries/:id | 更新日记 |
| DELETE | /api/diaries/:id | 删除日记 |

### 用户
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/profile | 获取个人资料 |
| PUT | /api/profile | 更新个人资料 |
| PUT | /api/profile/avatar | 更新头像 |
| PUT | /api/profile/background | 更新背景图 |

### 通知
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/notifications | 通知列表 |
| GET | /api/notifications/unread-count | 未读数量 |
| PUT | /api/notifications/:id/read | 标记已读 |
| PUT | /api/notifications/read-all | 全部已读 |
| DELETE | /api/notifications/:id | 删除通知 |
| DELETE | /api/notifications/clear-all | 清空通知 |

### 管理员
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/dashboard | 仪表盘统计 |
| GET | /api/admin/users | 用户列表 |
| PUT | /api/admin/users/:id/ban | 封禁用户 |
| PUT | /api/admin/users/:id/reset-password | 重置密码 |
| GET | /api/admin/diaries | 日记列表 |
| GET | /api/admin/reviews | 待审核列表 |
| PUT | /api/admin/reviews/:id | 审核日记 |
| GET | /api/admin/settings | 系统配置 |
| PUT | /api/admin/settings | 更新配置 |

### 公共配置
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/config/public | 公开配置 |
| GET | /api/config/export | 导出数据库(.sql) |
| POST | /api/config/import | 导入数据库(.sql/.db) |
| GET | /api/config/stats | 系统统计信息 |
| GET | /api/config/version | 版本信息 |

## 代码规范

### 提交规范
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `refactor`: 重构

### 前端规范
- 使用函数式组件和Hooks
- 组件使用PascalCase命名
- 安装依赖使用 `--legacy-peer-deps`

### 后端规范
- 使用async/await
- 统一错误处理
- 验证逻辑放中间件