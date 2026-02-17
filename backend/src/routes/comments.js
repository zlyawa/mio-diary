const express = require('express');
const router = express.Router();
const { auth, optionalAuth, adminOnly } = require('../middleware/auth');
const {
  getComments,
  getReplies,
  createComment,
  updateComment,
  deleteComment,
  toggleLikeComment,
  getCommentLikeStatus,
  reportComment,
  getCommentHistory,
  reviewComment,
  batchReviewComments,
  batchDeleteComments,
  getAllComments,
  getMyComments,
  getReports,
  handleReport,
  uploadCommentImage,
  commentImageUploadMiddleware
} = require('../controllers/commentController');

// ========== 管理员路由（必须放在动态参数路由之前） ==========

// 获取所有评论列表（管理员）
router.get('/admin/list', auth, adminOnly, getAllComments);

// 获取举报列表
router.get('/admin/reports', auth, adminOnly, getReports);

// 批量审核评论
router.post('/batch-review', auth, adminOnly, batchReviewComments);

// 批量删除评论
router.post('/batch-delete', auth, adminOnly, batchDeleteComments);

// 处理举报
router.patch('/admin/reports/:reportId', auth, adminOnly, handleReport);

// ========== 用户路由 ==========

// 获取用户自己的评论列表
router.get('/my/list', auth, getMyComments);

// ========== 公开路由 ==========

// 获取日记的评论列表（支持可选认证，用于显示点赞状态）
router.get('/:diaryId', optionalAuth, getComments);

// 获取评论的回复列表（支持可选认证）
router.get('/:commentId/replies', optionalAuth, getReplies);

// 获取评论点赞状态（支持可选认证）
router.get('/:commentId/like', optionalAuth, getCommentLikeStatus);

// ========== 需要登录的路由 ==========

// 发表评论（支持同时上传图片）
router.post('/', auth, commentImageUploadMiddleware, createComment);

// 上传评论图片（保留兼容，但不推荐使用）
router.post('/upload', auth, commentImageUploadMiddleware, uploadCommentImage);

// 更新评论
router.put('/:id', auth, updateComment);

// 删除评论
router.delete('/:id', auth, deleteComment);

// 点赞/取消点赞评论
router.post('/:commentId/like', auth, toggleLikeComment);

// 举报评论
router.post('/:commentId/report', auth, reportComment);

// 获取评论编辑历史
router.get('/:commentId/history', auth, getCommentHistory);

// 单条审核评论
router.patch('/:id/review', auth, adminOnly, reviewComment);

module.exports = router;