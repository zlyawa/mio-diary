const prisma = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { notifyUser } = require('../utils/notification');

/**
 * 点赞/取消点赞
 * POST /api/interactions/like
 */
const toggleLike = async (req, res, next) => {
  try {
    const { diaryId } = req.body;
    const userId = req.user.id;

    // 验证日记存在
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      include: { user: true }
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 检查是否已点赞
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_diaryId: {
          userId,
          diaryId
        }
      }
    });

    if (existingLike) {
      // 取消点赞
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
      
      // 获取最新点赞数
      const likeCount = await prisma.like.count({
        where: { diaryId }
      });
      
      return res.json({
        liked: false,
        likeCount,
        message: '已取消点赞'
      });
    } else {
      // 添加点赞
      await prisma.like.create({
        data: {
          userId,
          diaryId
        }
      });

      // 发送通知给日记作者（如果不是自己点赞自己）
      if (diary.userId !== userId) {
        await notifyUser(
          diary.userId,
          'like',
          '新点赞',
          `${req.user.username}赞了你的日记《${diary.title}》`
        );
      }

      // 获取最新点赞数
      const likeCount = await prisma.like.count({
        where: { diaryId }
      });

      return res.json({
        liked: true,
        likeCount,
        message: '点赞成功'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 获取点赞状态
 * GET /api/interactions/likes/:diaryId
 */
const getLikeStatus = async (req, res, next) => {
  try {
    const { diaryId } = req.params;
    const userId = req.user?.id;

    const likeCount = await prisma.like.count({
      where: { diaryId }
    });

    let liked = false;
    if (userId) {
      const like = await prisma.like.findUnique({
        where: {
          userId_diaryId: {
            userId,
            diaryId
          }
        }
      });
      liked = !!like;
    }

    res.json({ liked, likeCount });
  } catch (error) {
    next(error);
  }
};

/**
 * 收藏/取消收藏
 * POST /api/interactions/favorite
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const { diaryId, folderId } = req.body;
    const userId = req.user.id;

    // 验证日记存在
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId }
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 如果指定了文件夹，验证文件夹存在且属于当前用户
    if (folderId) {
      const folder = await prisma.favoriteFolder.findUnique({
        where: { id: folderId }
      });
      if (!folder || folder.userId !== userId) {
        return res.status(404).json({ error: '收藏夹不存在' });
      }
    }

    // 检查是否已收藏
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_diaryId: {
          userId,
          diaryId
        }
      }
    });

    if (existingFavorite) {
      // 取消收藏
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      });

      return res.json({
        favorited: false,
        message: '已取消收藏'
      });
    } else {
      // 添加收藏
      await prisma.favorite.create({
        data: {
          userId,
          diaryId,
          folderId: folderId || null
        }
      });

      return res.json({
        favorited: true,
        message: '收藏成功'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的收藏列表
 * GET /api/interactions/favorites
 */
const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId };
    if (folderId) {
      where.folderId = folderId;
    }

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          diary: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      }),
      prisma.favorite.count({ where })
    ]);

    res.json({
      favorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建收藏夹
 * POST /api/interactions/folders
 */
const createFolder = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '收藏夹名称不能为空' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: '收藏夹名称不能超过50字' });
    }

    const folder = await prisma.favoriteFolder.create({
      data: {
        name: name.trim(),
        userId
      }
    });

    res.status(201).json({
      message: '收藏夹创建成功',
      folder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的收藏夹列表
 * GET /api/interactions/folders
 */
const getFolders = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const folders = await prisma.favoriteFolder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { favorites: true }
        }
      }
    });

    // 格式化返回数据
    const formattedFolders = folders.map(folder => ({
      ...folder,
      count: folder._count.favorites
    }));

    res.json({ folders: formattedFolders });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除收藏夹
 * DELETE /api/interactions/folders/:id
 */
const deleteFolder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const folder = await prisma.favoriteFolder.findUnique({
      where: { id }
    });

    if (!folder || folder.userId !== userId) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    // 删除收藏夹（关联的收藏会自动删除或设为null，取决于外键设置）
    await prisma.favoriteFolder.delete({
      where: { id }
    });

    res.json({ message: '收藏夹已删除' });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建分享链接
 * POST /api/interactions/share
 */
const createShareLink = async (req, res, next) => {
  try {
    const { diaryId, password, expiresIn, maxAccess } = req.body;
    const userId = req.user.id;

    // 验证日记存在且属于当前用户或日记是公开的
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId }
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    if (diary.userId !== userId) {
      return res.status(403).json({ error: '只能分享自己的日记' });
    }

    // 生成随机token
    const token = crypto.randomBytes(16).toString('hex');

    // 计算过期时间
    let expiresAt;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000);
    } else {
      // 默认7天
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    // 对密码进行哈希处理（如果设置了密码）
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const shareLink = await prisma.shareLink.create({
      data: {
        diaryId,
        userId,
        token,
        password: hashedPassword,
        expiresAt,
        maxAccess: maxAccess ? parseInt(maxAccess) : null
      }
    });

    res.status(201).json({
      message: '分享链接创建成功',
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareLink.token}`,
        expiresAt: shareLink.expiresAt,
        hasPassword: !!shareLink.password
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 通过分享链接访问日记
 * GET /api/interactions/share/:token
 */
const getSharedDiary = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        diary: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    if (!shareLink) {
      return res.status(404).json({ error: '分享链接不存在' });
    }

    // 检查是否过期
    if (new Date() > shareLink.expiresAt) {
      return res.status(410).json({ error: '分享链接已过期' });
    }

    // 检查访问次数
    if (shareLink.maxAccess && shareLink.accessCount >= shareLink.maxAccess) {
      return res.status(410).json({ error: '分享链接已达到最大访问次数' });
    }

    // 验证密码
    if (shareLink.password) {
      if (!password) {
        return res.status(401).json({ error: '请输入密码' });
      }
      const passwordMatch = await bcrypt.compare(password, shareLink.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: '密码错误' });
      }
    }

    // 增加访问次数
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { accessCount: { increment: 1 } }
    });

    res.json({
      diary: shareLink.diary,
      shareInfo: {
        accessCount: shareLink.accessCount + 1,
        maxAccess: shareLink.maxAccess,
        expiresAt: shareLink.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的分享链接列表
 * GET /api/interactions/shares
 */
const getShareLinks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [shareLinks, total] = await Promise.all([
      prisma.shareLink.findMany({
        where: { userId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          diary: {
            select: {
              id: true,
              title: true
            }
          }
        }
      }),
      prisma.shareLink.count({ where: { userId } })
    ]);

    res.json({
      shareLinks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除分享链接
 * DELETE /api/interactions/shares/:id
 */
const deleteShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const shareLink = await prisma.shareLink.findUnique({
      where: { id }
    });

    if (!shareLink || shareLink.userId !== userId) {
      return res.status(404).json({ error: '分享链接不存在' });
    }

    await prisma.shareLink.delete({
      where: { id }
    });

    res.json({ message: '分享链接已删除' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
