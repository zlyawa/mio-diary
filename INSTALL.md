# 安装指南

## 环境要求

- Node.js 18+
- npm 或 yarn

## 快速安装

### 1. 克隆项目

```bash
git clone https://github.com/your-username/mio-diary-project.git
cd mio-diary-project
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 3. 配置环境变量

后端配置文件 `backend/.env` 已包含默认配置：

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
DATABASE_URL="file:./dev.db"
```

前端配置文件 `frontend/.env` 已包含默认配置：

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. 启动服务

使用一键脚本：

```bash
bash install.sh
```

或者手动启动：

```bash
# 启动后端
cd backend
npm start

# 启动前端（新终端）
cd frontend
npm run dev
```

### 5. 访问应用

- 前端：http://localhost:5173
- 后端API：http://localhost:3001/api

## 目录结构

```
mio-diary-project/
├── backend/          # 后端服务
├── frontend/         # 前端应用
├── docs/            # 文档
├── install.sh       # 一键安装脚本
└── README.md        # 项目说明
```

## 常见问题

### 端口被占用

修改 `backend/.env` 中的 `PORT` 值。

### 数据库错误

删除 `backend/prisma/dev.db` 文件，重新运行：

```bash
cd backend
npx prisma migrate reset
```

### 依赖安装失败

尝试使用淘宝镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```