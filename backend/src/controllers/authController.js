const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendEmail, generateVerificationCode, getEmailConfig } = require('../utils/emailService');
const svgCaptcha = require('svg-captcha');

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

// 验证码存储（内存存储，生产环境建议使用Redis）
const verificationCodes = new Map();
const CODE_EXPIRY = 30 * 60 * 1000; // 30分钟过期

// 图片验证码存储
const imageCaptchaCodes = new Map();
const CAPTCHA_EXPIRY = 5 * 60 * 1000; // 5分钟过期

// 验证码发送频率限制（防止滥用）
const codeSendAttempts = new Map();
const MAX_SEND_ATTEMPTS = 5; // 最大发送次数
const SEND_COOLDOWN = 60 * 1000; // 发送冷却时间（60秒）

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  // 支持中文、英文、数字、下划线 (2-16字符)
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,16}$/;
  return usernameRegex.test(username);
};

const validatePasswordStrength = (password) => {
  const errors = [];
  const PASSWORD_MIN_LENGTH = 8;
  const PASSWORD_MAX_LENGTH = 100;
  
  if (!password || typeof password !== 'string') {
    errors.push('密码不能为空');
    return errors;
  }
  
  const trimmedPassword = password.trim();
  
  if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
    errors.push(`密码至少需要 ${PASSWORD_MIN_LENGTH} 个字符`);
  }
  if (trimmedPassword.length > PASSWORD_MAX_LENGTH) {
    errors.push(`密码不能超过 ${PASSWORD_MAX_LENGTH} 个字符`);
  }
  if (!/[a-zA-Z]/.test(trimmedPassword)) {
    errors.push('密码必须包含至少一个字母');
  }
  if (!/\d/.test(trimmedPassword)) {
    errors.push('密码必须包含至少一个数字');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword)) {
    errors.push('密码必须包含至少一个特殊字符');
  }
  
  // 检查常见弱密码
  const weakPasswords = ['password', '123456', 'qwerty', 'admin'];
  if (weakPasswords.some(weak => trimmedPassword.toLowerCase().includes(weak))) {
    errors.push('密码不能包含常见弱密码');
  }
  
  return errors;
};

// 生成随机默认用户名
const generateDefaultUsername = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Mio用户_${randomStr}`;
};

const checkLoginAttempts = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    return { canLogin: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  if (now > attempts.lockUntil) {
    loginAttempts.delete(identifier);
    return { canLogin: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const remainingTime = Math.ceil((attempts.lockUntil - now) / 1000);
    return { 
      canLogin: false, 
      remainingAttempts: 0, 
      remainingTime,
      message: `账户已锁定，请${remainingTime}秒后再试`
    };
  }

  return { 
    canLogin: true, 
    remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts.count 
  };
};

const recordFailedLogin = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, lockUntil: 0 };

  attempts.count++;
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockUntil = now + LOCKOUT_DURATION;
  }

  loginAttempts.set(identifier, attempts);
};

const clearLoginAttempts = (identifier) => {
  loginAttempts.delete(identifier);
};

// 发送验证码
const sendVerificationCode = async (req, res, next) => {
  try {
    const { email, captchaId, captchaInput } = req.body;

    // 验证图片验证码
    if (!captchaId || !captchaInput) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供图片验证码'
      });
    }

    const captchaValidation = verifyImageCaptcha(captchaId, captchaInput);
    if (!captchaValidation.valid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: captchaValidation.message
      });
    }

    if (!email) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供邮箱'
      });
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '邮箱格式不正确'
      });
    }

    // 检查发送频率限制
    const now = Date.now();
    const attempts = codeSendAttempts.get(sanitizedEmail);

    if (attempts) {
      // 检查冷却时间
      if (now - attempts.lastSent < SEND_COOLDOWN) {
        const remainingTime = Math.ceil((SEND_COOLDOWN - (now - attempts.lastSent)) / 1000);
        return res.status(429).json({
          error: 'TooManyRequests',
          message: `请${remainingTime}秒后再试`
        });
      }

      // 检查最大发送次数
      if (attempts.count >= MAX_SEND_ATTEMPTS) {
        return res.status(429).json({
          error: 'TooManyRequests',
          message: '发送次数过多，请稍后再试'
        });
      }
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'DuplicateError',
        message: '邮箱已被使用'
      });
    }

    // 检查是否启用邮箱验证
    const config = await getEmailConfig();
    if (!config.enableEmailVerify) {
      return res.status(400).json({
        error: 'FeatureDisabled',
        message: '邮箱验证功能未启用'
      });
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiry = Date.now() + CODE_EXPIRY;

    // 存储验证码
    verificationCodes.set(sanitizedEmail, { code, expiry });

    // 更新发送记录
    const newAttempts = {
      count: (attempts?.count || 0) + 1,
      lastSent: now
    };
    codeSendAttempts.set(sanitizedEmail, newAttempts);

    // 发送验证码邮件
    try {
      await sendEmail(sanitizedEmail, 'verification', { code });
      console.log(`[验证码发送] 邮箱: ${sanitizedEmail}, 验证码: ${code}, 发送次数: ${newAttempts.count}`);
    } catch (emailError) {
      console.error('[验证码发送失败]', emailError.message);
      // 即使邮件发送失败，也返回成功（测试环境可能没有SMTP）
      // 生产环境应该返回错误
    }

    // 生成新的图片验证码供注册时使用
    const newCaptcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1iIl',
      noise: 2,
      color: true,
      background: '#f3f4f6',
      width: 120,
      height: 40,
      fontSize: 36
    });
    const newCaptchaId = Date.now().toString() + Math.random().toString(36).substring(2);
    imageCaptchaCodes.set(newCaptchaId, {
      code: newCaptcha.text.toLowerCase(),
      expiry: Date.now() + CAPTCHA_EXPIRY
    });

    res.json({
      message: '验证码已发送',
      expiry: CODE_EXPIRY / 1000, // 返回过期时间（秒）
      remainingAttempts: MAX_SEND_ATTEMPTS - newAttempts.count,
      // 返回新的图片验证码供注册时使用
      newCaptcha: {
        id: newCaptchaId,
        svg: newCaptcha.data
      }
    });
  } catch (error) {
    console.error(`[发送验证码错误] 邮箱: ${email}, 错误: ${error.message}`);
    next(error);
  }
};

// 发送验证码（带图片验证码校验）
const sendVerificationCodeWithCaptcha = async (req, res, next) => {
  try {
    const { email, captchaId, captchaInput, purpose } = req.body;
    
    console.log('[发送验证码] 收到请求:', JSON.stringify({
      email,
      captchaId,
      captchaInput,
      purpose,
      captchaIdType: typeof captchaId,
      captchaInputType: typeof captchaInput
    }));

    // 验证图片验证码
    if (!captchaId || !captchaInput) {
      console.log('[发送验证码] 验证码缺失:', { hasCaptchaId: !!captchaId, hasCaptchaInput: !!captchaInput });
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供图片验证码'
      });
    }

    const captchaValidation = verifyImageCaptcha(captchaId, captchaInput);
    if (!captchaValidation.valid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: captchaValidation.message
      });
    }

    if (!email) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供邮箱'
      });
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '邮箱格式不正确'
      });
    }

    // 检查发送频率限制
    const now = Date.now();
    const attempts = codeSendAttempts.get(sanitizedEmail);

    if (attempts) {
      if (now - attempts.lastSent < SEND_COOLDOWN) {
        const remainingTime = Math.ceil((SEND_COOLDOWN - (now - attempts.lastSent)) / 1000);
        return res.status(429).json({
          error: 'TooManyRequests',
          message: `请${remainingTime}秒后再试`
        });
      }

      if (attempts.count >= MAX_SEND_ATTEMPTS) {
        return res.status(429).json({
          error: 'TooManyRequests',
          message: '发送次数过多，请稍后再试'
        });
      }
    }

    // 根据目的检查邮箱
    const existingUser = await prisma.user.findFirst({
      where: { email: sanitizedEmail },
    });

    if (purpose === 'reset-password') {
      // 重置密码：邮箱必须存在
      if (!existingUser) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: '该邮箱未注册'
        });
      }
    } else {
      // 注册（默认）：邮箱不能已存在
      if (existingUser) {
        return res.status(409).json({
          error: 'DuplicateError',
          message: '邮箱已被使用'
        });
      }
    }

    // 检查是否启用邮箱验证
    const config = await getEmailConfig();
    if (!config.enableEmailVerify) {
      return res.status(400).json({
        error: 'FeatureDisabled',
        message: '邮箱验证功能未启用'
      });
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiry = Date.now() + CODE_EXPIRY;

    // 存储验证码
    verificationCodes.set(sanitizedEmail, { code, expiry });

    // 更新发送记录
    const newAttempts = {
      count: (attempts?.count || 0) + 1,
      lastSent: now
    };
    codeSendAttempts.set(sanitizedEmail, newAttempts);

    // 发送验证码邮件
    try {
      await sendEmail(sanitizedEmail, 'verification', { code });
      console.log(`[验证码发送] 邮箱: ${sanitizedEmail}, 验证码: ${code}, 发送次数: ${newAttempts.count}`);
    } catch (emailError) {
      console.error('[验证码发送失败]', emailError.message);
    }

    // 生成新的图片验证码供注册时使用
    const newCaptcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1iIl',
      noise: 2,
      color: true,
      background: '#f3f4f6',
      width: 120,
      height: 40,
      fontSize: 36
    });
    const newCaptchaId = Date.now().toString() + Math.random().toString(36).substring(2);
    imageCaptchaCodes.set(newCaptchaId, {
      code: newCaptcha.text.toLowerCase(),
      expiry: Date.now() + CAPTCHA_EXPIRY
    });

    res.json({
      message: '验证码已发送',
      newCaptcha: {
        id: newCaptchaId,
        svg: newCaptcha.data
      }
    });
  } catch (error) {
    console.error(`[发送验证码错误] 错误: ${error.message}`);
    next(error);
  }
};

// 验证验证码
const verifyCode = (email, code) => {
  const stored = verificationCodes.get(email);
  if (!stored) {
    return { valid: false, message: '验证码不存在或已过期' };
  }

  if (Date.now() > stored.expiry) {
    verificationCodes.delete(email);
    return { valid: false, message: '验证码已过期' };
  }

  if (stored.code !== code.toUpperCase()) {
    return { valid: false, message: '验证码错误' };
  }

  // 验证成功，删除验证码
  verificationCodes.delete(email);
  return { valid: true };
};

// 生成图片验证码
const generateImageCaptcha = (req, res) => {
  try {
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      ignoreChars: '0o1iIl', // 排除容易混淆的字符
      noise: 2, // 干扰线数量
      color: true, // 彩色验证码
      background: '#f3f4f6', // 背景色
      width: 120,
      height: 40,
      fontSize: 36
    });

    const captchaId = Date.now().toString() + Math.random().toString(36).substring(2);
    
    // 存储验证码
    imageCaptchaCodes.set(captchaId, {
      code: captcha.text.toLowerCase(),
      expiry: Date.now() + CAPTCHA_EXPIRY
    });

    // 设置响应头
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('X-Captcha-Id', captchaId);
    
    // 返回SVG图片
    res.send(captcha.data);
  } catch (error) {
    console.error('[生成图片验证码错误]', error.message);
    res.status(500).json({
      error: 'ServerError',
      message: '生成验证码失败'
    });
  }
};

// 验证图片验证码
const verifyImageCaptcha = (captchaId, code) => {
  console.log('[验证码验证] captchaId:', captchaId, 'code:', code);
  console.log('[验证码验证] 当前存储的验证码数量:', imageCaptchaCodes.size);
  console.log('[验证码验证] 存储的验证码ID:', Array.from(imageCaptchaCodes.keys()));
  
  const stored = imageCaptchaCodes.get(captchaId);
  if (!stored) {
    console.log('[验证码验证] 验证码不存在');
    return { valid: false, message: '验证码不存在或已过期' };
  }

  console.log('[验证码验证] 存储的code:', stored.code, '输入的code:', code.toLowerCase());
  
  if (Date.now() > stored.expiry) {
    imageCaptchaCodes.delete(captchaId);
    console.log('[验证码验证] 验证码已过期');
    return { valid: false, message: '验证码已过期' };
  }

  if (stored.code !== code.toLowerCase()) {
    console.log('[验证码验证] 验证码不匹配');
    return { valid: false, message: '验证码错误' };
  }

  // 验证成功，删除验证码
  imageCaptchaCodes.delete(captchaId);
  console.log('[验证码验证] 验证成功');
  return { valid: true };
};

// 修改注册逻辑 - 添加邮箱验证码验证
const register = async (req, res, next) => {
  try {
    const { email, password, verificationCode, captchaId, captchaInput } = req.body;
    
    // 调试日志
    console.log('[注册] 收到请求:', JSON.stringify({
      email,
      captchaId,
      captchaInput,
      hasPassword: !!password,
      hasVerificationCode: !!verificationCode
    }));

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '请填写邮箱和密码' 
      });
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '邮箱格式不正确' 
      });
    }

    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: passwordErrors.join('; ') 
      });
    }

    // 验证图片验证码
    console.log('[注册] 验证码检查:', { captchaId, captchaInput, captchaIdType: typeof captchaId, captchaInputType: typeof captchaInput });
    if (!captchaId || !captchaInput) {
      console.log('[注册] 验证码缺失:', { hasCaptchaId: !!captchaId, hasCaptchaInput: !!captchaInput });
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供图片验证码'
      });
    }

    const captchaValidation = verifyImageCaptcha(captchaId, captchaInput);
    if (!captchaValidation.valid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: captchaValidation.message
      });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'DuplicateError',
        message: '邮箱已被使用' 
      });
    }

    // 检查是否启用邮箱验证
    const config = await getEmailConfig();
    if (config.enableEmailVerify) {
      // 验证验证码
      if (!verificationCode) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '请提供邮箱验证码'
        });
      }

      const codeValidation = verifyCode(sanitizedEmail, verificationCode);
      if (!codeValidation.valid) {
        return res.status(400).json({
          error: 'ValidationError',
          message: codeValidation.message
        });
      }
    }

    // 生成唯一默认用户名
    let defaultUsername = generateDefaultUsername();
    let usernameExists = true;
    let attempts = 0;
    while (usernameExists && attempts < 10) {
      const existing = await prisma.user.findUnique({
        where: { username: defaultUsername },
      });
      if (!existing) {
        usernameExists = false;
      } else {
        defaultUsername = generateDefaultUsername();
        attempts++;
      }
    }

    if (usernameExists) {
      return res.status(500).json({
        error: 'ServerError',
        message: '生成用户名失败，请稍后重试'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // 检查是否为第一个用户（第一个用户设为管理员）
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;
    const userRole = isFirstUser ? 'admin' : 'user';

    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        username: defaultUsername,
        password: hashedPassword,
        role: userRole,
        emailVerified: config.enableEmailVerify, // 如果启用了邮箱验证，则标记为已验证
        needReview: config.enableUserReview || false, // 如果启用了用户审核，则标记需要审核
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    // 如果是第一个用户，打印日志提示
    if (isFirstUser) {
      console.log(`[系统] 首次用户注册: ${email}, 已设置为管理员`);
    }

    res.status(201).json({
      message: isFirstUser ? '注册成功，您是系统管理员' : '注册成功',
      user,
    });
  } catch (error) {
    console.error(`[注册错误] 邮箱: ${email}, 错误: ${error.message}`);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '请填写邮箱和密码' 
      });
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    const attemptCheck = checkLoginAttempts(sanitizedEmail);
    if (!attemptCheck.canLogin) {
      return res.status(429).json({ 
        error: 'TooManyAttempts',
        message: attemptCheck.message,
        remainingTime: attemptCheck.remainingTime
      });
    }

    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: sanitizedEmail }, 
          { username: sanitizedEmail }
        ] 
      },
    });

    if (!user) {
      recordFailedLogin(sanitizedEmail);
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '邮箱或密码错误',
        remainingAttempts: attemptCheck.remainingAttempts - 1
      });
    }

    // 检查用户是否被封禁
    if (user.isBanned) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: '您的账户已被封禁，请联系管理员'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      recordFailedLogin(sanitizedEmail);
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '邮箱或密码错误',
        remainingAttempts: attemptCheck.remainingAttempts - 1
      });
    }

    clearLoginAttempts(sanitizedEmail);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpires,
      },
    });

    // 登录返回包含role字段
    res.json({
      message: '登录成功',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error(`[登录错误] 邮箱: ${email}, 错误: ${error.message}`);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '请提供刷新令牌' 
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.userId !== decoded.userId) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '无效的刷新令牌' 
      });
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '刷新令牌已过期' 
      });
    }

    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: decoded.userId,
        expiresAt: newExpiresAt,
      },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
    }

    res.json({ message: '登出成功' });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        backgroundUrl: true,
        bio: true,
        role: true,
        emailVerified: true,
        needReview: true,
        createdAt: true,
        _count: {
          select: { diaries: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'NotFoundError',
        message: '用户不存在' 
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// 新增：修改用户名
const updateUsername = async (req, res, next) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供用户名'
      });
    }

    const sanitizedUsername = sanitizeInput(username);

    if (!validateUsername(sanitizedUsername)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '用户名必须是2-16个字符，只能包含字母、数字、下划线和中文'
      });
    }

    // 检查用户名是否已被使用
    const existingUser = await prisma.user.findFirst({
      where: {
        username: sanitizedUsername,
        NOT: { id: userId }
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'DuplicateError',
        message: '用户名已被使用'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: sanitizedUsername },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    res.json({
      message: '用户名修改成功',
      user,
    });
  } catch (error) {
    console.error(`[修改用户名错误] 用户: ${req.user.id}, 错误: ${error.message}`);
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '请提供当前密码和新密码' 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '新密码不能与当前密码相同' 
      });
    }

    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: passwordErrors.join('; ') 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'NotFoundError',
        message: '用户不存在' 
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'AuthenticationError',
        message: '当前密码错误' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    res.json({ message: '密码修改成功，请重新登录' });
  } catch (error) {
    console.error(`[修改密码错误] 用户: ${userId}, 错误: ${error.message}`);
    next(error);
  }
};

// 通过邮箱验证码重置密码
const resetPassword = async (req, res, next) => {
  try {
    const { email, verificationCode, newPassword } = req.body;

    if (!email || !verificationCode || !newPassword) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供邮箱、验证码和新密码'
      });
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    // 检查是否启用邮箱验证
    const { getEmailConfig } = require('../utils/emailService');
    const config = await getEmailConfig();
    if (!config.enableEmailVerify) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '忘记密码功能未启用，请联系管理员'
      });
    }

    // 验证验证码
    const codeValidation = verifyCode(sanitizedEmail, verificationCode);
    if (!codeValidation.valid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: codeValidation.message
      });
    }

    // 验证密码强度
    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: passwordErrors.join('; ')
      });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '该邮箱未注册'
      });
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 删除所有刷新令牌，强制重新登录
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    console.log(`[重置密码成功] 邮箱: ${sanitizedEmail}`);

    res.json({
      message: '密码重置成功，请使用新密码登录',
      newPassword: newPassword
    });
  } catch (error) {
    console.error(`[重置密码错误] 错误: ${error.message}`);
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateUsername,
  changePassword,
  sendVerificationCode,
  sendVerificationCodeWithCaptcha,
  generateImageCaptcha,
  resetPassword,
};
