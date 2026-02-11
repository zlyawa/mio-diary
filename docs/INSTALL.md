# 安装指南

## 环境要求

- Node.js 18+
- npm 9+
- Git 2+

## 快速安装

### 方法一：一键安装脚本（推荐）

使用一键安装脚本，自动完成依赖安装、JWT 密钥生成和服务启动：

```bash
# 克隆项目
git clone https://github.com/your-username/mio-diary-project.git
cd mio-diary-project

# 运行一键安装脚本
bash install.sh

# 或者直接执行
./install.sh
```

脚本功能：
- ✅ 自动检查 Node.js 版本
- ✅ 自动生成安全的 JWT 密钥（替换默认值）
- ✅ 安装后端依赖
- ✅ 安装前端依赖
- ✅ 启动前后端服务

安装完成后，访问 `http://localhost:5173` 即可使用应用。

**交互式菜单**：
```bash
./install.sh
```
会显示交互式菜单，可选择：
1. 安装
2. 启动
3. 停止
4. 重启
5. 状态
6. 删除

**命令行模式**：
```bash
./install.sh install   # 安装依赖
./install.sh start     # 启动服务
./install.sh stop      # 停止服务
./install.sh restart   # 重启服务
./install.sh status    # 查看状态
./install.sh uninstall # 删除安装
```

### 方法二：手动安装

#### 1. 克隆项目

```bash
git clone https://github.com/your-username/mio-diary-project.git
cd mio-diary-project
```

#### 2. 后端设置

```bash
cd backend

# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma migrate dev

# 启动后端
npm start
```

#### 3. 前端设置

```bash
cd frontend

# 安装依赖（必须使用 --legacy-peer-deps）
npm install --legacy-peer-deps

# 启动前端
npm run dev
```

#### 4. 访问应用

- 前端：http://localhost:5173
- 后端API：http://localhost:3001/api

## 环境变量配置

### 后端配置 (backend/.env)

```bash
# 数据库配置 (SQLite)
DATABASE_URL="file:./dev.db"

# 服务器配置
PORT=3001
HOST=localhost
NODE_ENV=development

# JWT 密钥（安装时会自动生成随机密钥）
JWT_SECRET=mio-diary-secret-key-2026-must-be-at-least-32-chars-long
JWT_REFRESH_SECRET=mio-diary-refresh-secret-key-2026-must-be-at-least-32-chars-long

# JWT 过期时间
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 文件上传配置
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp
```

### 前端配置 (frontend/.env)

```bash
VITE_API_URL=http://localhost:3001/api
```

## 目录结构

```
mio-diary-project/
├── backend/          # 后端服务
│   ├── prisma/      # 数据库配置和迁移
│   ├── src/         # 源代码
│   └── uploads/     # 上传文件目录
├── frontend/        # 前端应用
│   ├── src/         # 源代码
│   └── public/      # 静态资源
├── docs/            # 项目文档
│   ├── INSTALL.md   # 安装指南
│   ├── DEVELOPMENT.md # 开发指南
│   ├── CHANGELOG.md # 更新日志
│   └── GITHUB.md    # GitHub 说明
├── screenshots/     # 功能截图
├── install.sh       # 一键安装脚本
└── README.md        # 项目说明
```

## 常见问题

### 端口被占用

```bash
# 查找占用进程
lsof -i :3001  # 后端
lsof -i :5173  # 前端

# 杀死进程
kill -9 <PID>

# 或修改 .env 中的 PORT 值
```

### 数据库错误

```bash
cd backend

# 重置数据库
npx prisma migrate reset
```

### 依赖安装失败

```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm cache clean --force

# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install --legacy-peer-deps
```

### JWT 密钥安全性

默认 JWT 密钥为示例值，生产环境必须修改：

- **方法一**：使用一键安装脚本，自动生成随机密钥
- **方法二**：手动编辑 `backend/.env`，替换 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`

密钥应至少 32 字符，建议使用随机字符串。

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