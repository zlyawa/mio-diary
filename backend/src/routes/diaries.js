const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateDiary } = require('../middleware/validator');

/**
 * @route   POST /api/diaries
 * @desc    创建新日记
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    { title, content, mood, tags, images }
 */
router.post('/', auth, validateDiary, diaryController.createDiary);

/**
 * @route   GET /api/diaries
 * @desc    获取日记列表（支持分页、搜索、筛选、排序）
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @query   page, limit, mood, search, sortBy, sortOrder
 */
router.get('/', auth, diaryController.getDiaries);

/**
 * @route   GET /api/diaries/dashboard/stats
 * @desc    获取仪表盘统计数据
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/dashboard/stats', auth, diaryController.getDashboardStats);

/**
 * @route   GET /api/diaries/tags
 * @desc    获取所有标签及使用次数
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/tags', auth, diaryController.getAllTags);

/**
 * @route   GET /api/diaries/:id
 * @desc    获取单篇日记详情
 * @access  Public (可选认证)
 * @header  Authorization: Bearer <token> (可选)
 * @param   id - 日记ID
 * @note    支持查看他人的公开日记，如果对方设置了日记私密则返回403
 *         未登录用户可以查看公开日记，已登录用户可以查看公开日记和自己的日记
 */
router.get('/:id', optionalAuth, diaryController.getDiaryById);

/**
 * @route   PUT /api/diaries/:id
 * @desc    更新日记
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @param   id - 日记ID
 * @body    { title, content, mood, tags, images }
 */
router.put('/:id', auth, validateDiary, diaryController.updateDiary);

/**
 * @route   DELETE /api/diaries/:id
 * @desc    删除日记
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @param   id - 日记ID
 */
router.delete('/:id', auth, diaryController.deleteDiary);

module.exports = router;