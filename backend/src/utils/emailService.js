const nodemailer = require('nodemailer');
const prisma = require('../config/database');

/**
 * 邮件服务模块
 * 提供邮件发送、模板渲染等功能
 */

/**
 * 获取系统邮件配置
 */
const getEmailConfig = async () => {
  try {
    const config = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['smtp', 'enableEmailVerify', 'fromEmail', 'fromName']
        }
      }
    });
    
    const configMap = {};
    config.forEach(item => {
      try {
        configMap[item.key] = JSON.parse(item.value);
      } catch {
        configMap[item.key] = item.value;
      }
    });
    
    return {
      smtp: configMap.smtp || null,
      enableEmailVerify: configMap.enableEmailVerify || false,
      fromEmail: configMap.fromEmail || 'noreply@mio-diary.local',
      fromName: configMap.fromName || 'Mio日记系统'
    };
  } catch (error) {
    console.error('[获取邮件配置错误]', error);
    return {
      smtp: null,
      enableEmailVerify: false,
      fromEmail: 'noreply@mio-diary.local',
      fromName: 'Mio日记系统'
    };
  }
};

/**
 * 创建邮件传输器
 */
const createTransporter = async () => {
  const { smtp } = await getEmailConfig();
  
  if (!smtp || !smtp.host) {
    throw new Error('SMTP配置未设置');
  }
  
      return nodemailer.createTransport({    host: smtp.host,
    port: smtp.port || 587,
    secure: smtp.secure || false,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    },
    tls: {
      rejectUnauthorized: false // 允许自签名证书
    }
  });
};

/**
 * 邮件模板
 */
const emailTemplates = {
  /**
   * 测试邮件模板
   */
  test: (data) => ({
    subject: 'Mio日记系统 - 测试邮件',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Mio日记系统</h2>
        <p>这是一封测试邮件。</p>
        <p>如果您收到这封邮件，说明您的SMTP配置正确！</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          发送时间: ${new Date().toLocaleString('zh-CN')}<br>
          系统: Mio日记系统 v2.0.0
        </p>
      </div>
    `,
    text: '这是一封测试邮件。如果您收到这封邮件，说明您的SMTP配置正确！'
  }),

  /**
   * 邮箱验证邮件模板
   */
  verification: (data) => ({
    subject: 'Mio日记系统 - 邮箱验证',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Mio日记系统</h2>
        <p>您好，${data.username || '用户'}！</p>
        <p>感谢您注册 Mio日记系统。请使用以下验证码完成邮箱验证：</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px;">${data.code}</span>
        </div>
        <p>验证码有效期为 30 分钟。</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          发送时间: ${new Date().toLocaleString('zh-CN')}<br>
          系统: Mio日记系统 v2.0.0
        </p>
      </div>
    `,
    text: `您好！您的邮箱验证码是：${data.code}，有效期30分钟。`
  }),

  /**
   * 密码重置邮件模板
   */
  passwordReset: (data) => ({
    subject: 'Mio日记系统 - 密码重置',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Mio日记系统</h2>
        <p>您好，${data.username || '用户'}！</p>
        <p>您申请了密码重置。请使用以下验证码：</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px;">${data.code}</span>
        </div>
        <p>验证码有效期为 30 分钟。</p>
        <p>如果这不是您的操作，请立即修改密码以确保账户安全。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          发送时间: ${new Date().toLocaleString('zh-CN')}<br>
          系统: Mio日记系统 v2.0.0
        </p>
      </div>
    `,
    text: `您好！您的密码重置验证码是：${data.code}，有效期30分钟。`
  }),

  /**
   * 日记审核通知模板
   */
  diaryReview: (data) => ({
    subject: `Mio日记系统 - 日记${data.status === 'approved' ? '已通过审核' : '审核未通过'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Mio日记系统</h2>
        <p>您好，${data.username || '用户'}！</p>
        ${data.status === 'approved' ? `
          <p>恭喜！您的日记《${data.diaryTitle}》已通过审核。</p>
          <p>现在其他用户可以看到您的日记了。</p>
        ` : `
          <p>您的日记《${data.diaryTitle}》审核未通过。</p>
          <p>原因：${data.reason || '内容不符合社区规范'}</p>
          <p>您可以修改后重新提交。</p>
        `}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          发送时间: ${new Date().toLocaleString('zh-CN')}<br>
          系统: Mio日记系统 v2.0.0
        </p>
      </div>
    `,
    text: data.status === 'approved' 
      ? `您的日记《${data.diaryTitle}》已通过审核。`
      : `您的日记《${data.diaryTitle}》审核未通过。原因：${data.reason || '内容不符合社区规范'}`
  }),

  /**
   * 账户状态变更通知模板
   */
  accountStatus: (data) => ({
    subject: 'Mio日记系统 - 账户状态变更通知',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Mio日记系统</h2>
        <p>您好，${data.username || '用户'}！</p>
        ${data.status === 'banned' ? `
          <p style="color: #dc2626;">您的账户已被封禁。</p>
          <p>原因：${data.reason || '违反社区规范'}</p>
          <p>如有疑问，请联系管理员。</p>
        ` : `
          <p style="color: #16a34a;">您的账户已解封。</p>
          <p>现在您可以正常使用所有功能了。</p>
        `}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          发送时间: ${new Date().toLocaleString('zh-CN')}<br>
          系统: Mio日记系统 v2.0.0
        </p>
      </div>
    `,
    text: data.status === 'banned'
      ? `您的账户已被封禁。原因：${data.reason || '违反社区规范'}`
      : '您的账户已解封。'
  })
};

/**
 * 发送邮件
 * @param {string} to - 收件人邮箱
 * @param {string} template - 邮件模板名称
 * @param {object} data - 模板数据
 * @param {object} options - 额外选项
 */
const sendEmail = async (to, template, data = {}, options = {}) => {
  try {
    // 检查邮件功能是否启用
    const config = await getEmailConfig();
    if (!config.smtp || !config.smtp.host) {
      throw new Error('SMTP未配置');
    }

    // 获取邮件模板
    const templateFn = emailTemplates[template];
    if (!templateFn) {
      throw new Error(`邮件模板 '${template}' 不存在`);
    }

    const emailContent = templateFn(data);
    
    // 创建传输器
    const transporter = await createTransporter();
    
    // 验证连接
    await transporter.verify();
    
    // 使用配置的发件人地址，优先使用smtp.from，其次使用fromEmail
    const fromAddress = config.smtp.from || config.fromEmail;
    const fromName = config.smtp.fromName || config.fromName || 'Mio日记系统';
    
    // 发送邮件
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject: options.subject || emailContent.subject,
      html: options.html || emailContent.html,
      text: options.text || emailContent.text,
      ...options
    });
    
    console.log(`[邮件发送成功] ${to}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error(`[邮件发送失败] ${to}:`, error.message);
    throw error;
  }
};

/**
 * 验证SMTP配置
 */
const verifySMTPConfig = async (smtpConfig) => {
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure || false,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    await transporter.verify();
    return { success: true, message: 'SMTP配置验证成功' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * 生成验证码
 */
const generateVerificationCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

module.exports = {
  sendEmail,
  verifySMTPConfig,
  generateVerificationCode,
  getEmailConfig,
  emailTemplates
};
