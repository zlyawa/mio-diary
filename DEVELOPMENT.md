# 开发指南

## 开发环境设置

### 启动开发服务器

```bash
# 后端（自动重启）
cd backend
npm run dev

# 前端（热更新）
cd frontend
npm run dev
```

### 运行测试

```bash
# 后端测试
cd backend
npm test

# 前端构建测试
cd frontend
npm run build
```

## 项目结构

### 后端

```
backend/
├── src/
│   ├── controllers/   # 控制器
│   ├── middleware/    # 中间件
│   ├── routes/        # 路由
│   ├── utils/         # 工具函数
│   └── config/        # 配置
├── prisma/            # 数据库模型
└── uploads/           # 上传文件
```

### 前端

```
frontend/
├── src/
│   ├── components/    # 组件
│   ├── pages/         # 页面
│   ├── context/       # React Context
│   └── utils/         # 工具函数
└── public/            # 静态资源
```

## 数据库操作

### 运行迁移

```bash
cd backend
npx prisma migrate dev
```

### 重置数据库

```bash
cd backend
npx prisma migrate reset
```

### 查看数据库

```bash
cd backend
npx prisma studio
```

## API 接口

### 认证

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出

### 日记

- `GET /api/diaries` - 获取日记列表
- `POST /api/diaries` - 创建日记
- `GET /api/diaries/:id` - 获取日记详情
- `PUT /api/diaries/:id` - 更新日记
- `DELETE /api/diaries/:id` - 删除日记

### 用户

- `GET /api/profile/:username` - 获取用户主页
- `PUT /api/profile/` - 更新个人资料
- `POST /api/profile/avatar` - 上传头像

详细 API 文档见 `docs/API.md`

## 代码规范

### 前端

- 使用函数式组件和 Hooks
- 遵循 ESLint 规则
- 组件使用 PascalCase 命名
- 文件名与组件名一致

### 后端

- 使用 async/await
- 统一错误处理
- 控制器只处理业务逻辑
- 验证逻辑放在中间件

## 提交代码

```bash
# 检查代码规范
npm run lint

# 构建测试
npm run build

# 提交
git add .
git commit -m "your message"
git push
```