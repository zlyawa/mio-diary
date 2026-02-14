# Mio的日记本

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![React](https://img.shields.io/badge/react-18.3-blue.svg)
![License](https://img.shields.io/badge/license-ISC-orange.svg)

**一个简洁优雅的个人日记管理系统**

[快速开始](#快速开始) • [功能特性](#功能特性) • [技术栈](#技术栈) • [文档](#文档)

</div>

---

## 项目简介

Mio的日记本是一个现代化的全栈个人日记应用，采用前后端分离架构。支持富文本编辑、图片上传、情绪追踪、标签分类、站内通知等功能。

**最新版本 v2.0** 带来了完整的管理员后台、通知中心、自定义登录页面背景等功能。

---

## 快速开始

### 环境要求

| 组件 | 版本 |
|------|------|
| Node.js | 18+ |
| npm | 9+ |
| Git | 2+ |

### 一键安装

```bash
# 克隆项目
git clone https://github.com/zlyawa/mio-diary.git
cd mio-diary

# 安装并启动
./mio.sh install
./mio.sh start-log
```

访问 `http://localhost:5173` 即可使用。

### 首次登录

安装完成后，第一个注册的用户会自动成为**管理员**。

### 管理命令

| 命令 | 说明 |
|------|------|
| `./mio.sh install` | 安装依赖 |
| `./mio.sh start` | 启动服务 |
| `./mio.sh start-log` | 启动并显示日志 |
| `./mio.sh stop` | 停止服务 |
| `./mio.sh restart` | 重启服务 |
| `./mio.sh status` | 查看状态 |
| `./mio.sh log` | 查看实时日志 |
| `./mio.sh build` | 构建生产版本 |

---

## 功能特性

### 👤 用户功能

| 功能 | 说明 |
|------|------|
| 注册/登录 | 支持图片验证码、邮箱验证（可选） |
| 个人信息 | 头像、背景图、个人签名 |
| 日记管理 | 富文本编辑、增删改查 |
| 图片上传 | 支持多图上传、本地存储 |
| 情绪追踪 | 多种情绪图标选择 |
| 标签分类 | 自定义标签、灵活管理 |
| 日记搜索 | 按标题、内容、标签搜索 |
| 个人主页 | 瀑布流展示、响应式布局 |
| 暗黑模式 | 跟随系统/手动切换 |

### 👨‍💼 管理员功能 (v2.0 新增)

| 功能 | 说明 |
|------|------|
| 仪表盘 | 用户统计、日记数量、待审核数量 |
| 用户管理 | 查看用户、封禁用户、重置密码 |
| 日记审核 | 审核用户提交的日记、查看详情 |
| 系统设置 | 功能开关、SMTP配置 |

### 🔔 通知中心 (v2.0 新增)

| 功能 | 说明 |
|------|------|
| 审核提醒 | 管理员待审核通知 |
| 审核结果 | 用户收到审核通过/拒绝通知 |
| 系统通知 | 账号状态变更等 |
| 未读角标 | 实时未读数量显示 |

### ⚙️ 系统配置 (v2.0 新增)

| 配置项 | 说明 |
|--------|------|
| 网站名称 | 自定义网站标题 |
| 网站 Logo | 支持 URL 或上传图片 |
| 网站 Favicon | 支持 ICO 格式 |
| 网站描述 | SEO meta 描述 |
| 登录页背景 | 自定义登录页面背景图 |
| 注册页背景 | 自定义注册页面背景图 |
| 忘记密码页背景 | 自定义找回密码页背景图 |

### 🔧 功能开关

| 开关 | 说明 |
|------|------|
| 注册需邮箱验证 | 开启后新用户需验证邮箱才能使用 |
| 内容审核 | 开启后所有日记需管理员审核后才能公开 |

### 📧 邮件服务 (v2.0 新增)

- SMTP 服务器配置
- 用户注册验证邮件
- 忘记密码重置邮件
- 审核结果通知邮件

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS |
| 后端 | Node.js + Express + Prisma |
| 数据库 | SQLite |
| 认证 | JWT双令牌 |
| 图片处理 | Sharp |

---

## 项目结构

```
mio-diary/
├── backend/           # 后端服务
│   ├── prisma/       # 数据库模型和迁移
│   ├── src/          # 源码
│   │   ├── controllers/  # 控制器
│   │   ├── middleware/    # 中间件
│   │   ├── routes/       # 路由
│   │   └── utils/       # 工具函数
│   └── uploads/      # 上传文件(头像、背景图)
├── frontend/          # 前端应用
│   ├── src/          # 源码
│   │   ├── components/  # 组件
│   │   ├── context/     # Context状态管理
│   │   ├── pages/       # 页面
│   │   └── utils/       # 工具函数
│   └── public/       # 静态资源
├── docs/              # 文档
├── logs/              # 日志
└── mio.sh             # 管理脚本
```

---

## 部署方式

### 开发模式

```bash
./mio.sh start-log
```

### 生产部署 (Nginx)

详见 [NGINX.md](docs/NGINX.md)

```bash
# 1. 构建前端
cd frontend && npm run build

# 2. 配置 Nginx 代理前端和后端 API

# 3. 使用 systemd 管理后端服务
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [INSTALL.md](docs/INSTALL.md) | 详细安装指南 |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | 开发指南和API文档 |
| [NGINX.md](docs/NGINX.md) | Nginx 部署配置 |
| [CHANGELOG.md](docs/CHANGELOG.md) | 版本更新日志 |

---

## 常见问题

**Q: 依赖安装失败？**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Q: 端口被占用？**
```bash
lsof -i :3001  # 查找后端端口
lsof -i :5173  # 查找前端端口
kill -9 <PID>
```

**Q: 重置数据库？**
```bash
cd backend && npx prisma migrate reset
```

**Q: 忘记管理员密码？**
```bash
cd backend && npx prisma studio
# 在 User 表中找到用户，将 role 改为 admin
```

---

## 手机端预览

<div align="center">

| | | |
|:---:|:---:|:---:|
|![1](./screenshots/1.jpg)|![2](./screenshots/2.jpg)|![3](./screenshots/3.jpg)|
|![4](./screenshots/4.jpg)|![5](./screenshots/5.jpg)|![6](./screenshots/6.jpg)|

</div>

---

## 许可证

ISC License

---

<div align="center">

**Made with by zlyawa**

</div>