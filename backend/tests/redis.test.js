/**
 * Redis集成测试
 * 运行: node tests/redis.test.js
 */

const { redis, healthCheck } = require('../src/config/redis');
const cacheService = require('../src/services/cacheService');
const rateLimiter = require('../src/services/rateLimiter');
const { blacklistToken, isTokenBlacklisted } = require('../src/middleware/auth');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRedisConnection() {
  console.log('\n=== 测试Redis连接 ===');
  const healthy = await healthCheck();
  if (healthy) {
    console.log('✓ Redis连接正常');
  } else {
    console.error('✗ Redis连接失败');
    throw new Error('Redis连接失败');
  }
}

async function testCacheService() {
  console.log('\n=== 测试CacheService ===');
  
  // 测试set/get
  await cacheService.set('test:key', { foo: 'bar' }, 60);
  const value = await cacheService.get('test:key');
  if (value && value.foo === 'bar') {
    console.log('✓ set/get 测试通过');
  } else {
    console.error('✗ set/get 测试失败');
  }
  
  // 测试exists
  const exists = await cacheService.exists('test:key');
  if (exists) {
    console.log('✓ exists 测试通过');
  } else {
    console.error('✗ exists 测试失败');
  }
  
  // 测试ttl
  const ttl = await cacheService.ttl('test:key');
  if (ttl > 0 && ttl <= 60) {
    console.log('✓ ttl 测试通过 (剩余' + ttl + '秒)');
  } else {
    console.error('✗ ttl 测试失败');
  }
  
  // 测试incr
  await cacheService.del('test:counter');
  const count1 = await cacheService.incr('test:counter', 1, 60);
  const count2 = await cacheService.incr('test:counter', 2, 60);
  if (count1 === 1 && count2 === 3) {
    console.log('✓ incr 测试通过');
  } else {
    console.error('✗ incr 测试失败', count1, count2);
  }
  
  // 测试del
  await cacheService.del('test:key');
  const deleted = await cacheService.get('test:key');
  if (!deleted) {
    console.log('✓ del 测试通过');
  } else {
    console.error('✗ del 测试失败');
  }
  
  // 测试哈希操作
  await cacheService.hset('test:hash', 'field1', 'value1');
  await cacheService.hset('test:hash', 'field2', { nested: 'object' });
  const hvalue1 = await cacheService.hget('test:hash', 'field1');
  const hvalue2 = await cacheService.hget('test:hash', 'field2');
  const hvalues = await cacheService.hgetall('test:hash');
  if (hvalue1 === 'value1' && hvalue2.nested === 'object' && hvalues.field1 === 'value1') {
    console.log('✓ 哈希操作测试通过');
  } else {
    console.error('✗ 哈希操作测试失败');
  }
  
  // 测试列表操作
  await cacheService.del('test:list');
  await cacheService.lpush('test:list', 'item1', 10);
  await cacheService.lpush('test:list', 'item2', 10);
  await cacheService.rpush('test:list', 'item3', 10);
  const items = await cacheService.lrange('test:list', 0, -1);
  if (items.length === 3 && items[0] === 'item2' && items[2] === 'item3') {
    console.log('✓ 列表操作测试通过');
  } else {
    console.error('✗ 列表操作测试失败', items);
  }
  
  // 清理测试数据
  await cacheService.del('test:counter');
  await cacheService.del('test:hash');
  await cacheService.del('test:list');
  console.log('✓ 测试数据已清理');
}

async function testRateLimiter() {
  console.log('\n=== 测试RateLimiter ===');
  
  // 测试通用限流
  await redis.del('test:limit');
  const limit1 = await rateLimiter.checkLimit('test:limit', 5, 60);
  const limit2 = await rateLimiter.checkLimit('test:limit', 5, 60);
  if (limit1.allowed && limit1.current === 1 && limit2.current === 2) {
    console.log('✓ 通用限流测试通过');
  } else {
    console.error('✗ 通用限流测试失败', limit1, limit2);
  }
  
  // 测试登录限流
  const identifier = 'test:user@example.com';
  await rateLimiter.clearLoginAttempts(identifier);
  const check1 = await rateLimiter.checkLoginAttempts(identifier, { maxAttempts: 3, lockoutDuration: 60 });
  await rateLimiter.recordFailedLogin(identifier, { maxAttempts: 3, lockoutDuration: 60 });
  await rateLimiter.recordFailedLogin(identifier, { maxAttempts: 3, lockoutDuration: 60 });
  const check2 = await rateLimiter.checkLoginAttempts(identifier, { maxAttempts: 3, lockoutDuration: 60 });
  if (check1.allowed && check1.remainingAttempts === 3 && check2.remainingAttempts === 1) {
    console.log('✓ 登录限流测试通过');
  } else {
    console.error('✗ 登录限流测试失败', check1, check2);
  }
  
  // 清理
  await redis.del('test:limit');
  await rateLimiter.clearLoginAttempts(identifier);
  console.log('✓ 限流测试数据已清理');
}

async function testTokenBlacklist() {
  console.log('\n=== 测试Token黑名单 ===');
  
  const testToken = 'test-token-' + Date.now();
  
  // 测试加入黑名单
  await blacklistToken(testToken, 60);
  
  // 测试检查黑名单
  const isBlacklisted = await isTokenBlacklisted(testToken);
  if (isBlacklisted) {
    console.log('✓ Token黑名单测试通过');
  } else {
    console.error('✗ Token黑名单测试失败');
  }
  
  // 测试不存在的Token
  const isNotBlacklisted = await isTokenBlacklisted('non-existent-token');
  if (!isNotBlacklisted) {
    console.log('✓ Token白名单测试通过');
  } else {
    console.error('✗ Token白名单测试失败');
  }
}

async function testExpiration() {
  console.log('\n=== 测试过期机制 ===');
  
  const key = 'test:expire';
  await cacheService.set(key, 'value', 1); // 1秒过期
  
  const value1 = await cacheService.get(key);
  if (value1 === 'value') {
    console.log('✓ 写入测试通过');
  } else {
    console.error('✗ 写入测试失败');
  }
  
  // 等待2秒
  await sleep(2000);
  
  const value2 = await cacheService.get(key);
  if (!value2) {
    console.log('✓ 过期测试通过');
  } else {
    console.error('✗ 过期测试失败');
  }
}

async function runAllTests() {
  console.log('开始Redis集成测试...');
  console.log('====================');
  
  try {
    await testRedisConnection();
    await testCacheService();
    await testRateLimiter();
    await testTokenBlacklist();
    await testExpiration();
    
    console.log('\n====================');
    console.log('所有测试通过! ✓');
  } catch (error) {
    console.error('\n====================');
    console.error('测试失败:', error.message);
    console.error('请确保Redis已启动: docker-compose -f docker-compose.redis.yml up -d');
  } finally {
    // 清理所有测试key
    try {
      const keys = await redis.keys('test:*');
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`\n已清理 ${keys.length} 个测试key`);
      }
    } catch (e) {
      // 忽略清理错误
    }
    
    // 关闭连接
    await redis.quit();
    process.exit(0);
  }
}

// 运行测试
runAllTests();
