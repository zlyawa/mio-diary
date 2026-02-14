# Mio Diary Nginx 部署配置

本文档介绍如何使用 Nginx 部署 Mio Diary 项目。

## 部署架构

```
用户 → Nginx (80/443) → 前端静态文件
                     → /api/ → 后端 (3001)
                     → /uploads/ → 上传文件
```

## 部署步骤

### 1. 安装依赖

```bash
# Ubuntu/Debian
apt update
apt install nginx nodejs npm

# CentOS
yum install nginx nodejs npm
```

### 2. 构建前端

```bash
cd /path/to/mio-diary/frontend
npm install --legacy-peer-deps
npm run build
```

构建完成后，前端文件在 `dist/` 目录。

### 3. 部署文件

```bash
# 创建部署目录
mkdir -p /var/www/mio-diary

# 复制前端构建文件
cp -r /path/to/mio-diary/frontend/dist /var/www/mio-diary/frontend

# 复制后端源码
cp -r /path/to/mio-diary/backend /var/www/mio-diary/

# 复制数据库文件（可选）
cp /path/to/mio-diary/backend/prisma/dev.db /var/www/mio-diary/backend/prisma/
```

### 4. 安装后端依赖

```bash
cd /var/www/mio-diary/backend
npm install --production

# 生成 Prisma 客户端
npx prisma generate
```

### 5. 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/mio-diary`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名，或使用 localhost

    # 前端静态文件
    root /var/www/mio-diary/frontend/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
        
        # 静态资源缓存（可选）
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理到后端
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件代理
    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用配置：

```bash
# 删除默认配置（可选）
rm -f /etc/nginx/sites-enabled/default

# 启用本配置
ln -s /etc/nginx/sites-available/mio-diary /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 启动 Nginx
nginx
```

### 6. 启动后端服务

在 `/var/www/mio-diary/backend` 目录下运行：

```bash
cd /var/www/mio-diary/backend
npm start
```

或使用 nohup 后台运行：

```bash
cd /var/www/mio-diary/backend
nohup npm start > /var/log/mio-diary.log 2>&1 &
```

---

## 端口说明

| 端口 | 用途 |
|------|------|
| 80 | Nginx HTTP（默认） |
| 443 | Nginx HTTPS（配置SSL后） |
| 3001 | 后端 API |
| 8080 | 备用端口（80不可用时） |

### 使用 8080 端口

如果 80 端口被占用或权限不足，可以使用 8080：

```nginx
server {
    listen 8080;
    server_name localhost;

    root /var/www/mio-diary/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 部署文件结构

```
/var/www/mio-diary/
├── frontend/
│   └── dist/           # 前端构建文件（由 npm run build 生成）
│       ├── index.html
│       ├── assets/
│       └── ...
└── backend/
    ├── src/             # 后端源码
    │   ├── app.js
    │   ├── server.js
    │   ├── controllers/
    │   ├── routes/
    │   └── ...
    ├── prisma/
    │   ├── schema.prisma
    │   └── dev.db       # SQLite 数据库
    ├── uploads/         # 上传的文件
    │   ├── avatars/
    │   └── backgrounds/
    └── package.json
```

---

## HTTPS 配置（推荐）

### 使用 Certbot 自动配置

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx

# 申请证书（需要域名已解析到此服务器）
certbot --nginx -d your-domain.com
```

### 手动配置 HTTPS

```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书（使用 Certbot 生成）
    ssl_certificate /etc/letsencrypt/live your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live your-domain.com/privkey.pem;
    
    # SSL 配置
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    root /var/www/mio-diary/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
    }
}
```

---

## 常用命令

```bash
# Nginx
nginx -t                    # 测试配置
nginx -s reload            # 重载配置
nginx -s stop              # 停止
nginx                      # 启动

# 测试访问
curl http://localhost:80/api/health
curl http://localhost:8080/api/health

# 查看端口占用
netstat -tlnp | grep -E '3001|80|443|8080'

# 后端日志
tail -f /var/log/mio-diary.log
```

---

## 常见问题

### 1. 80 端口权限不足

如果遇到 `bind() to 0.0.0.0:80 failed (13: Permission denied)`，可以使用 8080 端口，或使用 root 权限运行 nginx。

### 2. 502 Bad Gateway

检查后端是否运行：
```bash
curl http://localhost:3001/api/health
```

如果后端未运行，先启动后端服务。

### 3. 上传文件 404

确保 `/uploads/` 路径代理配置正确，且后端 uploads 目录存在。

### 4. 静态资源 404

检查 Nginx 配置中的 `root` 路径是否正确指向 `dist` 目录。
