# Mio的日记本

<div align="center">

![Version](https://img.shields.io/badge/version-1.2.4-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![React](https://img.shields.io/badge/react-18.3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

一个功能完善、设计精美的个人日记管理系统

[功能特性](#功能特性) • [快速开始](#快速开始) • [文档](#文档) • [部署](#部署) • [贡献](#贡献)

</div>

---

## 项目简介

Mio的日记本是一个现代化的全栈个人日记应用，采用前后端分离架构设计。用户可以随时随地记录生活点滴，支持富文本编辑、图片上传、情绪追踪、标签分类、个人主页、用户设置等功能。

### 核心亮点

- 🎨 **现代化 UI/UX**: React 18.3 + Tailwind CSS，响应式设计，支持暗黑模式
- 🔒 **安全可靠**: JWT 双令牌认证，密码加密，文件签名验证，JWT 密钥自动生成
- 📝 **富文本编辑**: 集成 Quill 2.0 编辑器，支持图文混排
- 🏷️ **智能分类**: 支持标签管理和情绪追踪
- 📊 **数据统计**: 仪表盘展示日记统计和情绪趋势
- 📱 **移动端优化**: 完美适配各种设备尺寸

---

## 功能特性

### 用户功能
- ✅ 用户注册/登录
- ✅ JWT 双令牌认证（Access Token + Refresh Token）
- ✅ 个人信息管理（头像、背景图、个人签名）
- ✅ 修改密码
- ✅ 日记可见性设置（公开/私密）
- ✅ 公开用户主页展示

### 日记功能
- ✅ 日记增删改查（CRUD）
- ✅ 富文本编辑器（Quill 2.0.3）
- ✅ 图片上传（支持多图片，最大5MB）
- ✅ 情绪选择（7种预设情绪）
- ✅ 标签管理（最多10个）
- ✅ 日记搜索（按标题、内容搜索）
- ✅ 日记筛选（按时间、情绪、标签）
- ✅ 分页浏览
- ✅ 自动保存草稿功能

### 仪表盘
- ✅ 日记统计（总数、本月新增、本周新增）
- ✅ 情绪分布统计
- ✅ 热门标签统计
- ✅ 最近日记列表

### 系统功能
- ✅ 加载状态提示
- ✅ 错误处理与提示
- ✅ Token 自动刷新
- ✅ 响应式设计
- ✅ 暗黑模式支持
- ✅ 功能展示页（二次元风格）

---

## 技术栈

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| Express | 4.21.2 | Web 框架 |
| Prisma | 6.2.1 | ORM 框架 |
| SQLite | 3 | 数据库 |
| JWT | 9.0.2 | 身份认证 |
| Bcrypt | 2.4.3 | 密码加密 |
| Multer | 2.0.0-rc.4 | 文件上传 |
| Sharp | 0.34.5 | 图片处理 |

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.3.1 | UI 框架 |
| Vite | 6.0.3 | 构建工具 |
| Tailwind CSS | 3.4.17 | CSS 框架 |
| React Router | 7.1.1 | 路由管理 |
| React Quill | 2.0.0-beta.4 | 富文本编辑器 |
| Quill | 2.0.3 | 编辑器核心 |
| Axios | 1.7.9 | HTTP 客户端 |
| React Image Crop | 11.0.10 | 图片裁剪 |

---

## 快速开始

### 环境要求

| 组件 | 要求 | 说明 |
|------|------|------|
| Node.js | 18.x 或更高版本 | 推荐使用 20.x LTS |
| npm | 9.x 或更高版本 | 随 Node.js 一起安装 |
| Git | 2.x 或更高版本 | 用于克隆项目 |

### 系统支持

- **Linux**: Ubuntu 20.04+, Debian 10+, CentOS 7+
- **macOS**: 10.15 (Catalina) 或更高版本
- **Windows**: Windows 10 或更高版本

### 一键安装（推荐）

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

脚本会自动：
1. 检查 Node.js 版本
2. 生成安全的 JWT 密钥（如果使用默认值）
3. 安装后端依赖
4. 安装前端依赖
5. 启动服务

访问 `http://localhost:5173` 即可使用应用。

### 手动安装

#### 前置准备

**1. 安装 Node.js 和 npm**

- **Ubuntu/Debian**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **macOS**:
  ```bash
  brew install node
  ```

- **Windows**:
  访问 [Node.js 官网](https://nodejs.org/) 下载并安装 LTS 版本

**2. 验证安装**
```bash
node --version  # 应显示 v18.x.x 或更高
npm --version   # 应显示 9.x.x 或更高
```

#### 1. 后端设置

**1.1 安装依赖**
```bash
cd backend
npm install
```

**1.2 配置环境变量**

`backend/.env` 文件已包含默认配置：

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

**1.3 初始化数据库**
```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev
```

**1.4 启动后端服务**
```bash
npm start
```

后端服务将在 `http://localhost:3001` 启动。

#### 2. 前端设置

**2.1 安装依赖**
```bash
cd frontend

# 安装依赖（必须使用 --legacy-peer-deps）
npm install --legacy-peer-deps
```

**重要说明**: React 18.3 与部分依赖存在兼容性问题，必须使用 `--legacy-peer-deps` 参数安装。

**2.2 配置环境变量**

`frontend/.env` 文件已包含默认配置：

```bash
VITE_API_URL=http://localhost:3001/api
```

**2.3 启动前端服务**
```bash
npm run dev
```

前端服务将在 `http://localhost:5173` 启动。

#### 3. 访问应用

打开浏览器访问 `http://localhost:5173`，即可使用应用。

**首次使用流程**:
1. 点击"注册"创建新账户
2. 填写邮箱、用户名和密码
3. 登录系统
4. 创建第一篇日记
5. 探索仪表盘和其他功能

### 常见问题

**Q: 依赖安装失败怎么办？**
```bash
# 清理缓存和 node_modules
rm -rf node_modules package-lock.json
npm cache clean --force

# 重新安装
npm install --legacy-peer-deps
```

**Q: 端口被占用怎么办？**
```bash
# 查找占用进程
lsof -i :3001  # 后端
lsof -i :5173  # 前端

# 杀死进程
kill -9 <PID>
```

**Q: 数据库错误怎么办？**
```bash
cd backend
npx prisma migrate reset
```

更多问题请查看 [INSTALL.md](docs/INSTALL.md)

---

## 项目结构

```
mio-diary-project/
├── backend/                    # 后端服务
│   ├── prisma/                # 数据库配置
│   │   ├── schema.prisma      # 数据模型定义
│   │   └── migrations/        # 数据库迁移文件
│   ├── src/
│   │   ├── controllers/       # 控制器
│   │   ├── middleware/        # 中间件
│   │   ├── routes/            # 路由
│   │   ├── config/            # 配置
│   │   ├── utils/             # 工具函数
│   │   └── server.js          # 入口文件
│   ├── uploads/               # 上传文件目录
│   │   ├── avatars/           # 用户头像
│   │   └── backgrounds/       # 用户背景图
│   └── package.json
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   ├── common/        # 通用组件
│   │   │   ├── diary/         # 日记相关组件
│   │   │   ├── layout/        # 布局组件
│   │   │   └── profile/       # 个人资料组件
│   │   ├── context/           # React Context
│   │   ├── pages/             # 页面组件
│   │   ├── utils/             # 工具函数
│   │   └── main.jsx           # 入口文件
│   ├── public/                # 静态资源
│   └── package.json
├── docs/                       # 项目文档
│   ├── INSTALL.md              # 安装指南
│   ├── DEVELOPMENT.md          # 开发指南
│   ├── CHANGELOG.md            # 更新日志
│   └── GITHUB.md               # GitHub 发布说明
├── screenshots/                # 功能截图
├── install.sh                  # 一键安装脚本
└── README.md                   # 项目说明
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [INSTALL.md](docs/INSTALL.md) | 安装指南、环境配置 |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | 开发环境设置、项目结构 |
| [CHANGELOG.md](docs/CHANGELOG.md) | 版本更新日志 |
| [GITHUB.md](docs/GITHUB.md) | GitHub 发布说明 |

---

## 开发与测试

### 代码规范
- 后端遵循 ESLint 规范
- 前端遵循 ESLint + Prettier 规范
- 提交遵循 Conventional Commits 规范

---

## 部署

### 开发环境
参考 [DEVELOPMENT.md](docs/DEVELOPMENT.md)

### 生产环境
支持多种部署方案：
- PM2 进程管理
- Docker 容器化部署
- Nginx 反向代理

---

## 常见问题

### 1. React 18.3 兼容性问题
前端使用 `npm install --legacy-peer-deps` 解决依赖冲突。

### 2. JWT Secret 配置
安装脚本会自动生成安全的 JWT 密钥，替换默认值。

### 3. 数据库迁移
如需重置数据库：
```bash
cd backend
npx prisma migrate reset
```

---

## 许可证

ISC License

---

## 截图预览

![功能展示1](./screenshots/1.jpg)
![功能展示2](./screenshots/2.jpg)
![功能展示3](./screenshots/3.jpg)
![功能展示4](./screenshots/4.jpg)
![功能展示5](./screenshots/5.jpg)
![功能展示6](./screenshots/6.jpg)

> **版权声明**：部分预览图中的图片及表情包来源于网络、B站等平台。本项目仅供学习交流使用，所有内容完全公开开源，不用于商业用途。

## 联系方式

- 项目主页: [GitHub Repository](https://github.com/zlyawa/mio-diary)
- 问题反馈: [Issues](https://github.com/zlyawa/mio-diary/issues)

---

<div align="center">

**Made with ❤️ by Mio**

</div>
