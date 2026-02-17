const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} = require('../controllers/categoryController');

/**
 * @route   GET /api/categories
 * @desc    获取用户分类树
 * @access  Private
 */
router.get('/', auth, getCategories);

/**
 * @route   POST /api/categories
 * @desc    创建分类
 * @access  Private
 */
router.post('/', auth, createCategory);

/**
 * @route   GET /api/categories/:id
 * @desc    获取分类详情
 * @access  Private
 */
router.get('/:id', auth, getCategoryById);

/**
 * @route   PUT /api/categories/:id
 * @desc    更新分类
 * @access  Private
 */
router.put('/:id', auth, updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    删除分类
 * @access  Private
 */
router.delete('/:id', auth, deleteCategory);

module.exports = router;