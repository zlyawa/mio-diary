# 安装指南

本文档提供 Mio Diary v2.1.0 项目的详细安装步骤。

## 目录

- [环境要求](#环境要求)
- [快速安装](#快速安装)
- [手动安装](#手动安装)
- [Redis 安装](#redis-安装)
- [环境变量配置](#环境变量配置)
- [生产部署](#生产部署)
- [宝塔面板部署](#宝塔面板部署)
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

## 宝塔面板部署

宝塔面板是一个流行的服务器管理工具，提供可视化界面管理服务器。以下介绍如何在宝塔面板中部署 Mio Diary。

### 前置要求

- 已安装宝塔面板的服务器
- 域名（可选，也可使用 IP 访问）

### 步骤 1：安装运行环境

1. 登录宝塔面板
2. 进入 **软件商店**
3. 安装以下软件：
   - **Nginx**（必需）
   - **PM2管理器**（必需，用于管理 Node.js 进程）
   - **Node.js版本管理器**（必需，安装 Node.js 环境）
   - **Redis**（必需，用于验证码存储和登录限流）

4. 安装 Node.js 版本：
   - 点击 Node.js版本管理器 → 版本管理
   - 安装 Node.js 18.x 或以上版本
   - 设置为命令行版本

5. 启动 Redis：
   - 安装完成后，点击 Redis → 设置
   - 确保服务状态为"运行中"
   - 如需设置密码，在配置文件中修改 `requirepass`

### 步骤 2：上传项目文件

1. 在宝塔面板左侧点击 **文件**
2. 进入 `/www/wwwroot` 目录
3. 创建文件夹 `mio-diary`
4. 上传项目文件：

**方式一：上传压缩包**
```bash
# 本地打包
cd /path/to/mio-diary
zip -r mio-diary.zip backend frontend

# 上传后解压
```

**方式二：Git 克隆（推荐）**
```bash
# 在宝塔终端执行
cd /www/wwwroot
git clone https://github.com/zlyawa/mio-diary.git
```

### 步骤 3：配置后端环境变量

1. 创建环境变量文件：
```bash
cd /www/wwwroot/mio-diary/backend
cp .env.example .env
```

2. 编辑 `.env` 文件，修改以下配置：
```bash
# 数据库（保持默认）
DATABASE_URL="file:./dev.db"

# JWT密钥（必须修改为随机字符串，至少32位）
JWT_SECRET="请替换为32位以上的随机字符串"
JWT_REFRESH_SECRET="请替换为另一个32位以上的随机字符串"

# 服务器配置
NODE_ENV="production"
PORT="3001"
HOST="0.0.0.0"

# 前端地址（修改为你的域名）
FRONTEND_URL="https://your-domain.com"

# Redis配置（如果设置了密码需要填写）
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
REDIS_PASSWORD=""
```

### 步骤 4：安装后端依赖

```bash
cd /www/wwwroot/mio-diary/backend
npm install --production
npx prisma generate
```

### 步骤 5：初始化数据库

```bash
cd /www/wwwroot/mio-diary/backend

# 运行数据库迁移
npx prisma migrate deploy

# 如果上面的命令报错，使用以下命令初始化
npx prisma db push
```

### 步骤 6：配置前端环境变量

在构建前端之前，需要先配置前端环境变量：

```bash
# 创建前端环境变量文件（使用你的域名）
echo 'VITE_API_URL=https://your-domain.com/api' > /www/wwwroot/mio-diary/frontend/.env

# 如果使用HTTP（无SSL）
# echo 'VITE_API_URL=http://your-domain.com/api' > /www/wwwroot/mio-diary/frontend/.env
```

### 步骤 7：构建前端

通过 SSH 终端或宝塔面板的终端执行：

```bash
cd /www/wwwroot/mio-diary/frontend
npm install --legacy-peer-deps
npm run build
```

构建完成后，前端文件位于 `dist/` 目录。

### 步骤 8：创建网站

1. 在宝塔面板左侧点击 **网站**
2. 点击 **添加站点**
3. 填写信息：
   - **域名**：你的域名（如 `diary.example.com`）或 IP
   - **根目录**：`/www/wwwroot/mio-diary/frontend/dist`
   - **PHP版本**：纯静态（不需要 PHP）
   - **数据库**：不创建（项目使用 SQLite）

4. 点击 **提交**

### 步骤 9：配置 Nginx（关键步骤）

宝塔面板创建网站后会自动生成配置，需要完全替换为以下配置：

1. 点击站点 → **设置** → **配置文件**
2. **删除原有内容**，替换为以下完整配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或服务器IP
    
    # 前端静态文件根目录
    root /www/wwwroot/mio-diary/frontend/dist;
    index index.html index.htm;

    # 开启 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;
    gzip_comp_level 6;

    # 文件上传大小限制
    client_max_body_size 20M;

    # API 代理（注意：放在 location / 之前）
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # 上传文件代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态资源缓存（放在 location / 之前）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA 路由支持（放在最后）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }

    # 访问日志和错误日志
    access_log /www/wwwlogs/mio-diary.access.log;
    error_log /www/wwwlogs/mio-diary.error.log;
}
```

3. 保存后，点击 **重载配置**

> **重要**：`location /api/` 和 `location /uploads/` 必须放在 `location /` 之前，否则会被SPA路由拦截导致404错误。

### 步骤 10：设置文件权限

```bash
# 设置上传目录权限（确保可以写入文件）
chmod -R 755 /www/wwwroot/mio-diary/backend/uploads
chown -R www:www /www/wwwroot/mio-diary/backend/uploads

# 设置数据库文件权限
chmod 644 /www/wwwroot/mio-diary/backend/prisma/dev.db
chown www:www /www/wwwroot/mio-diary/backend/prisma/dev.db
```

### 步骤 11：使用 PM2 启动后端

1. 在宝塔面板点击 **软件商店** → **PM2管理器** → **设置**
2. 点击 **添加项目**：
   - **项目名称**：`mio-diary`
   - **运行目录**：`/www/wwwroot/mio-diary/backend`
   - **启动文件**：`src/server.js`
   - **端口**：`3001`

3. 或通过命令行：
```bash
cd /www/wwwroot/mio-diary/backend
pm2 start src/server.js --name "mio-diary"
pm2 save
```

### 步骤 12：配置 SSL（可选但推荐）

1. 点击站点 → **设置** → **SSL**
2. 选择 **Let's Encrypt**
3. 勾选域名，点击 **申请**
4. 开启 **强制HTTPS**

> **注意**：开启SSL后，需要更新前端环境变量中的 `VITE_API_URL` 为 https 地址，并重新构建前端。

### 步骤 13：放行端口

在宝塔面板 **安全** 中放行端口：
- `3001`（后端 API，内网访问，可不放行）
- `80`（HTTP）
- `443`（HTTPS）

### 宝塔部署文件结构

```
/www/wwwroot/mio-diary/
├── frontend/
│   ├── dist/              # 前端构建文件
│   ├── src/
│   └── package.json
└── backend/
    ├── src/
    │   └── server.js      # 入口文件
    ├── prisma/
    │   ├── schema.prisma
    │   └── dev.db         # SQLite 数据库
    ├── uploads/           # 上传文件目录
    └── package.json
```

### 宝塔常用操作

```bash
# 查看后端日志
pm2 logs mio-diary

# 重启后端
pm2 restart mio-diary

# 查看后端状态
pm2 status

# 重载 Nginx
nginx -s reload

# 查看端口占用
netstat -tlnp | grep 3001
```

### 宝塔常见问题

**1. PM2 启动失败**
- 检查 Node.js 版本是否 >= 18
- 检查依赖是否安装完整
- 查看错误日志：`pm2 logs mio-diary`

**2. 502 Bad Gateway**
- 确认 PM2 中后端服务正在运行
- 检查端口 3001 是否被占用

**3. 数据库连接错误**
- 确认 `prisma/dev.db` 文件存在
- 执行 `npx prisma generate` 生成客户端

**4. 上传文件失败**
- 检查 `backend/uploads` 目录权限
- 确认 Nginx 反向代理配置正确

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