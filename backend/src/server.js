require('dotenv').config();
const app = require('./app');
const prisma = require('./config/database');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
const API_VERSION = 'v1';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✓ 数据库连接成功');
    console.log(`✓ API 版本: ${API_VERSION}`);
    
    const server = app.listen(PORT, HOST, () => {
      console.log('='.repeat(50));
      console.log(`✓ 服务器运行在 http://${HOST}:${PORT}`);
      console.log(`✓ 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API 基础路径: /api/${API_VERSION}`);
      console.log('='.repeat(50));
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`✗ 端口 ${PORT} 已被占用，请检查是否有其他服务正在运行`);
      } else {
        console.error('✗ 服务器错误:', error);
      }
      process.exit(1);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`收到 ${signal} 信号，开始优雅关闭...`);
      console.log('='.repeat(50));
      
      server.close(async () => {
        console.log('✓ HTTP 服务器已关闭');
        
        try {
          await prisma.$disconnect();
          console.log('✓ 数据库连接已关闭');
          console.log('✓ 服务器已安全关闭');
          process.exit(0);
        } catch (error) {
          console.error('✗ 数据库关闭失败:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error('✗ 强制关闭超时，立即退出');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('✗ 未捕获的异常:', error);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('✗ 未处理的 Promise 拒绝:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('✗ 启动服务器失败:', error);
    console.error('✗ 错误详情:', error.message);
    console.error('✗ 堆栈:', error.stack);
    process.exit(1);
  }
};

startServer();