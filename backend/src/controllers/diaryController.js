const prisma = require('../config/database');
const notification = require('../utils/notification');
const DOMPurify = require('isomorphic-dompurify');
const { getEmailConfig } = require('../utils/emailService');

const MOODS = ['happy', 'sad', 'excited', 'calm', 'anxious', 'angry', 'neutral'];

/**
 * 获取内容过滤配置
 * @returns {Object} 配置对象
 */
const getContentFilterConfig = async () => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['enableContentFilter', 'sensitiveWords']
        }
      }
    });

    const configMap = {};
    configs.forEach((config) => {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    });

    return {
      enableContentFilter: configMap.enableContentFilter ?? false,
      sensitiveWords: configMap.sensitiveWords ?? ['暴力', '色情', '政治', '赌博', '毒品']
    };
  } catch (error) {
    console.error('[内容过滤] 获取配置失败:', error.message);
    return {
      enableContentFilter: false,
      sensitiveWords: ['暴力', '色情', '政治', '赌博', '毒品']
    };
  }
};

/**
 * 敏感词检查
 * @param {string} content - 需要检查的内容
 * @param {string[]} sensitiveWords - 敏感词列表
 * @returns {Object} 检查结果 { hasSensitiveWord: boolean, matchedWords: string[] }
 */
const checkSensitiveWords = (content, sensitiveWords) => {
  if (!content || !sensitiveWords || sensitiveWords.length === 0) {
    return { hasSensitiveWord: false, matchedWords: [] };
  }

  const matchedWords = [];
  const lowerContent = content.toLowerCase();

  for (const word of sensitiveWords) {
    if (!word) continue;
    const lowerWord = word.toLowerCase();
    if (lowerContent.includes(lowerWord)) {
      matchedWords.push(word);
    }
  }

  return {
    hasSensitiveWord: matchedWords.length > 0,
    matchedWords
  };
};

/**
 * 检查日记内容是否包含敏感词
 * @param {string} title - 日记标题
 * @param {string} content - 日记内容
 * @returns {Object|null} 如果包含敏感词返回错误对象，否则返回null
 */
const checkDiarySensitiveWords = async (title, content) => {
  const config = await getContentFilterConfig();

  if (!config.enableContentFilter) {
    return null;
  }

  // 检查标题
  const titleCheck = checkSensitiveWords(title, config.sensitiveWords);
  if (titleCheck.hasSensitiveWord) {
    return {
      error: 'ContentFilterError',
      message: `标题包含敏感词: ${titleCheck.matchedWords.join(', ')}`,
      matchedWords: titleCheck.matchedWords
    };
  }

  // 检查内容
  const contentCheck = checkSensitiveWords(content, config.sensitiveWords);
  if (contentCheck.hasSensitiveWord) {
    return {
      error: 'ContentFilterError',
      message: `内容包含敏感词: ${contentCheck.matchedWords.join(', ')}`,
      matchedWords: contentCheck.matchedWords
    };
  }

  return null;
};

const safeJsonParse = (str, defaultValue = []) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

/**
 * 清理心情数据
 * 注意：验证逻辑已在 validator.js 中完成
 */
const cleanMood = (mood) => {
  if (!mood) return 'neutral';
  // validator 已确保 mood 在 MOODS 列表中，这里只做默认值处理
  return MOODS.includes(mood) ? mood : 'neutral';
};

/**
 * 清理标签数据
 * 注意：验证逻辑已在 validator.js 中完成
 */
const cleanTags = (tags) => {
  if (!tags) return [];
  // validator 已确保 tags 是数组，这里只做数据清理
  const cleanedTags = tags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  return [...new Set(cleanedTags)];
};

/**
 * 清理图片数据
 * 注意：验证逻辑已在 validator.js 中完成
 */
const cleanImages = (images) => {
  if (!images) return [];
  // validator 已确保 images 是数组，这里只做数据清理
  const cleanedImages = images
    .filter(img => typeof img === 'string')
    .map(img => img.trim())
    .filter(img => img.length > 0);
  
  return [...new Set(cleanedImages)];
};

/**
 * 清理标题数据
 * 注意：验证逻辑已在 validator.js 中完成
 */
const cleanTitle = (title) => {
  if (!title) return '';
  // validator 已验证 title 非空且长度在 1-200 之间
  return title.trim().replace(/\s+/g, ' ');
};

/**
 * 清理内容数据
 * 使用DOMPurify进行服务端HTML净化，防止XSS攻击
 * 允许的标签：p, br, strong, b, em, i, u, h1, h2, h3, ul, ol, li, blockquote, code, pre, a, img
 * 允许的属性：href, title, target, rel, src, alt
 */
const cleanContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  // validator 已验证 content 非空且长度在 1-100000 之间
  // 使用DOMPurify净化HTML内容，防止XSS攻击
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 
                   'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt']
  });
};

const createDiary = async (req, res, next) => {
  try {
    const { title, content, mood, tags, images, categoryId } = req.body;

    // 数据清理（验证已在中间件完成）
    const cleanedTitle = cleanTitle(title);
    const cleanedContent = cleanContent(content);
    const cleanedMood = cleanMood(mood);
    const cleanedTags = cleanTags(tags);
    const cleanedImages = cleanImages(images);

    // XSS过滤后，进行敏感词检查
    const sensitiveCheckResult = await checkDiarySensitiveWords(cleanedTitle, cleanedContent);
    if (sensitiveCheckResult) {
      return res.status(400).json(sensitiveCheckResult);
    }

    // 验证分类是否存在且属于当前用户
    let validCategoryId = null;
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: req.user.id },
      });
      if (category) {
        validCategoryId = categoryId;
      }
    }

    // 获取全局审核开关配置（使用缓存）
    const emailConfig = await getEmailConfig().catch(() => ({}));
    const enableUserReview = emailConfig.enableUserReview === true;

    // 如果全局审核开关开启，日记状态设为pending，否则为approved
    // 这适用于所有用户，不仅仅是新用户
    const diaryStatus = enableUserReview ? 'pending' : 'approved';

    const diary = await prisma.diary.create({
      data: {
        title: cleanedTitle,
        content: cleanedContent,
        mood: cleanedMood,
        tags: JSON.stringify(cleanedTags),
        images: JSON.stringify(cleanedImages),
        userId: req.user.id,
        status: diaryStatus,
        categoryId: validCategoryId,
      },
    });

    // 如果日记需要审核，通知管理员
    if (diaryStatus === 'pending') {
      try {
        // 查找所有管理员用户
        const admins = await prisma.user.findMany({
          where: { role: 'admin' },
          select: { id: true, username: true }
        });

        // 获取日记作者信息
        const author = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { username: true }
        });

        // 向每个管理员发送审核通知
        for (const admin of admins) {
          await notification.notifyUser(
            admin.id,
            'diary_review',
            `新的日记待审核`,
            `用户 "${author?.username || '未知'}" 提交了一篇日记《${cleanedTitle}》，请尽快审核。`
          );
        }
        console.log(`[日记审核通知] 已向 ${admins.length} 位管理员发送审核通知`);
      } catch (notifyError) {
        // 通知失败不影响日记创建成功的结果
        console.error('[日记审核通知] 发送通知失败:', notifyError);
      }
    }

    const resultDiary = {
      ...diary,
      tags: safeJsonParse(diary.tags),
      images: safeJsonParse(diary.images),
    };

    res.status(201).json({
      message: diaryStatus === 'pending' ? '日记已提交，等待审核' : '日记创建成功',
      diary: resultDiary,
    });
  } catch (error) {
    console.error(`[创建日记错误] 用户: ${req.user.id}, 错误: ${error.message}`);
    next(error);
  }
};

const { getAllChildrenIds } = require('./categoryController');

const getDiaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, mood, search, sortBy = 'createdAt', sortOrder = 'desc', categoryId } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const validSortBy = ['createdAt', 'updatedAt', 'title'].includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

    // 处理分类筛选（包括子分类）
    let categoryFilter = {};
    if (categoryId) {
      // 获取所有子分类ID
      const allCategories = await prisma.category.findMany({
        where: { userId: req.user.id },
        select: { id: true, parentId: true },
      });
      
      const categoryIds = getAllChildrenIds(allCategories, categoryId);
      categoryFilter = { categoryId: { in: categoryIds } };
    }

    const where = {
      userId: req.user.id,
      ...(mood && { mood }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
          { tags: { contains: search } },
        ],
      }),
      ...categoryFilter,
    };

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [validSortBy]: validSortOrder },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.diary.count({ where }),
    ]);

    const parsedDiaries = diaries.map(diary => ({
      ...diary,
      tags: safeJsonParse(diary.tags),
      images: safeJsonParse(diary.images),
      author: diary.user,
    }));

    res.json({
      diaries: parsedDiaries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDiaryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id.trim().length === 0) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '日记ID不能为空' 
      });
    }

    // 先获取日记信息，包含关联的用户信息和分类
    const diary = await prisma.diary.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            diaryPublic: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!diary) {
      return res.status(404).json({ 
        error: 'NotFoundError',
        message: '日记不存在' 
      });
    }

    // 检查权限：如果是自己的日记，或者对方设置了日记公开，则允许访问
    // req.user 可能为 null（未登录用户），需要先判断
    const isOwnDiary = req.user && diary.userId === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';
    const isPublicDiary = diary.user.diaryPublic === true;
    const isApproved = diary.status === 'approved';

    // 待审核日记只有作者和管理员可以访问
    if (diary.status === 'pending' && !isOwnDiary && !isAdmin) {
      return res.status(403).json({ 
        error: 'AuthorizationError',
        message: '该日记正在审核中，暂不可访问' 
      });
    }

    // 已拒绝的日记只有作者和管理员可以访问
    if (diary.status === 'rejected' && !isOwnDiary && !isAdmin) {
      return res.status(403).json({ 
        error: 'AuthorizationError',
        message: '该日记审核未通过，暂不可访问' 
      });
    }

    // 其他情况：私有日记或未审核通过的日记需要权限
    if (!isOwnDiary && !isAdmin && !isPublicDiary) {
      return res.status(403).json({ 
        error: 'AuthorizationError',
        message: '无权限访问此日记，该用户的日记设置为私密' 
      });
    }

    // 非作者和管理员只能看到已审核通过的公开日记
    if (!isOwnDiary && !isAdmin && !isApproved) {
      return res.status(403).json({ 
        error: 'AuthorizationError',
        message: '无权限访问此日记' 
      });
    }

    const parsedDiary = {
      ...diary,
      tags: safeJsonParse(diary.tags),
      images: safeJsonParse(diary.images),
    };

    res.json({ diary: parsedDiary });
  } catch (error) {
    next(error);
  }
};

const updateDiary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, mood, tags, images, categoryId } = req.body;

    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '日记ID不能为空'
      });
    }

    const existingDiary = await prisma.diary.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existingDiary) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '日记不存在'
      });
    }

    const updateData = {};

    // 数据清理（验证已在中间件完成）
    if (title !== undefined) {
      updateData.title = cleanTitle(title);
    }

    if (content !== undefined) {
      updateData.content = cleanContent(content);
    }

    // 如果启用了用户审核，编辑已审核的日记需要重新审核
    const config = await getEmailConfig().catch(() => ({}));
    if (config.enableUserReview && existingDiary.status === 'approved') {
      updateData.status = 'pending';
    }

    // XSS过滤后，如果标题或内容有更新，进行敏感词检查
    const titleToCheck = updateData.title !== undefined ? updateData.title : existingDiary.title;
    const contentToCheck = updateData.content !== undefined ? updateData.content : existingDiary.content;
    const sensitiveCheckResult = await checkDiarySensitiveWords(titleToCheck, contentToCheck);
    if (sensitiveCheckResult) {
      return res.status(400).json(sensitiveCheckResult);
    }

    if (mood !== undefined) {
      updateData.mood = cleanMood(mood);
    }

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(cleanTags(tags));
    }

    // 处理分类更新
    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === '') {
        updateData.categoryId = null;
      } else {
        // 验证分类是否存在且属于当前用户
        const category = await prisma.category.findFirst({
          where: { id: categoryId, userId: req.user.id },
        });
        if (category) {
          updateData.categoryId = categoryId;
        } else {
          return res.status(404).json({
            error: 'NotFoundError',
            message: '分类不存在'
          });
        }
      }
    }

    // 处理图片更新，需要清理被移除的图片
    const oldImages = safeJsonParse(existingDiary.images, []);
    let newImages = oldImages; // 默认保持不变

    if (images !== undefined) {
      newImages = cleanImages(images);
      updateData.images = JSON.stringify(newImages);
    }

    const diary = await prisma.diary.update({
      where: { id },
      data: updateData,
    });

    // 清理被移除的图片文件（旧有但新列表中没有的）
    const fs = require('fs');
    const path = require('path');
    const UPLOADS_DIR = path.join(__dirname, '../../uploads');
    
    const imagesToDelete = oldImages.filter(img => !newImages.includes(img));
    
    imagesToDelete.forEach((imagePath) => {
      try {
        // imagePath 格式: /uploads/filename.ext
        // 提取文件名
        let filename = imagePath;
        if (imagePath.startsWith('/uploads/')) {
          filename = imagePath.substring('/uploads/'.length);
        } else if (imagePath.startsWith('uploads/')) {
          filename = imagePath.substring('uploads/'.length);
        }
        
        // 构建完整的文件路径
        const fullImagePath = path.join(UPLOADS_DIR, filename);
        
        if (fs.existsSync(fullImagePath)) {
          fs.unlinkSync(fullImagePath);
        }
      } catch (err) {
        // 图片删除失败不影响整体操作
        console.error(`删除图片失败: ${imagePath}`, err);
      }
    });

    const parsedDiary = {
      ...diary,
      tags: safeJsonParse(diary.tags),
      images: safeJsonParse(diary.images),
    };

    res.json({
      message: '日记更新成功',
      diary: parsedDiary,
    });
  } catch (error) {
    next(error);
  }
};

const { extractImageUrls, deleteFilesByUrl } = require('../utils/fileUtil');

const deleteDiary = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id.trim().length === 0) {
      return res.status(400).json({ 
        error: 'ValidationError',
        message: '日记ID不能为空' 
      });
    }

    const existingDiary = await prisma.diary.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existingDiary) {
      return res.status(404).json({ 
        error: 'NotFoundError',
        message: '日记不存在' 
      });
    }

    // 提取所有图片URL（从富文本内容和images字段）
    const imageUrls = extractImageUrls(existingDiary.content, existingDiary.images);

    // 删除数据库记录
    await prisma.diary.delete({
      where: { id },
    });

    // 清理关联的图片文件
    if (imageUrls.length > 0) {
      const result = await deleteFilesByUrl(imageUrls);
      if (result.failedFiles.length > 0) {
        console.error('[删除日记] 部分图片删除失败:', result.failedFiles);
      }
    }

    res.json({ 
      message: '日记删除成功',
      deletedImages: imageUrls.length 
    });
  } catch (error) {
    console.error(`[删除日记错误] 用户: ${req.user.id}, 日记: ${id}, 错误: ${error.message}`);
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [stats, totalDiaries, recentDiaries, tagsCount] = await Promise.all([
      prisma.diary.groupBy({
        by: ['mood'],
        where: { userId },
        _count: true,
      }),
      prisma.diary.count({
        where: { userId },
      }),
      prisma.diary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          mood: true,
          createdAt: true,
          tags: true,
          images: true,
          content: true,
        },
      }),
      prisma.diary.findMany({
        where: { userId },
        select: { tags: true },
      }),
    ]);

    const allTags = tagsCount
      .flatMap(diary => safeJsonParse(diary.tags))
      .reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

    const parsedRecentDiaries = recentDiaries.map(diary => ({
      ...diary,
      content: diary.content.substring(0, 200) + (diary.content.length > 200 ? '...' : ''),
      tags: safeJsonParse(diary.tags),
      images: safeJsonParse(diary.images),
    }));

    const moodCounts = stats.reduce((acc, stat) => {
      acc[stat.mood] = stat._count;
      return acc;
    }, {});

    MOODS.forEach(mood => {
      if (!moodCounts[mood]) {
        moodCounts[mood] = 0;
      }
    });

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await prisma.diary.count({
      where: {
        userId,
        createdAt: { gte: thisMonth },
      },
    });

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const weeklyCount = await prisma.diary.count({
      where: {
        userId,
        createdAt: { gte: thisWeek },
      },
    });

    res.json({
      totalDiaries,
      monthlyCount,
      weeklyCount,
      moodCounts,
      topTags: Object.entries(allTags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      recentDiaries: parsedRecentDiaries,
    });
  } catch (error) {
    next(error);
  }
};

const getAllTags = async (req, res, next) => {
  try {
    const diaries = await prisma.diary.findMany({
      where: { userId: req.user.id },
      select: { tags: true },
    });

    const allTags = diaries
      .flatMap(diary => safeJsonParse(diary.tags))
      .reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

    const sortedTags = Object.entries(allTags)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    res.json({ tags: sortedTags });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDiary,
  getDiaries,
  getDiaryById,
  updateDiary,
  deleteDiary,
  getDashboardStats,
  getAllTags,
};