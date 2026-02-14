# Mio的日记本

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![React](https://img.shields.io/badge/react-18.3-blue.svg)
![License](https://img.shields.io/badge/license-ISC-orange.svg)

**一个简洁优雅的个人日记管理系统**

[快速开始](#快速开始) • [功能特性](#功能特性) • [文档](#文档)

</div>

---

## 项目简介

Mio的日记本是一个现代化的全栈个人日记应用，采用前后端分离架构。支持富文本编辑、图片上传、情绪追踪、标签分类、站内通知等功能。

### 核心特性

- 🎨 **现代UI设计** - React + Tailwind CSS，支持暗黑模式
- 🔒 **安全可靠** - JWT双令牌认证，密码加密
- 📝 **富文本编辑** - Quill编辑器，支持图文混排
- 🏷️ **智能分类** - 标签管理和情绪追踪
- 🔔 **通知中心** - 站内通知、审核提醒
- 👨‍💼 **管理员后台** - 用户管理、日记审核、系统设置
- 📧 **邮件服务** - SMTP配置、验证码发送

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

### 用户功能
- 注册/登录（支持图片验证码、邮箱验证）
- 个人信息管理（头像、背景图、签名）
- 日记增删改查、富文本编辑
- 图片上传、情绪选择、标签分类
- 日记搜索和筛选
- 个人主页瀑布流展示

### 管理员功能
- 仪表盘统计数据
- 用户管理（封禁、重置密码）
- 日记审核
- 系统设置（功能开关、SMTP配置）

### 功能开关
- **注册需邮箱验证** - 新用户需验证邮箱才能使用
- **内容审核** - 发布日记需管理员审核后才能公开

### 网站配置
- 网站名称
- 网站 Logo（支持URL和上传）
- 网站 Favicon (ICO)
- 网站描述

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS |
| 后端 | Node.js + Express + Prisma |
| 数据库 | SQLite |
| 认证 | JWT双令牌 |

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
│   └── uploads/      # 上传文件
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

## 文档

| 文档 | 说明 |
|------|------|
| [INSTALL.md](docs/INSTALL.md) | 详细安装指南 |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | 开发指南和API文档 |
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

**Made with ❤️ by zlyawa**

</div>
