const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/svg+xml': [0x3C, 0x73, 0x76, 0x67],
};

const ensureUploadsDirectory = async () => {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true, mode: 0o755 });
      console.log('✓ uploads 目录已创建');
    } catch (error) {
      console.error('✗ 创建 uploads 目录失败:', error);
      throw new Error('无法创建上传目录');
    }
  }
};

const validateFileSignature = async (filePath, expectedMimeType) => {
  try {
    const buffer = await fs.readFile(filePath);
    const signature = FILE_SIGNATURES[expectedMimeType];
    
    if (!signature) {
      return true;
    }

    const fileSignature = Array.from(buffer.slice(0, signature.length));
    
    for (let i = 0; i < signature.length; i++) {
      if (fileSignature[i] !== signature[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('文件签名验证失败:', error);
    return false;
  }
};

const generateSecureFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
};

const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadsDirectory();
      cb(null, UPLOADS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const sanitizedName = sanitizeFilename(file.originalname);
      const secureFilename = generateSecureFilename(sanitizedName);
      cb(null, secureFilename);
    } catch (error) {
      cb(error);
    }
  },
});

const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'];
  const hasValidExtension = allowedExtensions.includes(extname);
  const hasValidMimeType = ALLOWED_MIME_TYPES.includes(mimetype);

  if (hasValidExtension && hasValidMimeType) {
    cb(null, true);
  } else {
    const error = new Error(
      `不支持的文件类型。允许的类型: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
    fieldSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

const uploadWithValidation = async (req, res, next) => {
  const uploadMiddleware = upload.single('image');
  
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'ValidationError',
          message: `文件大小超过限制。最大允许: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE',
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'ValidationError',
          message: `文件数量超过限制。最大允许: ${MAX_FILES}个`,
          code: 'TOO_MANY_FILES',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'ValidationError',
          message: '意外的文件字段',
          code: 'UNEXPECTED_FILE',
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: 'ValidationError',
          message: err.message,
          code: 'INVALID_FILE_TYPE',
        });
      }
      return next(err);
    }

    if (req.file) {
      try {
        const isValidSignature = await validateFileSignature(
          req.file.path,
          req.file.mimetype
        );

        if (!isValidSignature) {
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(400).json({
            error: 'ValidationError',
            message: '文件内容与扩展名不匹配',
            code: 'INVALID_FILE_CONTENT',
          });
        }

        try {
          await fs.chmod(req.file.path, 0o644);
        } catch (chmodError) {
          console.warn('无法设置文件权限:', chmodError.message);
        }

        next();
      } catch (validationError) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(500).json({
          error: 'ServerError',
          message: '文件验证失败',
          code: 'FILE_VALIDATION_ERROR',
        });
      }
    } else {
      next();
    }
  });
};

module.exports = uploadWithValidation;
module.exports.raw = upload;
module.exports.UPLOADS_DIR = UPLOADS_DIR;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
module.exports.MAX_FILES = MAX_FILES;
module.exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;