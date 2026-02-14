# GitHub 发布说明

## Mio的日记本 v2.0.2

一个简洁优雅的个人日记管理系统。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS |
| 后端 | Node.js + Express + Prisma |
| 数据库 | SQLite |
| 认证 | JWT |

### 快速开始

```bash
git clone https://github.com/zlyawa/mio-diary.git
cd mio-diary
./mio.sh install
./mio.sh start-log
```

访问 http://localhost:5173

### 功能特性

**核心功能**
- 用户注册/登录
- 日记增删改查
- 富文本编辑器
- 图片上传
- 情绪追踪
- 标签分类
- 个人主页展示
- 暗黑模式

**管理员后台**
- 仪表盘统计
- 用户管理（封禁、重置密码）
- 日记审核
- 系统设置

**通知系统**
- 站内通知
- 审核通知
- 未读角标

**系统配置**
- 网站名称/Logo/Favicon
- 功能开关（注册验证、内容审核）
- SMTP邮件配置
- 登录/注册/忘记密码页面背景图

**关于页面**
- 系统统计信息
- 数据库备份导出(.sql)
- 数据库导入恢复(.sql/.db)
- GitHub版本检测

### 许可证

ISC License