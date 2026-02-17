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

// ==================== 系统配置管理 ====================

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
 * @body    { 任意配置项 }
 */
router.put('/settings', auth, adminOnly, adminController.updateSystemConfig);

/**
 * @route   POST /api/admin/settings/reset
 * @desc    重置系统配置为默认值
 * @access  Admin Only
 */
router.post('/settings/reset', auth, adminOnly, adminController.resetSystemConfig);

/**
 * @route   POST /api/admin/settings/cache/clear
 * @desc    清除配置缓存（热更新）
 * @access  Admin Only
 */
router.post('/settings/cache/clear', auth, adminOnly, adminController.clearConfigCache);

/**
 * @route   GET /api/admin/settings/export
 * @desc    导出系统配置为JSON
 * @access  Admin Only
 */
router.get('/settings/export', auth, adminOnly, adminController.exportConfig);

/**
 * @route   POST /api/admin/settings/import
 * @desc    从JSON导入系统配置
 * @access  Admin Only
 * @body    { config: Object } 或 { template: String }
 */
router.post('/settings/import', auth, adminOnly, adminController.importConfig);

/**
 * @route   GET /api/admin/settings/logs
 * @desc    获取配置变更日志
 * @access  Admin Only
 * @query   { page, limit, key }
 */
router.get('/settings/logs', auth, adminOnly, adminController.getConfigLogs);

// ==================== 系统健康检查 ====================

/**
 * @route   GET /api/admin/health
 * @desc    系统健康状态检查
 * @access  Admin Only
 */
router.get('/health', auth, adminOnly, adminController.healthCheck);

// ==================== 系统公告管理 ====================

/**
 * @route   GET /api/admin/announcements
 * @desc    获取公告列表（管理端）
 * @access  Admin Only
 * @query   { page, limit, active, type }
 */
router.get('/announcements', auth, adminOnly, adminController.getAnnouncements);

/**
 * @route   GET /api/admin/announcements/:id
 * @desc    获取单个公告
 * @access  Admin Only
 */
router.get('/announcements/:id', auth, adminOnly, adminController.getAnnouncement);

/**
 * @route   POST /api/admin/announcements
 * @desc    创建公告
 * @access  Admin Only
 * @body    { title, content, type, priority, isPinned, isActive, startAt, endAt }
 */
router.post('/announcements', auth, adminOnly, adminController.createAnnouncement);

/**
 * @route   PUT /api/admin/announcements/:id
 * @desc    更新公告
 * @access  Admin Only
 * @body    { title, content, type, priority, isPinned, isActive, startAt, endAt }
 */
router.put('/announcements/:id', auth, adminOnly, adminController.updateAnnouncement);

/**
 * @route   DELETE /api/admin/announcements/:id
 * @desc    删除公告
 * @access  Admin Only
 */
router.delete('/announcements/:id', auth, adminOnly, adminController.deleteAnnouncement);

// ==================== 邮件服务测试 ====================

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

// ==================== 管理员日志 ====================

/**
 * @route   GET /api/admin/logs
 * @desc    获取管理员日志
 * @access  Admin Only
 * @query   { page, limit }
 */
router.get('/logs', auth, adminOnly, adminController.getAdminLogs);

// ==================== 日记管理 ====================

/**
 * @route   DELETE /api/admin/diaries/:diaryId
 * @desc    删除日记（管理员权限）
 * @access  Admin Only
 */
router.delete('/diaries/:diaryId', auth, adminOnly, adminController.deleteDiary);

// ==================== AI审核 ====================

/**
 * @route   POST /api/admin/ai-moderation/test
 * @desc    测试AI审核配置
 * @access  Admin Only
 * @body    { zhipuApiKey, zhipuModel, aiModerationPrompt, aiModerationThreshold }
 */
router.post('/ai-moderation/test', auth, adminOnly, adminController.testAIModeration);

module.exports = router;