const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const prisma = require('../config/database');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB default
const MAX_FILES = 10;

const DEFAULT_ALLOWED_MIME_TYPES = [
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

// MIME类型映射
const MIME_TYPE_MAP = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml'
};

/**
 * 从数据库获取上传配置
 * @returns {Promise<{maxFileSize: number, allowedMimeTypes: string[]}>}
 */
const getUploadConfig = async () => {
  try {
    const [maxImageSizeConfig, allowedImageTypesConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'maxImageSize' } }),
      prisma.systemConfig.findUnique({ where: { key: 'allowedImageTypes' } })
    ]);

    // 解析最大文件大小（MB转字节）
    let maxFileSize = DEFAULT_MAX_FILE_SIZE;
    if (maxImageSizeConfig?.value) {
      try {
        const sizeMB = JSON.parse(maxImageSizeConfig.value);
        if (typeof sizeMB === 'number' && sizeMB > 0) {
          maxFileSize = sizeMB * 1024 * 1024;
        }
      } catch (e) {
        console.warn('解析 maxImageSize 配置失败，使用默认值:', e.message);
      }
    }

    // 解析允许的图片类型
    let allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES;
    if (allowedImageTypesConfig?.value) {
      try {
        const types = JSON.parse(allowedImageTypesConfig.value);
        if (Array.isArray(types) && types.length > 0) {
          allowedMimeTypes = types
            .map(type => MIME_TYPE_MAP[type.toLowerCase()])
            .filter(Boolean);
          // 如果解析后为空，使用默认值
          if (allowedMimeTypes.length === 0) {
            allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES;
          }
        }
      } catch (e) {
        console.warn('解析 allowedImageTypes 配置失败，使用默认值:', e.message);
      }
    }

    return { maxFileSize, allowedMimeTypes };
  } catch (error) {
    console.error('获取上传配置失败:', error.message);
    return {
      maxFileSize: DEFAULT_MAX_FILE_SIZE,
      allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES
    };
  }
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

// 创建 multer 实例的工厂函数
const createUploadMiddleware = (maxFileSize, allowedMimeTypes) => {
  const fileFilter = (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype.toLowerCase();

    const hasValidMimeType = allowedMimeTypes.includes(mimetype);

    if (hasValidMimeType) {
      cb(null, true);
    } else {
      const error = new Error(
        `不支持的文件类型。允许的类型: ${allowedMimeTypes.join(', ')}`
      );
      error.code = 'INVALID_FILE_TYPE';
      cb(error);
    }
  };

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
      files: MAX_FILES,
      fieldSize: maxFileSize,
    },
    fileFilter,
  });
};

const uploadWithValidation = async (req, res, next) => {
  // 动态获取配置
  const { maxFileSize, allowedMimeTypes } = await getUploadConfig();
  
  // 创建带有动态配置的 multer 实例
  const upload = createUploadMiddleware(maxFileSize, allowedMimeTypes);
  const uploadMiddleware = upload.single('image');
  
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'ValidationError',
          message: `文件大小超过限制。最大允许: ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`,
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

// 创建默认的 multer 实例用于导出（向后兼容）
const defaultUpload = createUploadMiddleware(DEFAULT_MAX_FILE_SIZE, DEFAULT_ALLOWED_MIME_TYPES);

module.exports = uploadWithValidation;
module.exports.raw = defaultUpload;
module.exports.UPLOADS_DIR = UPLOADS_DIR;
module.exports.MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE;
module.exports.MAX_FILES = MAX_FILES;
module.exports.ALLOWED_MIME_TYPES = DEFAULT_ALLOWED_MIME_TYPES;
module.exports.getUploadConfig = getUploadConfig;