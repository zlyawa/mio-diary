# Mio的日记本

<div align="center">

![Version](https://img.shields.io/badge/version-1.2.4-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

一个功能完善、设计精美的个人日记管理系统

[功能特性](#功能特性) • [快速开始](#快速开始) • [文档](#文档) • [部署](#部署) • [贡献](#贡献)

</div>

---

## 项目简介

Mio的日记本是一个现代化的全栈个人日记应用，采用前后端分离架构设计。用户可以随时随地记录生活点滴，支持富文本编辑、图片上传、情绪追踪、标签分类、个人主页、用户设置等功能。

### 核心亮点

- 🎨 **现代化 UI/UX**: React 19 + Tailwind CSS，响应式设计，支持暗黑模式
- 🔒 **安全可靠**: JWT 双令牌认证，密码加密，文件签名验证
- 📝 **富文本编辑**: 集成 Quill 编辑器，支持图文混排
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
- ✅ 富文本编辑器（Quill 2.0）
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
| Express | 4.19.2 | Web 框架 |
| Prisma | 6.2.1 | ORM 框架 |
| SQLite | 3 | 数据库 |
| JWT | 9.0.2 | 身份认证 |
| Bcrypt | 2.4.3 | 密码加密 |
| Multer | 2.0.0-rc.4 | 文件上传 |

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19 | UI 框架 |
| Vite | 6.0.1 | 构建工具 |
| Tailwind CSS | 3.4.17 | CSS 框架 |
| React Router | 7.1.1 | 路由管理 |
| React Quill | 2.0.0 | 富文本编辑器 |
| Axios | 1.7.9 | HTTP 客户端 |

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

### 安装步骤

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
node --version  # 应显示 v20.x.x 或更高
npm --version   # 应显示 10.x.x 或更高
```

#### 1. 克隆项目
```bash
# 使用 HTTPS
git clone https://github.com/your-username/mio-diary-project.git

# 或使用 SSH（推荐）
git clone git@github.com:your-username/mio-diary-project.git

# 进入项目目录
cd mio-diary-project
```

#### 2. 后端设置

**2.1 安装依赖**
```bash
cd backend

# 安装依赖
npm install

# 验证安装
npm list --depth=0
```

**2.2 配置环境变量**
```bash
# 创建环境变量文件
nano .env
```

添加以下配置：
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=mio-diary-secret-key-2026-must-be-at-least-32-chars-long
JWT_REFRESH_SECRET=mio-diary-refresh-secret-key-2026-must-be-at-least-32-chars-long
FRONTEND_URL=http://localhost:5173
```

**2.3 初始化数据库**
```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# 创建上传目录
mkdir -p uploads
chmod 755 uploads
```

**2.4 启动后端服务**
```bash
# 开发模式
npm run dev
```

后端服务将在 `http://localhost:3001` 启动。

#### 3. 前端设置

**3.1 安装依赖**
```bash
cd frontend

# 安装依赖（由于 React 19 兼容性问题，必须使用 --legacy-peer-deps）
npm install --legacy-peer-deps

# 验证安装
npm list --depth=0
```

**重要说明**: React 19 与部分依赖存在兼容性问题，必须使用 `--legacy-peer-deps` 参数安装。

**3.2 配置环境变量**
```bash
# 创建环境变量文件
cat > .env << EOF
VITE_API_URL=http://localhost:3001/api
EOF
```

**3.3 启动前端服务**
```bash
# 开发模式
npm run dev
```

前端服务将在 `http://localhost:5173` 启动。

#### 4. 访问应用

打开浏览器访问 `http://localhost:5173`，即可使用应用。

**首次使用流程**:
1. 点击"注册"创建新账户
2. 填写邮箱、用户名和密码
3. 登录系统
4. 创建第一篇日记
5. 探索仪表盘和其他功能

### 详细安装指南

如需更详细的安装说明，请参考：
- [环境准备 - DEPLOYMENT.md](docs/DEPLOYMENT.md#环境准备)
- [开发环境部署 - DEPLOYMENT.md](docs/DEPLOYMENT.md#开发环境部署)
- [生产环境部署 - DEPLOYMENT.md](docs/DEPLOYMENT.md#生产环境部署)

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

**Q: React Quill 兼容性问题？**
```bash
npm uninstall react-quill quill
npm install react-quill@beta quill@2.0.3 --legacy-peer-deps
```

更多问题请查看 [DEPLOYMENT.md - 常见问题](docs/DEPLOYMENT.md#常见问题)

---

## 项目结构

```
mio-diary-project/
├── backend/                    # 后端服务
│   ├── prisma/                # 数据库配置
│   │   ├── schema.prisma      # 数据模型定义
│   │   └── dev.db             # SQLite 数据库文件
│   ├── src/
│   │   ├── controllers/       # 控制器
│   │   ├── middleware/        # 中间件
│   │   ├── routes/            # 路由
│   │   ├── utils/             # 工具函数
│   │   └── server.js          # 入口文件
│   ├── uploads/               # 上传文件目录
│   └── package.json
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # 组件
│   │   ├── contexts/          # Context
│   │   ├── pages/             # 页面
│   │   ├── utils/             # 工具函数
│   │   └── main.jsx           # 入口文件
│   ├── public/                # 静态资源
│   └── package.json
├── docs/                      # 文档
│   ├── ARCHITECTURE.md        # 架构设计文档
│   ├── API.md                 # API 接口文档
│   ├── FRONTEND.md            # 前端组件文档
│   ├── DEPLOYMENT.md          # 部署运维文档
│   └── CONTRIBUTING.md        # 贡献者指南
├── test-full-api.js           # API 测试脚本
├── test-puppeteer.js          # 浏览器测试脚本
└── README.md                  # 项目说明
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 系统架构设计、技术选型、数据模型 |
| [API.md](docs/API.md) | 完整的 API 接口文档，含请求/响应示例 |
| [FRONTEND.md](docs/FRONTEND.md) | 前端架构、组件说明、开发规范 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 开发环境配置、生产环境部署指南 |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | 开发规范、提交指南、贡献流程 |

---

## 开发与测试

### 运行测试
```bash
# 启动服务并执行 API 测试
cd /home/admin/workspace
node test-full-api.js

# 执行浏览器 UI 测试
node test-puppeteer.js
```

### 代码规范
- 后端遵循 ESLint + Prettier 规范
- 前端遵循 ESLint + Prettier 规范
- 提交遵循 Conventional Commits 规范

---

## 部署

### 开发环境
参考 [DEPLOYMENT.md - 开发环境部署](docs/DEPLOYMENT.md#开发环境部署)

### 生产环境
支持多种部署方案：
- PM2 进程管理
- Docker 容器化部署
- Nginx 反向代理

详细说明请参考 [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 常见问题

### 1. React 19 兼容性问题
前端使用 `npm install --legacy-peer-deps` 解决依赖冲突。

### 2. JWT Secret 配置
确保 `.env` 文件中的 JWT_SECRET 至少 32 字符。

### 3. 数据库迁移
如需重置数据库：
```bash
cd backend
npx prisma migrate reset
```

更多问题请查看 [DEPLOYMENT.md - 常见问题](docs/DEPLOYMENT.md#常见问题)

---

## 贡献

欢迎贡献代码！请阅读 [CONTRIBUTING.md](docs/CONTRIBUTING.md) 了解如何参与开发。

---

## 许可证

[MIT License](LICENSE)

---

## 联系方式

- 项目主页: [GitHub Repository](https://github.com/your-username/mio-diary-project)
- 问题反馈: [Issues](https://github.com/your-username/mio-diary-project/issues)

---

<div align="center">

**Made with ❤️ by Mio**

</div>
