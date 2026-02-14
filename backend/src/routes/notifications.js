const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const prisma = new PrismaClient();

/**
 * 获取当前用户的通知列表
 * GET /api/notifications
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId: req.user.id,
    };

    // 如果只查询未读通知
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      }),
    ]);

    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
      unreadCount,
    });
  } catch (error) {
    console.error('[获取通知列表错误]', error);
    next(error);
  }
});

/**
 * 获取未读通知数量
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', auth, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ count });
  } catch (error) {
    console.error('[获取未读通知数量错误]', error);
    next(error);
  }
});

/**
 * 标记通知为已读
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查通知是否属于当前用户
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '通知不存在',
      });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ message: '通知已标记为已读' });
  } catch (error) {
    console.error('[标记通知已读错误]', error);
    next(error);
  }
});

/**
 * 标记所有通知为已读
 * PUT /api/notifications/read-all
 */
router.put('/read-all', auth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: '所有通知已标记为已读' });
  } catch (error) {
    console.error('[标记所有通知已读错误]', error);
    next(error);
  }
});

/**
 * 删除通知
 * DELETE /api/notifications/:id
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查通知是否属于当前用户
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '通知不存在',
      });
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ message: '通知已删除' });
  } catch (error) {
    console.error('[删除通知错误]', error);
    next(error);
  }
});

/**
 * 清空所有通知
 * DELETE /api/notifications/clear-all
 */
router.delete('/clear-all', auth, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user.id },
    });

    res.json({ message: '所有通知已清空' });
  } catch (error) {
    console.error('[清空通知错误]', error);
    next(error);
  }
});

module.exports = router;
