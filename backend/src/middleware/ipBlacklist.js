const prisma = require('../config/database');

// 本地地址白名单
const LOCAL_ADDRESSES = [
  '127.0.0.1',
  'localhost',
  '::1',
  '::ffff:127.0.0.1',
];

/**
 * 检查IP是否为本地地址
 * @param {string} ip - IP地址
 * @returns {boolean}
 */
const isLocalAddress = (ip) => {
  if (!ip) return false;
  
  // 标准化 IPv6 映射的 IPv4 地址
  const normalizedIp = ip.replace(/^::ffff:/, '');
  
  return LOCAL_ADDRESSES.includes(ip) || 
         LOCAL_ADDRESSES.includes(normalizedIp) ||
         ip.startsWith('127.') ||
         normalizedIp.startsWith('127.') ||
         ip === '::1';
};

/**
 * 规范化IP地址（用于比较）
 * @param {string} ip - IP地址
 * @returns {string}
 */
const normalizeIp = (ip) => {
  if (!ip) return '';
  // 移除 IPv6 前缀，统一格式
  return ip.replace(/^::ffff:/, '').toLowerCase().trim();
};

/**
 * 检查IP是否匹配黑名单规则
 * 支持精确匹配和CIDR格式 (如 192.168.1.0/24)
 * @param {string} ip - 用户IP
 * @param {string} blacklistEntry - 黑名单条目
 * @returns {boolean}
 */
const isIpMatch = (ip, blacklistEntry) => {
  const normalizedIp = normalizeIp(ip);
  const entry = blacklistEntry.toLowerCase().trim();
  
  // 精确匹配
  if (normalizedIp === entry) {
    return true;
  }
  
  // CIDR 格式匹配 (IPv4)
  if (entry.includes('/')) {
    try {
      return isIpInCidr(normalizedIp, entry);
    } catch (error) {
      console.error(`[IPBlacklist] CIDR解析错误: ${entry}`, error.message);
      return false;
    }
  }
  
  // 通配符匹配 (如 192.168.1.*)
  if (entry.includes('*')) {
    const regex = new RegExp('^' + entry.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
    return regex.test(normalizedIp);
  }
  
  return false;
};

/**
 * 检查IP是否在CIDR范围内
 * @param {string} ip - IP地址
 * @param {string} cidr - CIDR格式 (如 192.168.1.0/24)
 * @returns {boolean}
 */
const isIpInCidr = (ip, cidr) => {
  const [network, prefix] = cidr.split('/');
  const prefixLength = parseInt(prefix, 10);
  
  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }
  
  const ipParts = ip.split('.').map(Number);
  const networkParts = network.split('.').map(Number);
  
  if (ipParts.length !== 4 || networkParts.length !== 4) {
    return false;
  }
  
  // 计算掩码
  const mask = ~(Math.pow(2, 32 - prefixLength) - 1);
  
  // 将IP转换为32位整数
  const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const networkInt = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
  
  return (ipInt & mask) === (networkInt & mask);
};

/**
 * IP黑名单中间件
 * 从 systemConfig 读取配置，拦截黑名单IP
 */
const ipBlacklist = async (req, res, next) => {
  try {
    // 获取用户真实IP
    const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.ip ||
                   req.connection.remoteAddress ||
                   '';
    
    // 本地地址白名单，直接放行
    if (isLocalAddress(userIp)) {
      return next();
    }
    
    // 从数据库读取配置
    const [enableConfig, blacklistConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'enableIpBlacklist' } }),
      prisma.systemConfig.findUnique({ where: { key: 'ipBlacklist' } })
    ]);
    
    // 检查是否启用IP黑名单
    const isEnabled = enableConfig?.value ? JSON.parse(enableConfig.value) : false;
    
    if (!isEnabled) {
      return next();
    }
    
    // 解析黑名单列表
    let blacklist = [];
    if (blacklistConfig?.value) {
      try {
        blacklist = JSON.parse(blacklistConfig.value);
        if (!Array.isArray(blacklist)) {
          console.warn('[IPBlacklist] 黑名单配置格式错误，应为数组');
          blacklist = [];
        }
      } catch (error) {
        console.error('[IPBlacklist] 解析黑名单失败:', error.message);
        blacklist = [];
      }
    }
    
    // 空黑名单，直接放行
    if (blacklist.length === 0) {
      return next();
    }
    
    // 检查IP是否在黑名单中
    const isBlacklisted = blacklist.some(entry => isIpMatch(userIp, entry));
    
    if (isBlacklisted) {
      console.warn(`[IPBlacklist] 拦截黑名单IP: ${userIp}`);
      return res.status(403).json({
        error: 'ForbiddenError',
        message: '您的IP已被禁止访问',
        code: 'IP_BLACKLISTED'
      });
    }
    
    next();
  } catch (error) {
    console.error('[IPBlacklist] 中间件错误:', error.message);
    // 发生错误时放行，避免阻断正常请求
    next();
  }
};

/**
 * 管理员豁免的IP黑名单中间件
 * 先执行认证，如果是管理员则跳过黑名单检查
 */
const ipBlacklistWithAdminBypass = async (req, res, next) => {
  try {
    // 如果用户已认证且是管理员，直接放行
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    // 否则执行正常黑名单检查
    await ipBlacklist(req, res, next);
  } catch (error) {
    console.error('[IPBlacklist] 管理员豁免中间件错误:', error.message);
    next();
  }
};

module.exports = {
  ipBlacklist,
  ipBlacklistWithAdminBypass,
  isLocalAddress,
  normalizeIp,
  isIpMatch
};