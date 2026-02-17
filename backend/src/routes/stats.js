const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { auth } = require('../middleware/auth');

/**
 * @route   GET /api/stats/heatmap
 * @desc    获取写作热力图数据
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @returns { data: [{ date: '2024-01-01', count: 3 }, ...], stats: {...} }
 */
router.get('/heatmap', auth, statsController.getHeatmapData);

/**
 * @route   GET /api/stats/mood-trend
 * @desc    获取心情趋势数据（按月统计）
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @returns { months: ['1月', '2月', ...], moods: { happy: [10, 15, ...], ... } }
 */
router.get('/mood-trend', auth, statsController.getMoodTrend);

/**
 * @route   GET /api/stats/word-cloud
 * @desc    获取词云数据
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @returns { words: [{ text: '旅行', count: 15 }, ...] }
 */
router.get('/word-cloud', auth, statsController.getWordCloudData);

/**
 * @route   GET /api/stats/writing-habits
 * @desc    获取写作习惯数据（24小时分布）
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @returns { hours: ['00:00', '01:00', ...], counts: [2, 0, 5, ...], stats: {...} }
 */
router.get('/writing-habits', auth, statsController.getWritingHabits);

/**
 * @route   GET /api/stats/all
 * @desc    获取所有统计数据（综合接口）
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @returns { heatmap, moodTrend, wordCloud, writingHabits }
 */
router.get('/all', auth, statsController.getAllStats);

module.exports = router;