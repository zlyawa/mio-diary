const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');
const prisma = new PrismaClient();

/**
 * 创建站内通知
 * @param {string} userId - 用户ID
 * @param {string} type - 通知类型
 * @param {string} title - 通知标题
 * @param {string} content - 通知内容
 */
const notifyUser = async (userId, type, title, content) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        isRead: false
      }
    });
    console.log(`[通知服务] 创建通知成功: 用户=${userId}, 类型=${type}`);
  } catch (error) {
    console.error('[通知服务] 创建通知失败:', error);
  }
};

/**
 * 发送邮件通知
 * @param {string} email - 收件人邮箱
 * @param {string} template - 邮件模板类型
 * @param {Object} data - 模板数据
 */
const sendEmailNotification = async (email, template, data) => {
  try {
    // 检查邮件服务是否已配置
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'smtp' }
    });
    
    if (!config || !config.value) {
      console.log('[通知服务] 邮件服务未配置，跳过邮件发送');
      return { success: false, reason: '邮件服务未配置' };
    }

    const result = await emailService.sendEmail(email, template, data);
    console.log(`[通知服务] 邮件发送成功: ${email}, 模板: ${template}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[通知服务] 邮件发送失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 发送审核结果通知（站内+邮件）
 * @param {string} userId - 用户ID
 * @param {string} email - 用户邮箱
 * @param {Object} diary - 日记对象
 * @param {string} status - 审核状态
 * @param {string} reason - 拒绝原因（可选）
 */
const sendReviewNotification = async (userId, email, diary, status, reason = null) => {
  const isApproved = status === 'approved';
  const title = isApproved 
    ? `您的日记《${diary.title}》已审核通过`
    : `您的日记《${diary.title}》审核未通过`;
  
  const content = isApproved
    ? '恭喜！您的日记已通过审核，现在对所有用户可见。'
    : `很遗憾，您的日记未通过审核。原因：${reason || '内容不符合规范'}`;

  // 发送站内通知
  await notifyUser(userId, 'review_result', title, content);

  // 发送邮件通知（如果配置了邮件服务）
      await sendEmailNotification(email, 'diaryReview', {
      diaryTitle: diary.title,
      status,
      reason,
      reviewTime: new Date().toLocaleString('zh-CN')
    });
  return { success: true };
};

/**
 * 发送账户状态变更通知
 * @param {string} userId - 用户ID
 * @param {string} email - 用户邮箱
 * @param {string} action - 操作类型（ban/unban）
 * @param {string} reason - 原因（可选）
 */
const sendAccountStatusNotification = async (userId, email, action, reason = null) => {
  const isBanned = action === 'ban';
  const title = isBanned 
    ? '您的账户已被封禁'
    : '您的账户已解封';
  
  const content = isBanned
    ? `您的账户已被封禁。原因：${reason || '违反社区规范'}。如有疑问，请联系管理员。`
    : '您的账户已解封，现在可以正常使用所有功能。';

  // 发送站内通知
  await notifyUser(userId, 'account_status', title, content);

  // 发送邮件通知
  await sendEmailNotification(email, 'accountStatus', {
    action,
    reason,
    time: new Date().toLocaleString('zh-CN')
  });

  return { success: true };
};

/**
 * 发送密码重置通知
 * @param {string} userId - 用户ID
 * @param {string} email - 用户邮箱
 * @param {string} newPassword - 新密码
 */
const sendPasswordResetNotification = async (userId, email, newPassword) => {
  const title = '您的密码已被重置';
  const content = `管理员已重置您的密码。新密码为：${newPassword}。请尽快登录并修改密码。`;

  // 发送站内通知
  await notifyUser(userId, 'password_reset', title, content);

  // 发送邮件通知
  await sendEmailNotification(email, 'passwordReset', {
    newPassword,
    resetTime: new Date().toLocaleString('zh-CN')
  });

  return { success: true };
};

module.exports = {
  notifyUser,
  sendEmailNotification,
  sendReviewNotification,
  sendAccountStatusNotification,
  sendPasswordResetNotification
};