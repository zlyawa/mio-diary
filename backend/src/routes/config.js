const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 设置 multer 用于数据库导入
const upload = multer({ 
  dest: path.join(__dirname, '../../prisma/temp/'),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB 限制
});

// 版本信息常量
const VERSION_INFO = {
  version: '2.0.2',
  name: 'Mio的日记本',
  description: '个人日记管理系统',
  author: 'Mio',
  github: 'https://github.com/zlyawa/mio-diary',
  license: 'MIT',
  techStack: {
    backend: ['Node.js', 'Express', 'Prisma', 'SQLite', 'JWT'],
    frontend: ['React', 'Vite', 'Tailwind CSS', 'React Quill']
  }
};

/**
 * 获取版本信息
 * GET /api/config/version
 */
router.get('/version', (req, res) => {
  res.json({
    ...VERSION_INFO,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * 检查更新（为后续更新系统预留）
 * GET /api/config/check-update
 */
router.get('/check-update', async (req, res) => {
  try {
    const currentVersion = VERSION_INFO.version;
    const repo = 'zlyawa/mio-diary';
    
    // 从 GitHub API 获取最新 release
    let latestVersion = currentVersion;
    let releaseNotes = '';
    let updateAvailable = false;
    let errorMessage = null;
    
    try {
      const https = require('https');
      
      const response = await new Promise((resolve, reject) => {
        const req = https.get(`https://api.github.com/repos/${repo}/releases/latest`, {
          headers: {
            'User-Agent': 'Mio-Diary-App',
            'Accept': 'application/vnd.github.v3+json'
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('请求超时'));
        });
      });

      if (response && response.tag_name) {
        latestVersion = response.tag_name.replace(/^v/, '');
        releaseNotes = response.body || '';
        
        // 比较版本
        const currentParts = currentVersion.split('.').map(Number);
        const latestParts = latestVersion.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
          const cur = currentParts[i] || 0;
          const lat = latestParts[i] || 0;
          if (lat > cur) {
            updateAvailable = true;
            break;
          } else if (lat < cur) {
            break;
          }
        }
      }
    } catch (githubError) {
      console.error('[GitHub API 请求失败]', githubError.message);
      errorMessage = '无法连接到 GitHub';
      // 如果请求失败，返回当前版本信息
      latestVersion = currentVersion;
    }

    res.json({
      currentVersion,
      latestVersion,
      updateAvailable,
      releaseNotes,
      downloadUrl: `https://github.com/${repo}/releases`,
      error: errorMessage,
      lastCheck: new Date().toISOString()
    });
  } catch (error) {
    console.error('[检查更新错误]', error);
    res.status(500).json({ 
      message: '检查更新失败',
      error: error.message 
    });
  }
});

/**
 * 获取系统统计数据
 * GET /api/config/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      userCount,
      diaryCount,
      adminCount,
      totalImages,
      notificationCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.diary.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.diary.count({ where: { images: { not: '' } } }),
      prisma.notification.count()
    ]);

    // 获取系统运行时间（从数据库创建时间估算）
    const earliestDiary = await prisma.diary.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    });

    const earliestUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    });

    const systemStartTime = earliestDiary && earliestUser 
      ? (earliestDiary.createdAt < earliestUser.createdAt ? earliestDiary.createdAt : earliestUser.createdAt)
      : new Date();

    const daysRunning = Math.floor((Date.now() - new Date(systemStartTime).getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      users: userCount,
      diaries: diaryCount,
      admins: adminCount,
      diariesWithImages: totalImages,
      notifications: notificationCount,
      systemStartTime: systemStartTime.toISOString(),
      daysRunning
    });
  } catch (error) {
    console.error('[获取统计信息错误]', error);
    res.status(500).json({ 
      message: '获取统计信息失败',
      error: error.message 
    });
  }
});

/**
 * 导出数据库为 SQL 脚本
 * GET /api/config/export
 */
router.get('/export', async (req, res) => {
  try {
    const dbPath = path.join(__dirname, '../../prisma/dev.db');
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ message: '数据库文件不存在' });
    }

    const exportFileName = `mio-diary-backup-${new Date().toISOString().split('T')[0]}.sql`;
    
    // 使用 sqlite3 npm 包导出 SQL 脚本
    const sqlite3 = require('sqlite3').verbose();
    
    const db = new sqlite3.Database(dbPath);
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        db.close();
        console.error('[导出数据库错误]', err);
        return res.status(500).json({ message: '导出数据库失败' });
      }
      
      let sqlScript = '-- Mio Diary Database Backup\n';
      sqlScript += `-- Generated: ${new Date().toISOString()}\n`;
      sqlScript += '-- \n\n';
      
      const tableNames = tables.map(t => t.name);
      let tableIndex = 0;
      
      const processNextTable = () => {
        if (tableIndex >= tableNames.length) {
          db.close();
          // 设置响应头
          res.setHeader('Content-Type', 'application/sql');
          res.setHeader('Content-Disposition', `attachment; filename="${exportFileName}"`);
          return res.send(sqlScript);
        }
        
        const tableName = tableNames[tableIndex++];
        
        // 获取建表语句
        db.all(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (tableErr, createResult) => {
          if (tableErr || !createResult.length) {
            return processNextTable();
          }
          
          sqlScript += createResult[0].sql + ';\n\n';
          
          // 获取表数据
          db.all(`SELECT * FROM "${tableName}"`, [], (dataErr, rows) => {
            if (dataErr || !rows.length) {
              return processNextTable();
            }
            
            // 插入数据
            const columns = Object.keys(rows[0]);
            rows.forEach(row => {
              const values = columns.map(col => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'number') return val;
                if (typeof val === 'boolean') return val ? 1 : 0;
                return `'${String(val).replace(/'/g, "''")}'`;
              });
              sqlScript += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
            });
            sqlScript += '\n';
            
            processNextTable();
          });
        });
      };
      
      processNextTable();
    });
  } catch (error) {
    console.error('[导出数据库错误]', error);
    res.status(500).json({ 
      message: '导出数据库失败',
      error: error.message 
    });
  }
});

/**
 * 导入数据库
 * POST /api/config/import
 * 支持上传 .db/.sqlite/.sqlite3 文件或 .sql 脚本文件
 */
router.post('/import', upload.single('database'), async (req, res) => {
  try {
    const dbPath = path.join(__dirname, '../../prisma/dev.db');
    const tempPath = req.file?.path;
    const originalName = req.file?.originalname || '';
    
    if (!tempPath) {
      return res.status(400).json({ 
        message: '请上传数据库文件',
        accept: '.db, .sqlite, .sqlite3, .sql'
      });
    }

    // 备份现有数据库
    const backupPath = path.join(__dirname, `../../prisma/dev_backup_${Date.now()}.db`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    // 根据文件类型处理
    const ext = path.extname(originalName).toLowerCase();
    
    if (ext === '.sql') {
      // 处理 SQL 脚本文件
      const sqlite3 = require('sqlite3').verbose();
      const sqlContent = fs.readFileSync(tempPath, 'utf8');
      
      // 删除旧数据库并创建新的空数据库
      fs.unlinkSync(dbPath);
      
      const db = new sqlite3.Database(dbPath);
      
      // 执行 SQL 脚本
      db.exec(sqlContent, (err) => {
        db.close();
        // 清理临时文件
        fs.unlinkSync(tempPath);
        
        if (err) {
          console.error('[导入SQL错误]', err);
          // 恢复备份
          if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, dbPath);
          }
          return res.status(400).json({ 
            message: 'SQL文件格式错误，导入失败',
            error: err.message
          });
        }
        
        res.json({
          message: '数据库导入成功，请重启服务使更改生效',
          backupFile: path.basename(backupPath),
          type: 'sql'
        });
      });
    } else {
      // 处理 .db/.sqlite 文件，直接覆盖
      fs.copyFileSync(tempPath, dbPath);
      fs.unlinkSync(tempPath);
      
      res.json({
        message: '数据库导入成功，请重启服务使更改生效',
        backupFile: path.basename(backupPath),
        type: 'db'
      });
    }
  } catch (error) {
    console.error('[导入数据库错误]', error);
    res.status(500).json({ 
      message: '导入数据库失败',
      error: error.message 
    });
  }
});

/**
 * 获取公开系统配置
 * 用于前端功能开关控制
 * GET /api/config/public
 */
router.get('/public', async (req, res) => {
  try {
    // 从SystemConfig表中获取配置
    const configs = await prisma.systemConfig.findMany();
    const configMap = {};
    configs.forEach(config => {
      try {
        // 尝试将 JSON 字符串解析为对应的类型
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        // 如果解析失败，直接返回原始值
        configMap[config.key] = config.value;
      }
    });

    // 返回前端需要的配置项
    res.json({
      siteName: configMap.siteName || 'Mio日记',
      siteDescription: configMap.siteDescription || '',
      siteIcon: configMap.siteIcon || '',
      siteIco: configMap.siteIco || '',
      loginBg: configMap.loginBg || '',
      registerBg: configMap.registerBg || '',
      forgotPasswordBg: configMap.forgotPasswordBg || '',
      enableReview: configMap.enableUserReview || false,
      enableEmailVerify: configMap.enableEmailVerify || false,
      siteAnnouncement: configMap.siteAnnouncement || ''
    });
  } catch (error) {
    console.error('[获取公开配置错误]', error);
    res.status(500).json({ 
      message: '获取配置失败',
      error: error.message 
    });
  }
});

module.exports = router;