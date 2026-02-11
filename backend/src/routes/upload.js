const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload').raw;

/**
 * @route   POST /api/upload/image
 * @desc    上传单张图片
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    FormData with 'image' field
 * @accepts image/jpeg, image/jpg, image/png, image/gif, image/webp, image/svg+xml
 * @maxSize 5MB
 */
router.post('/image', auth, upload.single('image'), uploadController.uploadImage);

/**
 * @route   DELETE /api/upload/image/:filename
 * @desc    删除图片
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @param   filename - 图片文件名
 */
router.delete('/image/:filename', auth, uploadController.deleteImage);

module.exports = router;