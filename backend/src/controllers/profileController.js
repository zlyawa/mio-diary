const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const getUserProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        backgroundUrl: true,
        diaryPublic: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '用户不存在',
      });
    }

    // 根据日记可见性设置决定是否获取日记列表
    let diaries = [];
    if (user.diaryPublic || currentUserId === user.id) {
      diaries = await prisma.diary.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          title: true,
          mood: true,
          createdAt: true,
          updatedAt: true,
          tags: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    const profileData = {
      ...user,
      email: currentUserId === user.id ? user.email : null,
      isOwnProfile: currentUserId === user.id,
      diaries,
    };

    res.json({ user: profileData });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bio, diaryPublic } = req.body;

    const sanitizedBio = bio ? sanitizeInput(bio) : null;
    if (sanitizedBio && sanitizedBio.length > 200) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '个人签名不能超过200字',
      });
    }

    const updateData = { bio: sanitizedBio };
    if (typeof diaryPublic === 'boolean') {
      updateData.diaryPublic = diaryPublic;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        bio: true,
        avatarUrl: true,
        backgroundUrl: true,
        diaryPublic: true,
        updatedAt: true,
      },
    });

    res.json({
      message: '更新成功',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'ValidationError',
      message: '请选择图片',
    });
  }

  const userId = req.user.id;

  // 验证文件大小不超过 500KB
  if (req.file.size > 500 * 1024) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({
      error: 'ValidationError',
      message: '头像文件大小不能超过 500KB',
    });
  }

  try {
    const avatarDir = path.join(__dirname, '../../uploads/avatars');
    await fs.mkdir(avatarDir, { recursive: true });

    const avatarFilename = `${userId}-${Date.now()}.webp`;
    const avatarPath = path.join(avatarDir, avatarFilename);
    const avatarUrl = `/uploads/avatars/${avatarFilename}`;

    // 前端已经完成了裁剪，这里只需要确保格式正确并保存
    await sharp(req.file.path)
      .webp({ quality: 90 })
      .toFile(avatarPath);

    await fs.unlink(req.file.path);

    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (oldUser.avatarUrl && oldUser.avatarUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', '..', oldUser.avatarUrl);
      try {
        await fs.unlink(oldPath);
      } catch (error) {
        console.error('删除旧头像失败:', error);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: avatarUrl,
        avatarData: null,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    res.json({
      message: '头像上传成功',
      user: updatedUser,
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

const uploadBackground = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'ValidationError',
      message: '请选择图片',
    });
  }

  const userId = req.user.id;

  // 验证文件大小不超过 5MB
  if (req.file.size > 5 * 1024 * 1024) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({
      error: 'ValidationError',
      message: '背景图文件大小不能超过 5MB',
    });
  }

  try {
    const backgroundDir = path.join(__dirname, '../../uploads/backgrounds');
    await fs.mkdir(backgroundDir, { recursive: true });

    const backgroundFilename = `${userId}-${Date.now()}.webp`;
    const backgroundPath = path.join(backgroundDir, backgroundFilename);
    const backgroundUrl = `/uploads/backgrounds/${backgroundFilename}`;

    await sharp(req.file.path)
      .resize(1920, 1080, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(backgroundPath);

    await fs.unlink(req.file.path);

    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { backgroundUrl: true },
    });

    if (oldUser.backgroundUrl && oldUser.backgroundUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', '..', oldUser.backgroundUrl);
      try {
        await fs.unlink(oldPath);
      } catch (error) {
        console.error('删除旧背景图失败:', error);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { backgroundUrl: backgroundUrl },
      select: {
        id: true,
        username: true,
        backgroundUrl: true,
      },
    });

    res.json({
      message: '背景图上传成功',
      user: updatedUser,
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

const deleteBackground = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { backgroundUrl: true },
    });

    if (oldUser.backgroundUrl && oldUser.backgroundUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', '..', oldUser.backgroundUrl);
      try {
        await fs.unlink(oldPath);
      } catch (error) {
        console.error('删除旧背景图失败:', error);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { backgroundUrl: null },
    });

    res.json({ message: '背景图已删除' });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        avatarUrl: true,
        backgroundUrl: true,
        avatarData: true,
        diaryPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '用户不存在',
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        error: 'AuthenticationError',
        message: '当前密码不正确',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    res.json({ message: '密码修改成功，请重新登录' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  uploadAvatar,
  uploadBackground,
  deleteBackground,
  getCurrentUser,
  changePassword,
};