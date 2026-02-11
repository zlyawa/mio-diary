# 开发指南

## 开发环境设置

### 启动开发服务器

**使用一键脚本**：
```bash
./install.sh start
```

**手动启动**：
```bash
# 后端（在 backend 目录）
cd backend
npm start

# 前端（在 frontend 目录，新终端）
cd frontend
npm run dev
```

### 前端构建测试

```bash
cd frontend
npm run build
npm run lint
```

## 项目结构

### 后端

```
backend/
├── src/
│   ├── controllers/       # 控制器
│   │   ├── authController.js
│   │   ├── diaryController.js
│   │   ├── profileController.js
│   │   └── uploadController.js
│   ├── middleware/        # 中间件
│   │   ├── asyncHandler.js
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── upload.js
│   │   └── validator.js
│   ├── routes/            # 路由
│   │   ├── auth.js
│   │   ├── diaries.js
│   │   ├── profile.js
│   │   └── upload.js
│   ├── config/            # 配置
│   │   └── database.js
│   ├── utils/             # 工具函数
│   │   ├── jwt.js
│   │   └── response.js
│   ├── app.js
│   └── server.js
├── prisma/                # 数据库模型
│   ├── schema.prisma
│   └── migrations/
└── uploads/               # 上传文件
    ├── avatars/
    └── backgrounds/
```

### 前端

```
frontend/
├── src/
│   ├── components/        # 组件
│   │   ├── common/        # 通用组件
│   │   │   ├── ErrorMessage.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   └── SuccessMessage.jsx
│   │   ├── diary/         # 日记组件
│   │   │   ├── ImageUploader.jsx
│   │   │   ├── MoodSelector.jsx
│   │   │   ├── QuillEditor.jsx
│   │   │   └── TagInput.jsx
│   │   ├── layout/        # 布局组件
│   │   │   └── Header.jsx
│   │   └── profile/       # 个人资料组件
│   │       ├── AvatarUploader.jsx
│   │       └── BackgroundUploader.jsx
│   ├── context/           # React Context
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── pages/             # 页面
│   │   ├── Dashboard.jsx
│   │   ├── DiaryDetail.jsx
│   │   ├── DiaryForm.jsx
│   │   ├── DiaryList.jsx
│   │   ├── Features.jsx
│   │   ├── Login.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Register.jsx
│   │   └── SettingsPage.jsx
│   ├── utils/             # 工具函数
│   │   └── api.js
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
└── public/                # 静态资源
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

### 生成 Prisma Client

```bash
cd backend
npx prisma generate
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
- `GET /api/profile/me` - 获取当前用户信息
- `PUT /api/profile/` - 更新个人资料
- `PUT /api/profile/password` - 修改密码
- `POST /api/profile/avatar` - 上传头像
- `POST /api/profile/background` - 上传背景图
- `DELETE /api/profile/background` - 删除背景图

### 上传

- `POST /api/upload/image` - 上传图片

## 代码规范

### 前端

- 使用函数式组件和 Hooks
- 遵循 ESLint 规则
- 组件使用 PascalCase 命名
- 文件名与组件名一致
- 使用 `npm install --legacy-peer-deps` 安装依赖

### 后端

- 使用 async/await
- 统一错误处理
- 控制器只处理业务逻辑
- 验证逻辑放在中间件

## 提交代码

```bash
# 前端检查
cd frontend
npm run lint

# 提交
git add .
git commit -m "feat: 新功能描述"
git push
```

## 技术栈

### 后端
- Node.js 18+
- Express 4.21.2
- Prisma 6.2.1
- SQLite 3
- JWT 9.0.2
- Bcrypt 2.4.3
- Multer 2.0.0-rc.4
- Sharp 0.34.5

### 前端
- React 18.3.1
- Vite 6.0.3
- Tailwind CSS 3.4.17
- React Router 7.1.1
- React Quill 2.0.0-beta.4
- Quill 2.0.3
- Axios 1.7.9
- React Image Crop 11.0.10