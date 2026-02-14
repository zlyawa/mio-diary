# 安装指南

## 环境要求

| 组件 | 版本 |
|------|------|
| Node.js | 18+ |
| npm | 9+ |
| Git | 2+ |

## 快速安装

```bash
# 克隆项目
git clone https://github.com/zlyawa/mio-diary.git
cd mio-diary

# 一键安装
./mio.sh install

# 启动服务
./mio.sh start-log
```

访问 `http://localhost:5173` 即可使用。

## 管理命令

```bash
./mio.sh install     # 安装依赖
./mio.sh start       # 启动服务
./mio.sh stop        # 停止服务
./mio.sh restart     # 重启服务
./mio.sh status      # 查看状态
./mio.sh log         # 查看日志
```

## 手动安装

### 1. 后端

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm start
```

### 2. 前端

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## 环境变量

### 后端 (backend/.env)

```bash
DATABASE_URL="file:./dev.db"
PORT=3001
JWT_SECRET=your-secret-key-at-least-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-chars
```

### 前端 (frontend/.env)

```bash
VITE_API_URL=http://localhost:3001/api
```

## 常见问题

### 端口被占用

```bash
lsof -i :3001  # 查找进程
kill -9 <PID>
```

### 重置数据库

```bash
cd backend && npx prisma migrate reset
```

### 依赖安装失败

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 默认管理员账号

安装完成后，第一个注册的用户会自动成为管理员。

## 功能说明

### 功能开关
- **注册需邮箱验证**：开启后新用户需验证邮箱才能使用
- **内容审核**：开启后所有日记需管理员审核后才能公开

### 邮件配置
支持配置SMTP服务器发送邮件，包括：
- 用户注册验证
- 忘记密码重置
- 审核结果通知

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS |
| 后端 | Node.js + Express + Prisma |
| 数据库 | SQLite |
| 认证 | JWT |