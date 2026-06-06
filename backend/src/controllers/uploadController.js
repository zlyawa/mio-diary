const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const uploadRaw = require('../middleware/upload').raw;

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isValidMimeType = (mimetype) => {
  return ALLOWED_MIME_TYPES.includes(mimetype.toLowerCase());
};

const isValidFileSize = (size) => {
  return size <= MAX_FILE_SIZE;
};

const generateSecureFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
};

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '未上传文件' 
      });
    }

    // 使用 upload 中间件处理后的图片 URL
    const imageUrl = req.file.processedUrl || `/uploads/${req.file.filename}`;
    const thumbnailUrl = req.file.thumbnailUrl || imageUrl;

    res.json({
      message: '图片上传成功',
      data: {
        imageUrl,
        thumbnailUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        width: req.file.width,
        height: req.file.height,
        sizeFormatted: formatFileSize(req.file.size),
        uploadDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const deleteImage = async (req, res, next) => {
  try {
    const { filename } = req.params;

    if (!filename || filename.trim().length === 0) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '文件名不能为空' 
      });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = path.join(UPLOADS_DIR, sanitizedFilename);

    // 防止路径遍历攻击
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(UPLOADS_DIR)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '无效的文件名'
      });
    }

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      res.json({ message: '图片删除成功' });
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        return res.status(404).json({ 
          error: 'NotFoundError',
          message: '文件不存在' 
        });
      }
      throw fileError;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
  uploadMiddleware: uploadRaw.single('image'),
  deleteImage,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};