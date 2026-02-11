const prisma = require('../config/database');

const MOODS = ['happy', 'sad', 'excited', 'calm', 'anxious', 'angry', 'neutral'];

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
 * 注意：验证逻辑已在 validator.js 中完成
 * 对于富文本内容，不进行HTML转义，直接保存
 */
const cleanContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  // validator 已验证 content 非空且长度在 1-100000 之间
  // 富文本内容直接保存，不做 trim（因为 HTML 标签开头可能有空格）
  // 不做任何HTML转义，保持富文本内容完整性
  return content;
};

const createDiary = async (req, res, next) => {
  try {
    const { title, content, mood, tags, images } = req.body;

    // 数据清理（验证已在中间件完成）
    const cleanedTitle = cleanTitle(title);
    const cleanedContent = cleanContent(content);
    const cleanedMood = cleanMood(mood);
    const cleanedTags = cleanTags(tags);
    const cleanedImages = cleanImages(images);

    const diary = await prisma.diary.create({
      data: {
        title: cleanedTitle,
        content: cleanedContent,
        mood: cleanedMood,
        tags: JSON.stringify(cleanedTags),
        images: JSON.stringify(cleanedImages),
        userId: req.user.id,
      },
    });

    const resultDiary = {
      ...diary,
      tags: safeJsonParse(diary.tags),
      images: safeJsonParse(diary.images),
    };

    res.status(201).json({
      message: '日记创建成功',
      diary: resultDiary,
    });
  } catch (error) {
    next(error);
  }
};

const getDiaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, mood, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const validSortBy = ['createdAt', 'updatedAt', 'title'].includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

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
    };

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [validSortBy]: validSortOrder },
      }),
      prisma.diary.count({ where }),
    ]);

    const parsedDiaries = diaries.map(diary => ({
      ...diary,
      tags: safeJsonParse(diary.tags),
      images: safeJsonParse(diary.images),
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

    // 先获取日记信息，包含关联的用户信息
    const diary = await prisma.diary.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            diaryPublic: true,
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
    const isPublicDiary = diary.user.diaryPublic === true;

    if (!isOwnDiary && !isPublicDiary) {
      return res.status(403).json({ 
        error: 'AuthorizationError',
        message: '无权限访问此日记，该用户的日记设置为私密' 
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
    const { title, content, mood, tags, images } = req.body;

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

    if (mood !== undefined) {
      updateData.mood = cleanMood(mood);
    }

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(cleanTags(tags));
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

    // 获取日记关联的图片列表
    const images = safeJsonParse(existingDiary.images, []);

    // 删除数据库记录
    await prisma.diary.delete({
      where: { id },
    });

    // 清理关联的图片文件
    const fs = require('fs');
    const path = require('path');
    const UPLOADS_DIR = path.join(__dirname, '../../uploads');
    
    images.forEach((imagePath) => {
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
        // 图片删除失败不影响整体操作，记录错误即可
        console.error(`删除图片失败: ${imagePath}`, err);
      }
    });

    res.json({ message: '日记删除成功' });
  } catch (error) {
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