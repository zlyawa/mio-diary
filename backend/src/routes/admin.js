const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, adminOnly } = require('../middleware/auth');

/**
 * @route   GET /api/admin/dashboard
 * @desc    获取仪表盘统计数据
 * @access  Admin Only
 */
router.get('/dashboard', auth, adminOnly, adminController.getDashboardStats);

/**
 * @route   GET /api/admin/users
 * @desc    获取用户列表
 * @access  Admin Only
 * @query   { page, limit, search, role, isBanned }
 */
router.get('/users', auth, adminOnly, adminController.getUsers);

/**
 * @route   PUT /api/admin/users/:userId/ban
 * @desc    封禁/解封用户
 * @access  Admin Only
 * @body    { isBanned, reason }
 */
router.put('/users/:userId/ban', auth, adminOnly, adminController.toggleUserBan);

/**
 * @route   POST /api/admin/users/:userId/reset-password
 * @desc    重置用户密码
 * @access  Admin Only
 */
router.post('/users/:userId/reset-password', auth, adminOnly, adminController.resetUserPassword);

/**
 * @route   GET /api/admin/reviews
 * @desc    获取待审核日记列表
 * @access  Admin Only
 * @query   { page, limit }
 */
router.get('/reviews', auth, adminOnly, adminController.getPendingDiaries);

/**
 * @route   GET /api/admin/diaries
 * @desc    获取所有日记列表
 * @access  Admin Only
 * @query   { page, limit, search, status }
 */
router.get('/diaries', auth, adminOnly, adminController.getAllDiaries);

/**
 * @route   PUT /api/admin/reviews/:diaryId
 * @desc    审核日记
 * @access  Admin Only
 * @body    { status, reason }
 */
router.put('/reviews/:diaryId', auth, adminOnly, adminController.reviewDiary);

/**
 * @route   GET /api/admin/settings
 * @desc    获取系统配置
 * @access  Admin Only
 */
router.get('/settings', auth, adminOnly, adminController.getSystemConfig);

/**
 * @route   PUT /api/admin/settings
 * @desc    更新系统配置
 * @access  Admin Only
 * @body    { enableEmailVerify, enableUserReview, smtp }
 */
router.put('/settings', auth, adminOnly, adminController.updateSystemConfig);

/**
 * @route   POST /api/admin/email/verify-smtp
 * @desc    验证SMTP配置
 * @access  Admin Only
 * @body    { smtp: { host, port, secure, user, pass } }
 */
router.post('/email/verify-smtp', auth, adminOnly, adminController.verifySMTP);

/**
 * @route   POST /api/admin/email/test
 * @desc    发送测试邮件
 * @access  Admin Only
 * @body    { to }
 */
router.post('/email/test', auth, adminOnly, adminController.sendTestEmail);

/**
 * @route   GET /api/admin/logs
 * @desc    获取管理员日志
 * @access  Admin Only
 * @query   { page, limit }
 */
router.get('/logs', auth, adminOnly, adminController.getAdminLogs);

/**
 * @route   DELETE /api/admin/diaries/:diaryId
 * @desc    删除日记（管理员权限）
 * @access  Admin Only
 */
router.delete('/diaries/:diaryId', auth, adminOnly, adminController.deleteDiary);

module.exports = router;