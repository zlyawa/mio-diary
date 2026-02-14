const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateRegistration, validateLogin, validateChangePassword, validateUsername } = require('../middleware/validator');

/**
 * @route   GET /api/auth/captcha
 * @desc    生成图片验证码
 * @access  Public
 */
router.get('/captcha', authController.generateImageCaptcha);

/**
 * @route   POST /api/auth/send-verification-code
 * @desc    发送邮箱验证码
 * @access  Public
 * @body    { email, captchaId, captchaInput }
 */
router.post('/send-verification-code', authController.sendVerificationCodeWithCaptcha);

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 * @body    { email, password, verificationCode }
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
 * @route   PUT /api/auth/username
 * @desc    修改用户名
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    { username }
 */
router.put('/username', auth, validateUsername, authController.updateUsername);

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
        username: req.user.username,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    通过邮箱验证码重置密码
 * @access  Public
 * @body    { email, verificationCode, newPassword }
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;
