const prisma = require('../config/database');
const { notifyUser } = require('../utils/notification');
const { sendEmail } = require('../utils/emailService');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const crypto = require('crypto');
const { successResponse, errorResponse, validationError, notFoundError, authorizationError, paginatedResponse } = require('../utils/response');
const commentModeration = require('../plugins/commentModeration');

// 评论图片上传配置
const COMMENTS_UPLOADS_DIR = path.join(__dirname, '../../uploads/comments');
const MAX_COMMENT_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_COMMENT_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// 确保评论图片目录存在
const ensureCommentsUploadsDirectory = async () => {
  try {
    await fs.access(COMMENTS_UPLOADS_DIR);
  } catch {
    try {
      await fs.mkdir(COMMENTS_UPLOADS_DIR, { recursive: true, mode: 0o755 });
      console.log('✓ comments uploads 目录已创建');
    } catch (error) {
      console.error('✗ 创建 comments uploads 目录失败:', error);
      throw new Error('无法创建评论图片上传目录');
    }
  }
};

// 生成安全文件名
const generateSecureFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
};

// 评论图片存储配置
const commentImageStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureCommentsUploadsDirectory();
      cb(null, COMMENTS_UPLOADS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const secureFilename = generateSecureFilename(file.originalname);
      cb(null, secureFilename);
    } catch (error) {
      cb(error);
    }
  },
});

// 评论图片上传中间件
const commentImageUpload = multer({
  storage: commentImageStorage,
  limits: {
    fileSize: MAX_COMMENT_IMAGE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const mimetype = file.mimetype.toLowerCase();
    if (ALLOWED_COMMENT_IMAGE_TYPES.includes(mimetype)) {
      cb(null, true);
    } else {
      const error = new Error(
        `不支持的文件类型。允许的类型: ${ALLOWED_COMMENT_IMAGE_TYPES.join(', ')}`
      );
      error.code = 'INVALID_FILE_TYPE';
      cb(error);
    }
  },
});

// 单图上传中间件（用于评论创建）
const commentSingleImageUpload = commentImageUpload.single('image');

// 可选图片上传中间件（处理无文件时不报错）
const optionalImageUpload = (req, res, next) => {
  commentImageUpload.single('image')(req, res, (err) => {
    if (err) {
      // 如果是 MulterError 且是预期内的错误（没有文件），忽略
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next();
      }
      // 其他错误继续传递
      return next(err);
    }
    next();
  });
};

/**
 * 获取日记的评论树
 * GET /api/comments/:diaryId
 * 支持两种分页方式：
 * 1. 传统分页: ?page=1&limit=20
 * 2. Cursor分页: ?cursor=xxx&limit=20 (用于加载更多)
 */
const getComments = async (req, res, next) => {
  try {
    const { diaryId } = req.params;
    const { page, cursor, limit = 20, sort = 'desc' } = req.query;
    const take = parseInt(limit);

    // 验证日记存在
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      select: { id: true }
    });

    if (!diary) {
      return notFoundError(res, '日记不存在');
    }

    // 构建基础查询条件
    const baseWhere = {
      diaryId,
      parentId: null,
      status: 'approved'
    };

    let comments;
    let total;
    let hasMore = false;
    let nextCursor = null;

    // 构建公共的 include 配置
    const commentInclude = {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          role: true
        }
      },
      _count: {
        select: { likes: true, replies: true }
      }
    };

    // Cursor分页（用于加载更多）
    if (cursor) {
      const cursorComment = await prisma.comment.findUnique({
        where: { id: cursor },
        select: { createdAt: true }
      });

      if (!cursorComment) {
        return validationError(res, '无效的游标');
      }

      const where = {
        ...baseWhere,
        createdAt: sort === 'asc' 
          ? { gt: cursorComment.createdAt }
          : { lt: cursorComment.createdAt }
      };

      // 获取多一条用于判断是否有更多
      comments = await prisma.comment.findMany({
        where,
        take: take + 1,
        orderBy: { createdAt: sort },
        include: commentInclude
      });

      // 判断是否还有更多
      hasMore = comments.length > take;
      if (hasMore) {
        comments.pop(); // 移除用于判断的多余记录
        nextCursor = comments[comments.length - 1]?.id;
      }

      total = await prisma.comment.count({ where: baseWhere });
    } 
    // 传统分页
    else {
      const currentPage = parseInt(page) || 1;
      const skip = (currentPage - 1) * take;

      const [commentsData, totalCount] = await Promise.all([
        prisma.comment.findMany({
          where: baseWhere,
          skip,
          take,
          orderBy: { createdAt: sort },
          include: commentInclude
        }),
        prisma.comment.count({ where: baseWhere })
      ]);

      comments = commentsData;
      total = totalCount;
      hasMore = skip + comments.length < total;
    }

    // 获取回复（限制数量，避免数据过大）
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await prisma.comment.findMany({
          where: { 
            parentId: comment.id,
            status: 'approved'
          },
          take: 3, // 默认只显示前3条回复
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                role: true
              }
            },
            _count: {
              select: { likes: true }
            }
          }
        });

        // 获取回复总数
        const totalReplies = await prisma.comment.count({
          where: { 
            parentId: comment.id,
            status: 'approved'
          }
        });

        return {
          ...comment,
          replies: {
            items: replies,
            total: totalReplies,
            hasMore: totalReplies > replies.length
          }
        };
      })
    );

    // 如果用户已登录，获取每条评论的点赞状态
    if (req.user) {
      const commentIds = commentsWithReplies.map(c => c.id);
      const replyIds = commentsWithReplies.flatMap(c => c.replies.items.map(r => r.id));
      const allIds = [...commentIds, ...replyIds];

      const userLikes = await prisma.commentLike.findMany({
        where: {
          userId: req.user.id,
          commentId: { in: allIds }
        },
        select: { commentId: true }
      });

      const likedSet = new Set(userLikes.map(l => l.commentId));

      commentsWithReplies.forEach(comment => {
        // Prisma 返回的字段已经是小写的 user，无需映射
        
        comment.isLiked = likedSet.has(comment.id);
        comment.likeCount = comment._count.likes;
        comment.replyCount = comment._count.replies;
        // 解析 images 字段
        comment.images = comment.images ? JSON.parse(comment.images) : [];
        delete comment._count;
        
        comment.replies.items.forEach(reply => {
          reply.isLiked = likedSet.has(reply.id);
          reply.likeCount = reply._count.likes;
          // 解析回复的 images 字段
          reply.images = reply.images ? JSON.parse(reply.images) : [];
          delete reply._count;
        });
      });
    } else {
      commentsWithReplies.forEach(comment => {
        // Prisma 返回的字段已经是小写的 user，无需映射
        
        comment.isLiked = false;
        comment.likeCount = comment._count.likes;
        comment.replyCount = comment._count.replies;
        // 解析 images 字段
        comment.images = comment.images ? JSON.parse(comment.images) : [];
        delete comment._count;
        
        comment.replies.items.forEach(reply => {
          reply.isLiked = false;
          reply.likeCount = reply._count.likes;
          // 解析回复的 images 字段
          reply.images = reply.images ? JSON.parse(reply.images) : [];
          delete reply._count;
        });
      });
    }

    const result = {
      comments: commentsWithReplies,
      pagination: cursor 
        ? { cursor, limit: take, hasMore, nextCursor }
        : { 
            page: parseInt(page) || 1, 
            limit: take, 
            total, 
            totalPages: Math.ceil(total / take),
            hasMore 
          }
    };

    return successResponse(res, result, '获取评论成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取评论的回复列表（分页）
 * GET /api/comments/:commentId/replies
 */
const getReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 验证父评论存在
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!parentComment) {
      return notFoundError(res, '评论不存在');
    }

    const [replies, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          parentId: commentId,
          status: 'approved'
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              role: true
            }
          },
          _count: {
            select: { likes: true }
          }
        }
      }),
      prisma.comment.count({
        where: {
          parentId: commentId,
          status: 'approved'
        }
      })
    ]);

    // 如果用户已登录，获取点赞状态
    if (req.user) {
      const replyIds = replies.map(r => r.id);
      const userLikes = await prisma.commentLike.findMany({
        where: {
          userId: req.user.id,
          commentId: { in: replyIds }
        },
        select: { commentId: true }
      });

      const likedSet = new Set(userLikes.map(l => l.commentId));

      replies.forEach(reply => {
        reply.isLiked = likedSet.has(reply.id);
        reply.likeCount = reply._count.likes;
        delete reply._count;
      });
    } else {
      replies.forEach(reply => {
        reply.isLiked = false;
        reply.likeCount = reply._count.likes;
        delete reply._count;
      });
    }

    return paginatedResponse(res, replies, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }, '获取回复成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 发表评论
 * POST /api/comments
 */
const createComment = async (req, res, next) => {
  try {
    const { diaryId, content, parentId } = req.body;
    const userId = req.user.id;

    // 验证日记存在
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      include: { user: true }
    });

    if (!diary) {
      // 如果有上传的图片，清理掉
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return notFoundError(res, '日记不存在');
    }

    // 验证内容不为空
    if (!content || content.trim().length === 0) {
      // 如果有上传的图片，清理掉
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return validationError(res, '评论内容不能为空');
    }

    // 验证内容长度
    if (content.length > 2000) {
      // 如果有上传的图片，清理掉
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return validationError(res, '评论内容不能超过2000字');
    }

    // 如果是回复，验证父评论存在
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });
      if (!parentComment) {
        // 如果有上传的图片，清理掉
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        return notFoundError(res, '回复的评论不存在');
      }
      // 只能回复顶级评论，不能回复回复
      if (parentComment.parentId) {
        // 如果有上传的图片，清理掉
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        return validationError(res, '只能回复主评论');
      }
    }

    // 处理评论数据和图片
    let finalContent = content.trim();
    let images = null;
    if (req.file) {
      const imageUrl = `/uploads/comments/${req.file.filename}`;
      images = JSON.stringify([imageUrl]);
    }

    // 准备评论数据
    const commentData = {
      content: finalContent,
      images,
      userId,
      diaryId,
      parentId: parentId || null,
      status: 'approved' // 默认通过，AI审核可能会修改
    };

    // 调用AI审核钩子
    const moderationResult = await commentModeration.beforeCommentSubmit(
      { comment: commentData },
      { ip: req.ip }
    );

    // 如果审核拒绝
    if (!moderationResult.success) {
      return errorResponse(res, 'CONTENT_REJECTED', moderationResult.error, 400);
    }

    // 使用审核后的评论数据
    const finalCommentData = moderationResult.comment || commentData;

    // 创建评论
    const comment = await prisma.comment.create({
      data: finalCommentData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            role: true
          }
        },
        _count: {
          select: { likes: true, replies: true }
        }
      }
    });

    // 调用审核后钩子（发送通知等）
    await commentModeration.afterCommentSubmit(
      { comment, result: moderationResult },
      { ip: req.ip }
    );

    // 发送通知给日记作者（如果不是自己评论自己，且评论已通过）
    if (diary.userId !== userId && comment.status === 'approved') {
      await notifyUser(
        diary.userId,
        'comment',
        '新评论',
        `${req.user.username}评论了你的日记《${diary.title}》`
      );
    }

    // 如果是回复，通知被回复的人（且评论已通过）
    if (parentId && comment.status === 'approved') {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: { user: true }
      });
      if (parentComment && parentComment.userId !== userId) {
        await notifyUser(
          parentComment.userId,
          'reply',
          '新回复',
          `${req.user.username}回复了你的评论`
        );
      }
    }

    // 构建响应消息
    let message = '评论成功';
    if (comment.status === 'pending') {
      message = '评论已提交，等待审核通过后显示';
    }

    // 格式化响应
    const responseComment = {
      ...comment,
      likeCount: 0,
      isLiked: false,
      replyCount: 0,
      images: comment.images ? JSON.parse(comment.images) : [],
      replies: { items: [], total: 0, hasMore: false }
    };
    delete responseComment._count;

    return successResponse(res, {
      comment: responseComment,
      pending: comment.status === 'pending'
    }, message, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新评论（支持编辑历史记录）
 * PUT /api/comments/:id
 */
const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return notFoundError(res, '评论不存在');
    }

    // 只能修改自己的评论或者是管理员
    if (comment.userId !== userId && req.user.role !== 'admin') {
      return authorizationError(res, '无权修改此评论');
    }

    if (!content || content.trim().length === 0) {
      return validationError(res, '评论内容不能为空');
    }

    if (content.length > 1000) {
      return validationError(res, '评论内容不能超过1000字');
    }

    const trimmedContent = content.trim();
    
    // 如果内容没有变化，直接返回
    if (trimmedContent === comment.content) {
      return successResponse(res, { 
        comment: {
          ...comment,
          images: comment.images ? JSON.parse(comment.images) : []
        }
      }, '评论内容未变化');
    }

    // 使用事务：保存编辑历史 + 更新评论
    const updated = await prisma.$transaction(async (tx) => {
      // 保存编辑历史
      await tx.commentEditHistory.create({
        data: {
          commentId: id,
          oldContent: comment.content,
          newContent: trimmedContent,
          editedBy: userId
        }
      });

      // 更新评论
      return await tx.comment.update({
        where: { id },
        data: { 
          content: trimmedContent,
          editCount: { increment: 1 }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              role: true
            }
          },
          _count: {
            select: { likes: true, replies: true }
          }
        }
      });
    });

    // 获取当前用户的点赞状态
    let isLiked = false;
    if (req.user) {
      const like = await prisma.commentLike.findUnique({
        where: {
          userId_commentId: {
            userId: req.user.id,
            commentId: id
          }
        }
      });
      isLiked = !!like;
    }

    const responseComment = {
      ...updated,
      likeCount: updated._count.likes,
      replyCount: updated._count.replies,
      images: updated.images ? JSON.parse(updated.images) : [],
      isLiked
    };
    delete responseComment._count;

    return successResponse(res, { comment: responseComment }, '评论已更新');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除评论
 * DELETE /api/comments/:id
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        replies: true
      }
    });

    if (!comment) {
      return notFoundError(res, '评论不存在');
    }

    // 只能删除自己的评论或者是管理员
    if (comment.userId !== userId && req.user.role !== 'admin') {
      return authorizationError(res, '无权删除此评论');
    }

    // 使用事务删除相关数据
    await prisma.$transaction(async (tx) => {
      // 如果有回复，一并删除
      if (comment.replies.length > 0) {
        const replyIds = comment.replies.map(r => r.id);
        
        // 删除回复的关联数据
        await tx.commentLike.deleteMany({
          where: { commentId: { in: replyIds } }
        });
        await tx.commentEditHistory.deleteMany({
          where: { commentId: { in: replyIds } }
        });
        await tx.commentReport.deleteMany({
          where: { commentId: { in: replyIds } }
        });

        await tx.comment.deleteMany({
          where: { parentId: id }
        });
      }

      // 删除点赞记录
      await tx.commentLike.deleteMany({
        where: { commentId: id }
      });

      // 删除编辑历史
      await tx.commentEditHistory.deleteMany({
        where: { commentId: id }
      });

      // 删除举报记录
      await tx.commentReport.deleteMany({
        where: { commentId: id }
      });

      await tx.comment.delete({
        where: { id }
      });
    });

    return successResponse(res, null, '评论已删除');
  } catch (error) {
    next(error);
  }
};

/**
 * 点赞/取消点赞评论
 * POST /api/comments/:commentId/like
 */
const toggleLikeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // 验证评论存在
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!comment) {
      return notFoundError(res, '评论不存在');
    }

    // 检查是否已点赞
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId
        }
      }
    });

    let liked;
    let likeCount;

    if (existingLike) {
      // 取消点赞
      await prisma.commentLike.delete({
        where: { id: existingLike.id }
      });
      
      liked = false;
    } else {
      // 添加点赞
      await prisma.commentLike.create({
        data: {
          userId,
          commentId
        }
      });

      // 发送通知给评论作者（如果不是自己点赞自己）
      if (comment.userId !== userId) {
        await notifyUser(
          comment.userId,
          'comment_like',
          '评论获赞',
          `${req.user.username}赞了你的评论`
        );
      }

      liked = true;
    }

    // 获取最新点赞数
    likeCount = await prisma.commentLike.count({
      where: { commentId }
    });

    return successResponse(res, {
      liked,
      likeCount
    }, liked ? '点赞成功' : '已取消点赞');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取评论点赞状态
 * GET /api/comments/:commentId/like
 */
const getCommentLikeStatus = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return notFoundError(res, '评论不存在');
    }

    const likeCount = await prisma.commentLike.count({
      where: { commentId }
    });

    let liked = false;
    if (userId) {
      const like = await prisma.commentLike.findUnique({
        where: {
          userId_commentId: {
            userId,
            commentId
          }
        }
      });
      liked = !!like;
    }

    return successResponse(res, {
      liked,
      likeCount
    }, '获取点赞状态成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 举报评论
 * POST /api/comments/:commentId/report
 */
const reportComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    // 验证评论存在
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return notFoundError(res, '评论不存在');
    }

    // 不能举报自己的评论
    if (comment.userId === userId) {
      return validationError(res, '不能举报自己的评论');
    }

    // 验证举报原因
    if (!reason || reason.trim().length === 0) {
      return validationError(res, '请提供举报原因');
    }

    const validReasons = ['spam', 'harassment', 'inappropriate', 'advertising', 'other'];
    if (!validReasons.includes(reason)) {
      return validationError(res, '无效的举报原因');
    }

    // 检查是否已举报过
    const existingReport = await prisma.commentReport.findFirst({
      where: {
        commentId,
        reporterId: userId
      }
    });

    if (existingReport) {
      return errorResponse(res, 'DuplicateReport', '您已举报过该评论', 409);
    }

    // 创建举报记录
    const report = await prisma.commentReport.create({
      data: {
        commentId,
        reporterId: userId,
        reason,
        description: description || null
      }
    });

    return successResponse(res, { report }, '举报已提交，我们会尽快处理', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取评论编辑历史
 * GET /api/comments/:commentId/history
 */
const getCommentHistory = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return notFoundError(res, '评论不存在');
    }

    // 只有评论作者和管理员可以查看编辑历史
    if (comment.userId !== req.user.id && req.user.role !== 'admin') {
      return authorizationError(res, '无权查看此评论的编辑历史');
    }

    const history = await prisma.commentEditHistory.findMany({
      where: { commentId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    return successResponse(res, { history }, '获取编辑历史成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 审核评论（管理员）
 * PATCH /api/comments/:id/review
 */
const reviewComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return validationError(res, '状态必须是 approved 或 rejected');
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { 
        status,
        auditReason: reason || null,
        moderatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            email: true
          }
        },
        diary: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // 发送通知给评论作者
    if (status === 'rejected') {
      await notifyUser(
        comment.userId,
        'comment_rejected',
        '评论未通过审核',
        `您在《${comment.diary.title}》下的评论未通过审核${reason ? `，原因：${reason}` : ''}`
      );
    } else if (status === 'approved') {
      await notifyUser(
        comment.userId,
        'comment_approved',
        '评论已通过审核',
        `您在《${comment.diary.title}》下的评论已通过审核`
      );
      
      // 发送邮件通知
      try {
        if (comment.user?.email) {
          await sendEmail({
            to: comment.user.email,
            subject: '您的评论已通过审核 - Mio Diary',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">评论审核通过</h2>
                <p>您好，${comment.user.username}！</p>
                <p>您在日记《<strong>${comment.diary.title}</strong>》中的评论已通过审核。</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #6b7280;">评论内容：</p>
                  <p style="margin: 10px 0 0 0;">${comment.content?.substring(0, 200)}${comment.content?.length > 200 ? '...' : ''}</p>
                </div>
                <p>感谢您的参与！</p>
              </div>
            `
          });
        }
      } catch (emailError) {
        console.error('[评论审核] 发送邮件通知失败:', emailError.message);
      }
    }

    return successResponse(res, { 
      comment: {
        ...comment,
        images: comment.images ? JSON.parse(comment.images) : []
      }
    }, status === 'approved' ? '评论已通过审核' : '评论已拒绝');
  } catch (error) {
    next(error);
  }
};

/**
 * 批量审核评论（管理员）
 * POST /api/comments/batch-review
 */
const batchReviewComments = async (req, res, next) => {
  try {
    const { ids, status, reason } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return validationError(res, '请提供要审核的评论ID列表');
    }

    if (!['approved', 'rejected'].includes(status)) {
      return validationError(res, '状态必须是 approved 或 rejected');
    }

    // 批量更新
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.comment.updateMany({
        where: { id: { in: ids } },
        data: { 
          status,
          auditReason: reason || null,
          moderatedAt: new Date()
        }
      });

      // 获取更新后的评论用于发送通知
      const comments = await tx.comment.findMany({
        where: { id: { in: ids } },
        include: {
          diary: {
            select: {
              title: true
            }
          }
        }
      });

      return { count: updated.count, comments };
    });

    // 异步发送通知（不阻塞响应）
    result.comments.forEach(comment => {
      if (status === 'rejected') {
        notifyUser(
          comment.userId,
          'comment_rejected',
          '评论未通过审核',
          `您在《${comment.diary.title}》下的评论未通过审核${reason ? `，原因：${reason}` : ''}`
        ).catch(console.error);
      } else if (status === 'approved') {
        notifyUser(
          comment.userId,
          'comment_approved',
          '评论已通过审核',
          `您在《${comment.diary.title}》下的评论已通过审核`
        ).catch(console.error);
      }
    });

    return successResponse(res, { 
      processed: result.count,
      status 
    }, `成功${status === 'approved' ? '通过' : '拒绝'} ${result.count} 条评论`);
  } catch (error) {
    next(error);
  }
};

/**
 * 批量删除评论（管理员）
 * POST /api/comments/batch-delete
 */
const batchDeleteComments = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return validationError(res, '请提供要删除的评论ID列表');
    }

    // 获取所有要删除的评论及其回复
    const comments = await prisma.comment.findMany({
      where: { id: { in: ids } },
      include: { replies: true }
    });

    const allCommentIds = new Set();
    comments.forEach(c => {
      allCommentIds.add(c.id);
      c.replies.forEach(r => allCommentIds.add(r.id));
    });
    const commentIdArray = Array.from(allCommentIds);

    // 批量删除
    await prisma.$transaction(async (tx) => {
      // 删除点赞记录
      await tx.commentLike.deleteMany({
        where: { commentId: { in: commentIdArray } }
      });

      // 删除编辑历史
      await tx.commentEditHistory.deleteMany({
        where: { commentId: { in: commentIdArray } }
      });

      // 删除举报记录
      await tx.commentReport.deleteMany({
        where: { commentId: { in: commentIdArray } }
      });

      // 删除评论（包括回复）
      await tx.comment.deleteMany({
        where: { id: { in: commentIdArray } }
      });
    });

    return successResponse(res, { 
      deleted: commentIdArray.length,
      topLevel: comments.length
    }, `成功删除 ${commentIdArray.length} 条评论`);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有评论列表（管理员）
 * GET /api/comments/admin/list
 */
const getAllComments = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      diaryId,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 构建查询条件
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (diaryId) {
      where.diaryId = diaryId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (search) {
      where.content = { contains: search };
    }

    // 排序
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          diary: {
            select: {
              id: true,
              title: true
            }
          },
          parent: {
            select: {
              id: true,
              content: true
            }
          },
          _count: {
            select: { 
              likes: true, 
              replies: true,
              reports: true 
            }
          }
        }
      }),
      prisma.comment.count({ where })
    ]);

    // 格式化数据
    const formattedComments = comments.map(c => ({
      ...c,
      images: c.images ? JSON.parse(c.images) : [],
      likeCount: c._count.likes,
      replyCount: c._count.replies,
      reportCount: c._count.reports
    }));

    return paginatedResponse(res, formattedComments, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }, '获取评论列表成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户自己的评论列表
 * GET /api/comments/my
 */
const getMyComments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 构建查询条件
    const where = { userId };
    
    if (status) {
      where.status = status;
    }

    // 排序
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          diary: {
            select: {
              id: true,
              title: true
            }
          },
          _count: {
            select: { 
              likes: true, 
              replies: true
            }
          }
        }
      }),
      prisma.comment.count({ where })
    ]);

    // 格式化数据
    const formattedComments = comments.map(c => ({
      ...c,
      images: c.images ? JSON.parse(c.images) : [],
      likeCount: c._count.likes,
      replyCount: c._count.replies
    }));

    return paginatedResponse(res, formattedComments, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }, '获取我的评论成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取举报列表（管理员）
 * GET /api/comments/admin/reports
 */
const getReports = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'pending',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status !== 'all') {
      where.status = status;
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [reports, total] = await Promise.all([
      prisma.commentReport.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          Comment: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true
                }
              },
              diary: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      }),
      prisma.commentReport.count({ where })
    ]);

    return paginatedResponse(res, reports, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }, '获取举报列表成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 处理举报（管理员）
 * PATCH /api/comments/admin/reports/:reportId
 */
const handleReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { status, action } = req.body;
    const adminId = req.user.id;

    if (!['resolved', 'rejected'].includes(status)) {
      return validationError(res, '状态必须是 resolved 或 rejected');
    }

    const report = await prisma.commentReport.update({
      where: { id: reportId },
      data: {
        status,
        handledBy: adminId,
        handledAt: new Date()
      },
      include: {
        Comment: true
      }
    });

    // 如果采取行动删除评论
    if (action === 'delete' && report.Comment) {
      await prisma.comment.delete({
        where: { id: report.Comment.id }
      });
    }

    return successResponse(res, { report }, '举报已处理');
  } catch (error) {
    next(error);
  }
};

/**
 * 上传评论图片
 * POST /api/comments/upload
 */
const uploadCommentImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return validationError(res, '未上传文件');
    }

    // 构建图片URL
    const imageUrl = `/uploads/comments/${req.file.filename}`;

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return successResponse(res, {
      imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      sizeFormatted: formatFileSize(req.file.size),
      uploadDate: new Date().toISOString(),
    }, '图片上传成功');
  } catch (error) {
    // 清理上传的文件
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

module.exports = {
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
  commentImageUploadMiddleware: optionalImageUpload
};
