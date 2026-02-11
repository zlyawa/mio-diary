const crypto = require('crypto');

const generateErrorId = () => {
  return crypto.randomBytes(16).toString('hex');
};

const errorHandler = (err, req, res, next) => {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorContext = {
    errorId,
    timestamp,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || null,
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
    },
  };

  if (isDevelopment) {
    console.error(`[${errorId}] 错误详情:`, JSON.stringify(errorContext, null, 2));
  } else {
    console.error(`[${errorId}] 错误: ${err.name} - ${err.message}`);
    console.error(`[${errorId}] 路径: ${req.method} ${req.path}`);
  }

  if (err.name === 'ValidationError' || err.error === 'ValidationError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: '数据验证失败',
      code: 'VALIDATION_ERROR',
      errorId,
      errors: Array.isArray(err.errors) 
        ? err.errors.map(e => e.message || e)
        : (err.message || '验证失败'),
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      const field = Array.isArray(err.meta?.target) 
        ? err.meta.target.join(', ') 
        : err.meta?.target;
      return res.status(409).json({
        error: 'DuplicateError',
        message: field ? `${field} 已存在` : '数据已存在',
        code: 'DUPLICATE_ENTRY',
        field,
        errorId,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '记录不存在',
        code: 'RECORD_NOT_FOUND',
        errorId,
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'ForeignKeyError',
        message: '关联数据不存在',
        code: 'FOREIGN_KEY_ERROR',
        errorId,
      });
    }
    return res.status(400).json({
      error: 'DatabaseError',
      message: '数据库操作失败',
      code: 'DATABASE_ERROR',
      errorId,
      ...(isDevelopment && { details: err.message }),
    });
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: '数据格式错误',
      code: 'DATA_FORMAT_ERROR',
      errorId,
      ...(isDevelopment && { details: err.message }),
    });
  }

  if (err.name === 'PrismaClientInitializationError') {
    return res.status(500).json({
      error: 'ServerError',
      message: '数据库连接失败，请稍后重试',
      code: 'DATABASE_CONNECTION_ERROR',
      errorId,
    });
  }

  if (err.name === 'PrismaClientRustPanicError') {
    return res.status(500).json({
      error: 'ServerError',
      message: '数据库内部错误',
      code: 'DATABASE_INTERNAL_ERROR',
      errorId,
    });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '文件大小超过限制（最大5MB）',
        code: 'FILE_TOO_LARGE',
        errorId,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '文件数量超过限制',
        code: 'TOO_MANY_FILES',
        errorId,
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '意外的文件字段',
        code: 'UNEXPECTED_FILE',
        errorId,
      });
    }
    if (err.code === 'LIMIT_FIELD_KEY' || err.code === 'LIMIT_FIELD_VALUE' || err.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '表单字段数量或大小超过限制',
        code: 'FORM_LIMIT_EXCEEDED',
        errorId,
      });
    }
    return res.status(400).json({ 
      error: 'UploadError',
      message: '文件上传错误',
      code: 'UPLOAD_ERROR',
      errorId,
      ...(isDevelopment && { details: err.message }),
    });
  }

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'ValidationError',
      message: '请求体格式错误，请检查JSON格式',
      code: 'INVALID_JSON',
      errorId,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'AuthenticationError',
      message: '令牌已过期，请重新登录',
      code: 'TOKEN_EXPIRED',
      errorId,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'AuthenticationError',
      message: '无效的令牌',
      code: 'INVALID_TOKEN',
      errorId,
    });
  }

  if (err.name === 'NotBeforeError') {
    return res.status(401).json({
      error: 'AuthenticationError',
      message: '令牌尚未生效',
      code: 'TOKEN_NOT_ACTIVE',
      errorId,
    });
  }

  if (err.statusCode === 401 || err.status === 401) {
    return res.status(401).json({
      error: 'AuthenticationError',
      message: err.message || '未授权访问',
      code: err.code || 'UNAUTHORIZED',
      errorId,
    });
  }

  if (err.statusCode === 403 || err.status === 403) {
    return res.status(403).json({
      error: 'AuthorizationError',
      message: err.message || '无权访问',
      code: err.code || 'FORBIDDEN',
      errorId,
    });
  }

  if (err.statusCode === 404 || err.status === 404) {
    return res.status(404).json({
      error: 'NotFoundError',
      message: err.message || '请求的资源不存在',
      code: err.code || 'NOT_FOUND',
      errorId,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  res.status(statusCode).json({
    error: isClientError ? 'ClientError' : 'ServerError',
    message: err.message || (isClientError ? '请求错误' : '服务器内部错误'),
    code: err.code || (isClientError ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR'),
    errorId,
    ...(isDevelopment && {
      stack: err.stack,
      details: errorContext,
    }),
  });
};

const notFoundHandler = (req, res) => {
  const errorId = generateErrorId();
  res.status(404).json({
    error: 'NotFoundError',
    message: `找不到路径: ${req.method} ${req.path}`,
    code: 'ROUTE_NOT_FOUND',
    errorId,
  });
};

module.exports = { errorHandler, notFoundHandler, generateErrorId };