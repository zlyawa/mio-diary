const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const {
  toggleLike,
  getLikeStatus,
  toggleFavorite,
  getFavorites,
  createFolder,
  getFolders,
  deleteFolder,
  createShareLink,
  getSharedDiary,
  getShareLinks,
  deleteShareLink
} = require('../controllers/interactionController');

// 点赞相关
router.post('/like', auth, toggleLike);
router.get('/likes/:diaryId', optionalAuth, getLikeStatus);

// 收藏相关
router.post('/favorite', auth, toggleFavorite);
router.get('/favorites', auth, getFavorites);

// 收藏夹相关
router.post('/folders', auth, createFolder);
router.get('/folders', auth, getFolders);
router.delete('/folders/:id', auth, deleteFolder);

// 分享相关
router.post('/share', auth, createShareLink);
router.get('/shares', auth, getShareLinks);
router.delete('/shares/:id', auth, deleteShareLink);
router.get('/share/:token', getSharedDiary);

module.exports = router;
