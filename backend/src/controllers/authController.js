const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{3,20}$/;
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

const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '请填写所有必填字段' 
      });
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedUsername = sanitizeInput(username);

    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '邮箱格式不正确' 
      });
    }

    if (!validateUsername(sanitizedUsername)) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '用户名必须是3-20个字符，只能包含字母、数字、下划线和中文' 
      });
    }

    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: passwordErrors.join('; ') 
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: sanitizedEmail }, { username: sanitizedUsername }],
      },
    });

    if (existingUser) {
      if (existingUser.email === sanitizedEmail) {
        return res.status(409).json({ 
          error: 'DuplicateError',
          message: '邮箱已被使用' 
        });
      }
      return res.status(409).json({ 
        error: 'DuplicateError',
        message: '用户名已被使用' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        username: sanitizedUsername,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: '注册成功',
      user,
    });
  } catch (error) {
    console.error(`[注册错误] 用户: ${sanitizedUsername}, 错误: ${error.message}`);
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

    res.json({
      message: '登录成功',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
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

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
};