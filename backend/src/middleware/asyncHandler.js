/**
 * 异步路由处理包装器
 * 用于捕获未处理的异步错误并传递给错误处理中间件
 */

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
