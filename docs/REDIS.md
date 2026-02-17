# Redis集成文档

本文档介绍 Mio Diary v2.1.0 项目中 Redis 的集成和使用方法。

## 概述

**Redis 是 Mio Diary 的必需组件**，用于存储验证码、登录限流等关键数据。未安装 Redis 将导致以下功能无法使用：

- ❌ 用户注册（图片验证码失效）
- ❌ 忘记密码（邮箱验证码失效）
- ❌ 登录限流（无法防止暴力破解）
- ❌ API 限流（无法防止接口滥用）

## 使用场景

| 功能 | Key格式 | TTL | 重要程度 |
|------|---------|-----|----------|
| 图片验证码 | `captcha:${captchaId}` | 5分钟 | **必需** - 注册/登录验证 |
| 邮箱验证码 | `verify_code:${email}` | 30分钟 | **必需** - 注册/重置密码 |
| 登录限流 | `login_attempts:${identifier}` | 15分钟+ | **必需** - 防暴力破解 |
| 验证码发送频率 | `code_send:${identifier}` | 1小时 | **必需** - 防滥用 |
| Token黑名单 | `blacklist:${token}` | Token剩余过期时间 | 推荐 - 安全登出 |
| API限流 | `rate_limit:${ip}:${endpoint}` | 1分钟 | 推荐 - 接口保护 |
| 用户会话 | `session:${userId}` | 5分钟 | 可选 - 性能优化 |
| 热门日记 | `hot_diaries` | 10分钟 | 可选 - 性能优化 |
| 系统配置 | `config:${key}` | 1小时 | 可选 - 性能优化 |

## 快速开始

### 1. 安装Redis

#### 使用Docker（推荐）

```bash
# 启动Redis
docker-compose -f docker-compose.redis.yml up -d

# 查看状态
docker-compose -f docker-compose.redis.yml ps

# 查看日志
docker-compose -f docker-compose.redis.yml logs -f redis

# 停止Redis
docker-compose -f docker-compose.redis.yml down
```

#### 本地安装（Linux）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# 启动Redis
sudo systemctl start redis
sudo systemctl enable redis

# 验证
redis-cli ping
```

### 2. 安装依赖

```bash
cd backend
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置Redis连接信息：

```env
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

### 4. 启动服务

```bash
npm run dev
```

## API文档

### CacheService

```javascript
const cacheService = require('./services/cacheService');

// 基础操作
await cacheService.set(key, value, ttlSeconds);
const value = await cacheService.get(key);
await cacheService.del(key);
const exists = await cacheService.exists(key);

// 原子操作
const newValue = await cacheService.incr(key, amount, ttlSeconds);
const newValue = await cacheService.decr(key, amount, ttlSeconds);
const ttl = await cacheService.ttl(key);

// 批量操作
const values = await cacheService.mget([key1, key2, key3]);
await cacheService.mset({ key1: value1, key2: value2 }, ttlSeconds);

// 哈希操作
await cacheService.hset(key, field, value);
const value = await cacheService.hget(key, field);
const allFields = await cacheService.hgetall(key);

// 列表操作
await cacheService.lpush(key, value, maxLength);
await cacheService.rpush(key, value, maxLength);
const items = await cacheService.lrange(key, 0, -1);

// 清理操作
await cacheService.flush('pattern:*');
const keys = await cacheService.scan('pattern:*');
```

### RateLimiter

```javascript
const rateLimiter = require('./services/rateLimiter');

// 通用限流
const result = await rateLimiter.checkLimit(key, maxAttempts, windowSeconds);
// result: { allowed, remaining, resetTime, current }

// 登录限流
const result = await rateLimiter.checkLoginAttempts(identifier, {
  maxAttempts: 5,
  lockoutDuration: 900
});

await rateLimiter.recordFailedLogin(identifier, options);
await rateLimiter.clearLoginAttempts(identifier);

// 验证码发送频率
const result = await rateLimiter.checkCodeSendRate(identifier, {
  maxAttempts: 5,
  cooldownSeconds: 60
});

await rateLimiter.recordCodeSend(identifier, options);

// API限流
const result = await rateLimiter.checkApiLimit(ip, endpoint, {
  maxRequests: 100,
  windowSeconds: 60
});

// 滑动窗口限流
const result = await rateLimiter.checkSlidingWindow(key, maxAttempts, windowSeconds);
```

### Token黑名单

```javascript
const { blacklistToken, isTokenBlacklisted } = require('./middleware/auth');

// 加入黑名单
await blacklistToken(token, expiresInSeconds);

// 检查是否在黑名单
const isBlacklisted = await isTokenBlacklisted(token);

// 清除用户会话缓存
const { clearUserSessionCache } = require('./middleware/auth');
await clearUserSessionCache(userId);
```

## 配置选项

### Redis连接配置

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| host | REDIS_HOST | localhost | Redis服务器地址 |
| port | REDIS_PORT | 6379 | Redis端口 |
| password | REDIS_PASSWORD | - | 密码（无密码留空） |
| db | REDIS_DB | 0 | 数据库索引 |

### 连接池配置（代码中配置）

```javascript
const redis = new Redis({
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  enableOfflineQueue: true,
  enableReadyCheck: true,
});
```

## 监控与运维

### 使用redis-cli

```bash
# 连接Redis
redis-cli

# 查看所有key
KEYS *

# 查看特定pattern的key
KEYS verify_code:*

# 查看key的TTL
TTL verify_code:test@example.com

# 查看key的值
GET verify_code:test@example.com

# 删除key
DEL verify_code:test@example.com

# 查看内存使用
INFO memory

# 查看统计信息
INFO stats

# 监控实时命令
MONITOR

# 查看慢查询
SLOWLOG GET 10
```

### Node.js监控

```javascript
const { redis } = require('./config/redis');

// 查看Redis信息
const info = await redis.info();

// 查看内存使用
const memory = await redis.info('memory');

// 查看key数量
const dbsize = await redis.dbsize();

// 查看连接状态
console.log(redis.status);
```

## 故障排查

### 连接失败

```
[Redis] 连接错误: connect ECONNREFUSED 127.0.0.1:6379
```

解决方案：
1. 检查Redis是否启动：`redis-cli ping`
2. 检查环境变量配置是否正确
3. 检查防火墙设置

### 内存不足

```
OOM command not allowed when used memory > 'maxmemory'
```

解决方案：
1. 增加maxmemory配置
2. 调整淘汰策略
3. 清理过期key

### 性能问题

1. 使用pipeline批量操作
2. 避免使用KEYS命令，使用SCAN替代
3. 设置合理的TTL，避免key堆积

## 安全建议

1. **启用密码认证**：生产环境务必设置强密码
2. **绑定特定IP**：修改redis.conf绑定内网IP
3. **禁用危险命令**：使用rename-command禁用FLUSHALL等
4. **网络隔离**：使用Docker网络或防火墙限制访问
5. **定期备份**：开启AOF或RDB持久化

## 性能优化

1. **连接复用**：使用单例模式管理Redis连接
2. **批量操作**：使用pipeline减少网络往返
3. **合理设置TTL**：避免内存无限增长
4. **使用哈希存储**：节省key数量
5. **监控慢查询**：定期分析优化

## 相关文件

- `/backend/src/config/redis.js` - Redis连接配置
- `/backend/src/services/cacheService.js` - 缓存服务
- `/backend/src/services/rateLimiter.js` - 限流服务
- `/backend/src/middleware/auth.js` - Token黑名单
- `/docker-compose.redis.yml` - Redis Docker配置
- `/docker-compose.yml` - 完整部署配置
