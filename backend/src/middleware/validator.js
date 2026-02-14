/**
 * 输入验证中间件
 * 提供统一的请求参数验证功能
 */

/**
 * 电子邮件验证正则
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 用户名验证正则（支持中文、字母、数字、下划线，2-16个字符）
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,16}$/;

/**
 * 密码强度验证
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;

/**
 * 验证电子邮件
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * 验证用户名
 */
const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  return USERNAME_REGEX.test(username.trim());
};

/**
 * 验证密码强度
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    errors.push('密码不能为空');
    return { valid: false, errors };
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

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 验证用户注册数据 - 简化版，仅验证email和password
 */
const validateRegistration = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  // 验证邮箱
  if (!email) {
    errors.push('邮箱不能为空');
  } else if (!isValidEmail(email)) {
    errors.push('邮箱格式不正确');
  }

  // 验证密码
  if (!password) {
    errors.push('密码不能为空');
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: '数据验证失败',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  // 清理输入数据
  req.body.email = email.trim().toLowerCase();

  next();
};

/**
 * 验证用户登录数据
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email) {
    errors.push('邮箱不能为空');
  } else if (!isValidEmail(email) && !isValidUsername(email)) {
    errors.push('请输入有效的邮箱或用户名');
  }

  if (!password) {
    errors.push('密码不能为空');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: '数据验证失败',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * 验证用户名修改
 */
const validateUsername = (req, res, next) => {
  const { username } = req.body;

  const errors = [];

  if (!username) {
    errors.push('用户名不能为空');
  } else if (!isValidUsername(username)) {
    errors.push('用户名必须是 2-16 个字符，只能包含字母、数字、下划线和中文');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: '数据验证失败',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  // 清理输入数据
  req.body.username = username.trim();

  next();
};

/**
 * 验证日记数据
 */
const validateDiary = (req, res, next) => {
  const { title, content, mood, tags, images } = req.body;

  const errors = [];

  // 根据请求方法判断是创建还是更新
  const isCreateRequest = req.method === 'POST';

  // 验证标题 - 创建时必填，更新时可选
  if (isCreateRequest) {
    // 创建日记：标题必须在请求体中且为有效字符串
    if (!title || typeof title !== 'string') {
      errors.push('标题不能为空');
    } else {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        errors.push('标题不能为空');
      } else if (trimmedTitle.length > 200) {
        errors.push('标题不能超过 200 个字符');
      }
    }
  } else if (title !== undefined && title !== null) {
    // 更新日记：如果提供了标题，则验证其有效性
    if (typeof title !== 'string') {
      errors.push('标题必须是字符串');
    } else {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        errors.push('标题不能为空');
      } else if (trimmedTitle.length > 200) {
        errors.push('标题不能超过 200 个字符');
      }
    }
  }

  // 验证内容 - 创建时必填，更新时可选
  if (isCreateRequest) {
    // 创建日记：内容必须在请求体中且为有效字符串
    if (!content || typeof content !== 'string') {
      errors.push('内容不能为空');
    } else {
      // 对于富文本HTML内容，需要检查实际文本内容（去除HTML标签后）
      const textContent = content.replace(/<[^>]*>/g, '').trim();
      if (!textContent) {
        errors.push('内容不能为空，请输入一些文本');
      } else if (content.length > 100000) {
        errors.push('内容不能超过 100000 个字符');
      }
    }
  } else if (content !== undefined && content !== null) {
    // 更新日记：如果提供了内容，则验证其有效性
    if (typeof content !== 'string') {
      errors.push('内容必须是字符串');
    } else {
      const textContent = content.replace(/<[^>]*>/g, '').trim();
      if (!textContent) {
        errors.push('内容不能为空，请输入一些文本');
      } else if (content.length > 100000) {
        errors.push('内容不能超过 100000 个字符');
      }
    }
  }

  // 验证心情 - 可选字段
  if (mood !== undefined) {
    const VALID_MOODS = ['happy', 'sad', 'excited', 'calm', 'anxious', 'angry', 'neutral'];
    if (!VALID_MOODS.includes(mood)) {
      errors.push(`无效的心情值，必须是以下之一: ${VALID_MOODS.join(', ')}`);
    }
  }

  // 验证标签 - 可选字段
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.push('标签必须是数组格式');
    } else {
      const invalidTags = tags.filter(tag => typeof tag !== 'string' || tag.trim().length > 50);
      if (invalidTags.length > 0) {
        errors.push('每个标签必须是字符串且不超过 50 个字符');
      }
      if (tags.length > 10) {
        errors.push('最多只能添加 10 个标签');
      }
    }
  }

  // 验证图片 - 可选字段
  if (images !== undefined) {
    if (!Array.isArray(images)) {
      errors.push('图片必须是数组格式');
    } else {
      if (images.length > 10) {
        errors.push('最多只能上传 10 张图片');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: '数据验证失败',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * 验证修改密码数据
 */
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const errors = [];

  if (!currentPassword) {
    errors.push('当前密码不能为空');
  }

  if (!newPassword) {
    errors.push('新密码不能为空');
  } else {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push('新密码不能与当前密码相同');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: '数据验证失败',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * 验证个人资料更新数据
 */
const validateUpdateProfile = (req, res, next) => {
  const { bio, diaryPublic } = req.body;

  const errors = [];

  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string') {
      errors.push('个人签名必须是字符串');
    } else if (bio.trim().length > 200) {
      errors.push('个人签名不能超过200字');
    }
  }

  if (diaryPublic !== undefined && diaryPublic !== null) {
    if (typeof diaryPublic !== 'boolean') {
      errors.push('日记可见性必须是布尔值');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: '数据验证失败',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

module.exports = {
  isValidEmail,
  isValidUsername,
  validatePassword,
  validateRegistration,
  validateLogin,
  validateUsername,
  validateDiary,
  validateChangePassword,
  validateUpdateProfile,
};