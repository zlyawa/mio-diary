const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { sendEmail, verifySMTPConfig } = require('../utils/emailService');
const { sendReviewNotification, sendAccountStatusNotification, sendPasswordResetNotification } = require('../utils/notification');

// 获取仪表盘统计数据
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalDiaries,
      pendingReviews,
      bannedUsers,
      recentUsers,
      recentDiaries,
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),
      // 总日记数
      prisma.diary.count(),
      // 待审核日记数
      prisma.diary.count({ where: { status: 'pending' } }),
      // 封禁用户数
      prisma.user.count({ where: { isBanned: true } }),
      // 最近注册用户
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      }),
      // 最近日记
      prisma.diary.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
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
    ]);

    // 获取今日数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayUsers, todayDiaries] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.diary.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalDiaries,
        pendingReviews,
        bannedUsers,
        todayUsers,
        todayDiaries,
      },
      recentUsers,
      recentDiaries,
    });
  } catch (error) {
    console.error(`[管理员仪表盘错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取用户列表
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', isBanned = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isBanned !== '') {
      where.isBanned = isBanned === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          isBanned: true,
          needReview: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: { diaries: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(`[获取用户列表错误] 错误: ${error.message}`);
    next(error);
  }
};

// 封禁/解封用户
const toggleUserBan = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isBanned, reason } = req.body;
    const adminId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '用户不存在',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: '不能封禁管理员账户',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned },
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true,
      },
    });

    // 记录管理员日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: isBanned ? 'BAN_USER' : 'UNBAN_USER',
        details: JSON.stringify({
          targetUserId: userId,
          targetUsername: user.username,
          reason,
        }),
      },
    });

    // 发送账户状态变更通知（站内+邮件）
    await sendAccountStatusNotification(
      userId,
      user.email,
      isBanned ? 'ban' : 'unban',
      reason
    );

    res.json({
      message: isBanned ? '用户已封禁' : '用户已解封',
      user: updatedUser,
    });
  } catch (error) {
    console.error(`[封禁用户错误] 错误: ${error.message}`);
    next(error);
  }
};

// 重置用户密码
const resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { notifyByEmail = true } = req.body;
    const adminId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '用户不存在',
      });
    }

    // 生成随机密码
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // 清除用户的所有刷新令牌
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // 记录管理员日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'RESET_PASSWORD',
        details: JSON.stringify({
          targetUserId: userId,
          targetUsername: user.username,
          notifyByEmail,
        }),
      },
    });

    // 发送密码重置通知（站内+邮件）
    if (notifyByEmail) {
      await sendPasswordResetNotification(userId, user.email, newPassword);
    } else {
      // 仅发送站内通知
      const { notifyUser } = require('../utils/notification');
      await notifyUser(
        userId,
        'password_reset',
        '密码已重置',
        `管理员已重置您的密码。新密码为：${newPassword}。请尽快登录并修改密码。`
      );
    }

    res.json({
      message: '密码重置成功',
      newPassword,
      emailSent: notifyByEmail,
    });
  } catch (error) {
    console.error(`[重置密码错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取待审核日记列表
const getPendingDiaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where: { status: 'pending' },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      }),
      prisma.diary.count({ where: { status: 'pending' } }),
    ]);

    res.json({
      diaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(`[获取待审核日记错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取所有日记列表（管理员用）
const getAllDiaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      }),
      prisma.diary.count({ where }),
    ]);

    res.json({
      diaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(`[获取所有日记错误] 错误: ${error.message}`);
    next(error);
  }
};

// 审核日记
const reviewDiary = async (req, res, next) => {
  try {
    const { diaryId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '审核状态必须是 approved 或 rejected',
      });
    }

    // 查询日记和作者信息
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      include: { 
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        } 
      },
    });

    if (!diary) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '日记不存在',
      });
    }

    // 检查日记是否已审核
    if (diary.status !== 'pending') {
      return res.status(400).json({
        error: 'ValidationError',
        message: '该日记已经审核过了',
      });
    }

    // 更新日记状态
    const updatedDiary = await prisma.diary.update({
      where: { id: diaryId },
      data: { status },
    });

    // 注意：审核现在是全局开关，不再修改用户的 needReview 字段
    // 所有用户的日记都会根据全局开关决定是否需要审核

    // 创建审核记录
    await prisma.review.create({
      data: {
        userId: adminId,
        diaryId,
        status,
        reason,
      },
    });

    // 记录管理员日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: status === 'approved' ? 'APPROVE_DIARY' : 'REJECT_DIARY',
        details: JSON.stringify({
          diaryId,
          diaryTitle: diary.title,
          authorId: diary.userId,
          authorUsername: diary.user.username,
          reason,
        }),
      },
    });

    // 发送审核结果通知（站内+邮件）
    await sendReviewNotification(
      diary.userId,
      diary.user.email,
      diary,
      status,
      reason
    );

    res.json({
      message: status === 'approved' ? '日记已通过审核' : '日记已拒绝',
      diary: updatedDiary,
    });
  } catch (error) {
    console.error(`[审核日记错误] 错误: ${error.message}`);
    next(error);
  }
};

// 获取系统配置
const getSystemConfig = async (req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany();

    const configMap = {};
    configs.forEach((config) => {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    });

    // 返回默认配置
    res.json({
      config: {
        siteName: configMap.siteName ?? 'Mio日记',
        siteDescription: configMap.siteDescription ?? '',
        siteIcon: configMap.siteIcon ?? '',
        siteIco: configMap.siteIco ?? '',
        loginBg: configMap.loginBg ?? '',
        registerBg: configMap.registerBg ?? '',
        forgotPasswordBg: configMap.forgotPasswordBg ?? '',
        enableEmailVerify: configMap.enableEmailVerify ?? false,
        enableUserReview: configMap.enableUserReview ?? false,
        smtp: configMap.smtp ?? {
          host: '',
          port: 587,
          secure: false,
          user: '',
          pass: '',
          from: '',
        },
        ...configMap,
      },
    });
  } catch (error) {
    console.error(`[获取系统配置错误] 错误: ${error.message}`);
    next(error);
  }
};

// 更新系统配置
const updateSystemConfig = async (req, res, next) => {
  try {
    const { siteName, siteDescription, siteIcon, siteIco, loginBg, registerBg, forgotPasswordBg, enableEmailVerify, enableUserReview, smtp } = req.body;
    const adminId = req.user.id;

    const updates = [];

    if (siteName !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'siteName' },
          update: { value: siteName },
          create: { key: 'siteName', value: siteName },
        })
      );
    }

    if (siteDescription !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'siteDescription' },
          update: { value: siteDescription },
          create: { key: 'siteDescription', value: siteDescription },
        })
      );
    }

    if (siteIcon !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'siteIcon' },
          update: { value: siteIcon },
          create: { key: 'siteIcon', value: siteIcon },
        })
      );
    }

    if (siteIco !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'siteIco' },
          update: { value: siteIco },
          create: { key: 'siteIco', value: siteIco },
        })
      );
    }

    if (loginBg !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'loginBg' },
          update: { value: loginBg },
          create: { key: 'loginBg', value: loginBg },
        })
      );
    }

    if (registerBg !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'registerBg' },
          update: { value: registerBg },
          create: { key: 'registerBg', value: registerBg },
        })
      );
    }

    if (forgotPasswordBg !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'forgotPasswordBg' },
          update: { value: forgotPasswordBg },
          create: { key: 'forgotPasswordBg', value: forgotPasswordBg },
        })
      );
    }

    if (enableEmailVerify !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'enableEmailVerify' },
          update: { value: JSON.stringify(enableEmailVerify) },
          create: { key: 'enableEmailVerify', value: JSON.stringify(enableEmailVerify) },
        })
      );
    }

    if (enableUserReview !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'enableUserReview' },
          update: { value: JSON.stringify(enableUserReview) },
          create: { key: 'enableUserReview', value: JSON.stringify(enableUserReview) },
        })
      );
    }

    if (smtp !== undefined) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'smtp' },
          update: { value: JSON.stringify(smtp) },
          create: { key: 'smtp', value: JSON.stringify(smtp) },
        })
      );
    }

    await prisma.$transaction(updates);

    // 记录管理员日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_SYSTEM_CONFIG',
        details: JSON.stringify({
          siteName,
          siteDescription,
          siteIcon,
          enableEmailVerify,
          enableUserReview,
          smtp: smtp ? { ...smtp, pass: '***' } : undefined,
        }),
      },
    });

    res.json({
      message: '系统配置更新成功',
    });
  } catch (error) {
    console.error(`[更新系统配置错误] 错误: ${error.message}`);
    next(error);
  }
};

// 验证SMTP配置
const verifySMTP = async (req, res, next) => {
  try {
    const { smtp } = req.body;

    if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供完整的SMTP配置信息'
      });
    }

    const result = await verifySMTPConfig(smtp);

    if (result.success) {
      res.json({
        message: 'SMTP配置验证成功',
        success: true
      });
    } else {
      res.status(400).json({
        error: 'SMTPError',
        message: result.message,
        success: false
      });
    }
  } catch (error) {
    console.error(`[验证SMTP错误] 错误: ${error.message}`);
    res.status(500).json({
      error: 'ServerError',
      message: error.message
    });
  }
};

// 发送测试邮件
const sendTestEmail = async (req, res, next) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '请提供收件人邮箱地址'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '邮箱格式不正确'
      });
    }

    // 使用邮件服务发送测试邮件
    const result = await sendEmail(to, 'test', {});

    res.json({
      message: '测试邮件发送成功',
      data: {
        to,
        messageId: result.messageId,
        previewUrl: result.previewUrl
      }
    });
  } catch (error) {
    console.error(`[发送测试邮件错误] 错误: ${error.message}`);
    res.status(500).json({
      error: 'EmailError',
      message: error.message || '邮件发送失败'
    });
  }
};

// 获取管理员日志
const getAdminLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.adminLog.count(),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(`[获取管理员日志错误] 错误: ${error.message}`);
    next(error);
  }
};

// 删除日记（管理员权限）
const deleteDiary = async (req, res, next) => {
  try {
    const { diaryId } = req.params;
    const adminId = req.user.id;

    if (!diaryId || diaryId.trim().length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '日记ID不能为空',
      });
    }

    // 查找日记
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!diary) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '日记不存在',
      });
    }

    // 提取所有图片URL（从富文本内容和images字段）
    const { extractImageUrls, deleteFilesByUrl } = require('../utils/fileUtil');
    const imageUrls = extractImageUrls(diary.content, diary.images);

    // 删除数据库记录
    await prisma.diary.delete({
      where: { id: diaryId },
    });

    // 清理关联的图片文件
    if (imageUrls.length > 0) {
      const result = await deleteFilesByUrl(imageUrls);
      if (result.failedFiles.length > 0) {
        console.error('[管理员删除日记] 部分图片删除失败:', result.failedFiles);
      }
    }

    // 记录管理员日志
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_DIARY',
        details: JSON.stringify({
          diaryId,
          diaryTitle: diary.title,
          authorId: diary.userId,
          authorUsername: diary.user?.username,
        }),
      },
    });

    res.json({
      message: '日记删除成功',
      deletedImages: imageUrls.length,
    });
  } catch (error) {
    console.error(`[管理员删除日记错误] 错误: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  toggleUserBan,
  resetUserPassword,
  getPendingDiaries,
  getAllDiaries,
  reviewDiary,
  getSystemConfig,
  updateSystemConfig,
  verifySMTP,
  sendTestEmail,
  getAdminLogs,
  deleteDiary,
};