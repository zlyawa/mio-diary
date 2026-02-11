/**
 * 统一 API 响应格式工具
 * 提供标准化的成功和错误响应
 */

/**
 * 成功响应
 * @param {Object} res - Express 响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP 状态码
 */
const successResponse = (res, data = null, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 错误响应
 * @param {Object} res - Express 响应对象
 * @param {string} error - 错误类型
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP 状态码
 * @param {*} details - 错误详情
 */
const errorResponse = (res, error = 'Error', message = '操作失败', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 验证错误响应 (400)
 */
const validationError = (res, message = '数据验证失败', errors = null) => {
  return errorResponse(res, 'ValidationError', message, 400, errors);
};

/**
 * 认证错误响应 (401)
 */
const authenticationError = (res, message = '认证失败') => {
  return errorResponse(res, 'AuthenticationError', message, 401);
};

/**
 * 授权错误响应 (403)
 */
const authorizationError = (res, message = '无权访问') => {
  return errorResponse(res, 'AuthorizationError', message, 403);
};

/**
 * 未找到错误响应 (404)
 */
const notFoundError = (res, message = '资源不存在') => {
  return errorResponse(res, 'NotFoundError', message, 404);
};

/**
 * 冲突错误响应 (409)
 */
const conflictError = (res, message = '数据冲突') => {
  return errorResponse(res, 'ConflictError', message, 409);
};

/**
 * 服务器错误响应 (500)
 */
const serverError = (res, message = '服务器内部错误', details = null) => {
  return errorResponse(res, 'ServerError', message, 500, details);
};

/**
 * 分页响应
 */
const paginatedResponse = (res, items, pagination, message = '获取成功') => {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 创建响应 (201)
 */
const createdResponse = (res, data, message = '创建成功') => {
  return successResponse(res, data, message, 201);
};

/**
 * 无内容响应 (204)
 */
const noContentResponse = (res) => {
  return res.status(204).send();
};

module.exports = {
  successResponse,
  errorResponse,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  conflictError,
  serverError,
  paginatedResponse,
  createdResponse,
  noContentResponse,
};
