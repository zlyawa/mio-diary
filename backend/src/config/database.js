const { PrismaClient } = require('@prisma/client');

const isDevelopment = process.env.NODE_ENV === 'development';

const prisma = new PrismaClient({
  log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const HEALTH_CHECK_INTERVAL = 30000;

let isConnecting = false;
let isConnected = false;
let healthCheckTimer = null;

const connectWithRetry = async (retryCount = 0) => {
  if (isConnecting) {
    return new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (isConnected) {
          clearInterval(checkConnection);
          resolve();
        }
      }, 100);
    });
  }

  isConnecting = true;

  try {
    await prisma.$connect();
    isConnected = true;
    isConnecting = false;
    console.log('✓ Prisma 客户端已连接');
    startHealthCheck();
    return true;
  } catch (error) {
    isConnecting = false;
    isConnected = false;
    console.error(`✗ Prisma 连接失败 (尝试 ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`⏳ ${RETRY_DELAY}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectWithRetry(retryCount + 1);
    } else {
      console.error('✗ 达到最大重试次数，无法连接数据库');
      throw error;
    }
  }
};

const startHealthCheck = () => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }

  healthCheckTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('✗ 数据库健康检查失败:', error.message);
      isConnected = false;
      clearInterval(healthCheckTimer);
      try {
        await connectWithRetry();
      } catch (retryError) {
        console.error('✗ 重新连接失败:', retryError.message);
      }
    }
  }, HEALTH_CHECK_INTERVAL);
};

const disconnectGracefully = async () => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }

  if (isConnected) {
    try {
      await prisma.$disconnect();
      isConnected = false;
      console.log('✓ Prisma 客户端已断开连接');
    } catch (error) {
      console.error('✗ Prisma 断开连接失败:', error);
    }
  }
};

process.on('SIGTERM', async () => {
  await disconnectGracefully();
});

process.on('SIGINT', async () => {
  await disconnectGracefully();
});

process.on('beforeExit', async () => {
  await disconnectGracefully();
});

process.on('exit', async () => {
  if (isConnected) {
    await disconnectGracefully();
  }
});

connectWithRetry().catch((error) => {
  console.error('✗ 无法启动数据库连接:', error);
  process.exit(1);
});

module.exports = prisma;
module.exports.isConnected = () => isConnected;
module.exports.disconnect = disconnectGracefully;