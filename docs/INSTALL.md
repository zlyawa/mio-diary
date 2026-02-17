# 安装指南

本文档提供 Mio Diary v2.1.0 项目的详细安装步骤。

## 目录

- [环境要求](#环境要求)
- [快速安装](#快速安装)
- [手动安装](#手动安装)
- [Redis 安装](#redis-安装)
- [环境变量配置](#环境变量配置)
- [生产部署](#生产部署)
- [故障排除](#故障排除)

---

## 环境要求

### 必需组件

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | JavaScript 运行时 |
| npm | 9+ | 包管理器 |
| Git | 2+ | 版本控制 |
| Redis | 6+ | 验证码存储、登录限流（必需） |

> **重要**：Redis 是必需组件，用于存储图片验证码、邮箱验证码和登录限流数据。未安装 Redis 将导致注册、忘记密码等功能无法正常使用。

---

## 快速安装

### 使用 mio.sh 脚本（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/zlyawa/mio-diary.git
cd mio-diary

# 2. 启动 Redis（必需）
docker-compose -f docker-compose.redis.yml up -d
# 或使用本地安装的 Redis: sudo systemctl start redis-server

# 3. 一键安装
./mio.sh install

# 4. 启动服务
./mio.sh start-log
```

安装脚本会自动：
- 安装 Node.js 依赖
- 初始化 SQLite 数据库
- 创建环境变量配置文件
- 启动后端和前端服务

访问 `http://localhost:5173` 即可使用。

> **注意**：如果 Redis 未启动，注册和忘记密码功能将无法使用。

---

## 手动安装

如果需要更细粒度的控制，可以按以下步骤手动安装。

### 1. 克隆项目

```bash
git clone https://github.com/zlyawa/mio-diary.git
cd mio-diary
```

### 2. 启动 Redis

```bash
# 使用 Docker（推荐）
docker-compose -f docker-compose.redis.yml up -d

# 或使用本地安装
sudo systemctl start redis-server  # Linux
brew services start redis          # macOS
```

验证 Redis 是否运行：
```bash
redis-cli ping
# 应返回 PONG
```

### 3. 安装后端

```bash
cd backend

# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# 创建环境变量文件
cp .env.example .env
```

### 3. 安装前端

```bash
cd ../frontend

# 安装依赖
npm install --legacy-peer-deps

# 创建环境变量文件
echo "VITE_API_URL=http://localhost:3001/api" > .env
```

---

## Redis 安装（必需）

Redis 用于存储验证码和登录限流数据，是系统必需组件。

### 使用 Docker（推荐）

```bash
# 启动 Redis
docker-compose -f docker-compose.redis.yml up -d

# 查看状态
docker-compose -f docker-compose.redis.yml ps

# 停止 Redis
docker-compose -f docker-compose.redis.yml down
```

### 本地安装（Linux）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# 启动 Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 验证
redis-cli ping
```

### macOS

```bash
brew install redis
brew services start redis
```

---

## 环境变量配置

### 后端配置 (`backend/.env`)

```bash
# ===========================================
# 基础配置
# ===========================================

# 数据库配置
DATABASE_URL="file:./dev.db"

# JWT配置（生产环境请使用至少32位的强密钥）
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# 服务器配置
NODE_ENV="development"
PORT="3001"
HOST="localhost"

# 前端URL（用于生成邮件、分享链接中的URL）
FRONTEND_URL="http://localhost:5173"

# ===========================================
# Redis配置（可选）
# ===========================================
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# ===========================================
# 配置加密密钥（安装时自动生成）
# ===========================================
CONFIG_ENCRYPTION_KEY="your-32-char-encryption-key"
CONFIG_ENCRYPTION_IV="your-16-char-iv"

# ===========================================
# 邮件服务配置（可选）
# ===========================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Mio Diary <noreply@miodiary.com>"

# ===========================================
# 安全配置
# ===========================================
BCRYPT_ROUNDS="12"
EMAIL_REJECT_UNAUTHORIZED="true"
```

### 前端配置 (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:3001/api
```

---

## 启动服务

### 方式一：使用 mio.sh 脚本

```bash
# 启动服务（后端 + 前端）
./mio.sh start-log

# 查看服务状态
./mio.sh status
```

### 方式二：手动启动

#### 1. 启动后端

```bash
cd backend
npm start
```

#### 2. 启动前端

```bash
cd frontend
npm run dev
```

---

## 验证安装

### 1. 检查服务状态

```bash
# 检查后端
curl http://localhost:3001/api/health

# 检查前端
curl http://localhost:5173

# 检查 Redis
redis-cli ping
# 应返回 PONG
```

### 2. 访问应用

- **主应用**：http://localhost:5173
- **后端 API**：http://localhost:3001/api

### 3. 首次使用

1. 访问 `http://localhost:5173`
2. 点击 "注册" 创建第一个账号
3. **第一个注册的账号自动成为管理员**
4. 登录后可在右上角用户菜单中进入 "管理后台"

### 4. 配置 AI 审核（可选）

1. 进入管理后台 → 系统设置
2. 开启 "评论审核" 开关
3. 开启 "AI 审核" 开关
4. 配置智谱 AI API Key（[获取地址](https://open.bigmodel.cn/)）
5. 使用 "测试 AI 审核" 按钮验证配置

---

## 生产部署

### 1. 构建前端

```bash
cd frontend
npm run build
```

构建后的文件在 `frontend/dist/` 目录。

### 2. 配置生产环境变量

编辑 `backend/.env`：

```bash
NODE_ENV="production"
HOST="0.0.0.0"
CORS_ORIGINS="https://your-domain.com"
FRONTEND_URL="https://your-domain.com"
```

### 3. 使用 Nginx 部署

详见 [NGINX.md](./NGINX.md)

---

## 环境变量清单

### 后端环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | 是 | `file:./dev.db` | SQLite 数据库路径 |
| `JWT_SECRET` | 是 | - | JWT 签名密钥（≥32位） |
| `JWT_REFRESH_SECRET` | 是 | - | JWT 刷新密钥（≥32位） |
| `PORT` | 否 | `3001` | 后端服务端口 |
| `HOST` | 否 | `localhost` | 服务器绑定地址 |
| `NODE_ENV` | 否 | `development` | 运行环境 |
| `FRONTEND_URL` | 否 | - | 前端地址（用于邮件） |
| `CORS_ORIGINS` | 否 | - | 允许的跨域来源 |
| `REDIS_HOST` | 否 | `localhost` | Redis 地址 |
| `REDIS_PORT` | 否 | `6379` | Redis 端口 |
| `SMTP_HOST` | 否 | - | SMTP 服务器 |
| `SMTP_PORT` | 否 | `587` | SMTP 端口 |
| `SMTP_USER` | 否 | - | SMTP 用户名 |
| `SMTP_PASS` | 否 | - | SMTP 密码 |
| `CONFIG_ENCRYPTION_KEY` | 否 | - | 配置加密密钥（32位） |
| `CONFIG_ENCRYPTION_IV` | 否 | - | 配置加密IV（16位） |

### 前端环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_API_URL` | 是 | - | 后端 API 地址 |

---

## 故障排除

### 端口冲突

```bash
# 查找占用端口的进程
lsof -i :3001  # 后端
lsof -i :5173  # 前端

# 终止进程
kill -9 <PID>
```

### 依赖安装失败

```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm cache clean --force

# 重新安装
npm install --legacy-peer-deps
```

### 数据库问题

```bash
# 重置数据库
cd backend
npx prisma migrate reset

# 查看数据库
npx prisma studio
```

### Redis 连接失败

```bash
# 检查 Redis 是否运行
redis-cli ping

# 如果使用 Docker
docker-compose -f docker-compose.redis.yml ps
docker-compose -f docker-compose.redis.yml logs redis
```

---

## 下一步

- [配置 Nginx](./NGINX.md) - 生产环境部署
- [开发指南](./DEVELOPMENT.md) - API 文档和开发规范
- [Redis 集成](./REDIS.md) - Redis 使用说明