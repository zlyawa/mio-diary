const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateRegistration, validateLogin, validateChangePassword } = require('../middleware/validator');

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 * @body    { email, username, password }
 */
router.post('/register', validateRegistration, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 * @body    { email, password, rememberMe }
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    刷新访问令牌
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    获取用户信息
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/profile', auth, authController.getProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    { currentPassword, newPassword }
 */
router.put('/change-password', auth, validateChangePassword, authController.changePassword);

/**
 * @route   GET /api/auth/check
 * @desc    检查认证状态
 * @access  Optional
 * @header  Authorization: Bearer <token> (optional)
 */
router.get('/check', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({ 
      authenticated: true, 
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;