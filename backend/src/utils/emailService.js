const nodemailer = require('nodemailer');
const crypto = require('crypto');
const prisma = require('../config/database');

/**
 * 邮件服务模块
 * 提供邮件发送、模板渲染等功能
 */

// 获取加密密钥（使用固定的开发密钥或从环境变量读取）
const getEncryptionKeys = () => {
  const key = process.env.CONFIG_ENCRYPTION_KEY || 'MioDiary2026SecretKey32Chars!!';
  const iv = process.env.CONFIG_ENCRYPTION_IV || 'MioDiaryIV16!!';
  
  return {
    key: Buffer.from(key.padEnd(32).slice(0, 32)),
    iv: Buffer.from(iv.padEnd(16).slice(0, 16))
  };
};

/**
 * 解密敏感数据
 */
const decryptSensitiveData = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!encryptedText.startsWith('enc:')) return encryptedText; // 明文直接返回
  
  try {
    const { key, iv } = getEncryptionKeys();
    const encrypted = encryptedText.slice(4);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[解密失败]', error.message);
    return null; // 解密失败返回 null
  }
};

/**
 * 获取系统邮件配置
 */
const getEmailConfig = async () => {
  try {
    const config = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['smtp', 'enableEmailVerify', 'fromEmail', 'fromName', 'emailTemplates']
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

    // 获取 SMTP 配置并解密密码
    let smtp = configMap.smtp || null;
    if (smtp && smtp.pass) {
      const decryptedPass = decryptSensitiveData(smtp.pass);
      if (decryptedPass !== null) {
        smtp = { ...smtp, pass: decryptedPass };
      }
    }
    
    return {
      smtp,
      enableEmailVerify: configMap.enableEmailVerify || false,
      fromEmail: configMap.fromEmail || 'noreply@mio-diary.local',
      fromName: configMap.fromName || 'Mio日记系统',
      emailTemplates: configMap.emailTemplates || {}
    };
  } catch (error) {
    console.error('[获取邮件配置错误]', error);
    return {
      smtp: null,
      enableEmailVerify: false,
      fromEmail: 'noreply@mio-diary.local',
      fromName: 'Mio日记系统',
      emailTemplates: {}
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
  
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: smtp.secure || false,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    },
    tls: {
      // 生产环境必须验证证书，开发环境可通过环境变量临时禁用
      rejectUnauthorized: process.env.NODE_ENV === 'production'
        ? true  // 生产环境必须验证
        : (process.env.EMAIL_REJECT_UNAUTHORIZED !== 'false') // 开发环境默认验证，除非明确禁用
    }
  });
};

/**
 * 替换模板变量
 * @param {string} template - 模板字符串
 * @param {object} data - 变量数据
 * @returns {string} - 替换后的字符串
 */
const replaceTemplateVariables = (template, data) => {
  if (!template) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
};

/**
 * 获取邮件模板（支持自定义模板）
 * @param {string} templateId - 模板ID
 * @param {object} data - 模板变量数据
 * @param {object} customTemplates - 自定义模板配置
 * @returns {object} - { subject, html, text }
 */
const getEmailTemplate = (templateId, data, customTemplates = {}) => {
  // 默认模板
  const defaultTemplates = {
    test: {
      subject: 'Mio日记系统 - 测试邮件',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Mio日记系统</h2>
          <p>这是一封测试邮件。</p>
          <p>如果您收到这封邮件，说明您的SMTP配置正确！</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            发送时间: ${new Date().toLocaleString('zh-CN')}<br>
            系统: Mio日记系统 v2.1.0
          </p>
        </div>
      `,
      text: '这是一封测试邮件。如果您收到这封邮件，说明您的SMTP配置正确！'
    },
    verification: {
      subject: 'Mio日记系统 - 邮箱验证',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Mio日记系统</h2>
          <p>您好，{{username}}！</p>
          <p>感谢您注册 Mio日记系统。请使用以下验证码完成邮箱验证：</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px;">{{code}}</span>
          </div>
          <p>验证码有效期为 30 分钟。</p>
          <p>如果这不是您的操作，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            发送时间: ${new Date().toLocaleString('zh-CN')}<br>
            系统: Mio日记系统 v2.1.0
          </p>
        </div>
      `,
      text: '您好！您的邮箱验证码是：{{code}}，有效期30分钟。'
    },
    passwordReset: {
      subject: 'Mio日记系统 - 密码重置',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Mio日记系统</h2>
          <p>您好，{{username}}！</p>
          <p>您申请了密码重置。请使用以下验证码：</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px;">{{code}}</span>
          </div>
          <p>验证码有效期为 30 分钟。</p>
          <p>如果这不是您的操作，请立即修改密码以确保账户安全。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            发送时间: ${new Date().toLocaleString('zh-CN')}<br>
            系统: Mio日记系统 v2.1.0
          </p>
        </div>
      `,
      text: '您好！您的密码重置验证码是：{{code}}，有效期30分钟。'
    },
    diaryReview: {
      subject: 'Mio日记系统 - 日记审核通知',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Mio日记系统</h2>
          <p>您好，{{username}}！</p>
          <p>您的日记《{{diaryTitle}}》审核已完成。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            发送时间: ${new Date().toLocaleString('zh-CN')}<br>
            系统: Mio日记系统 v2.1.0
          </p>
        </div>
      `,
      text: '您的日记《{{diaryTitle}}》审核已完成。'
    },
    accountStatus: {
      subject: 'Mio日记系统 - 账户状态变更通知',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Mio日记系统</h2>
          <p>您好，{{username}}！</p>
          <p>您的账户状态已变更。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            发送时间: ${new Date().toLocaleString('zh-CN')}<br>
            系统: Mio日记系统 v2.1.0
          </p>
        </div>
      `,
      text: '您的账户状态已变更。'
    }
  };

  // 获取自定义模板（如果有）
  const customTemplate = customTemplates[templateId] || {};
  
  // 合并模板：自定义模板优先
  const template = {
    subject: customTemplate.subject || defaultTemplates[templateId]?.subject || 'Mio日记系统通知',
    html: customTemplate.content || defaultTemplates[templateId]?.html || '',
    text: defaultTemplates[templateId]?.text || ''
  };

  // 替换变量
  return {
    subject: replaceTemplateVariables(template.subject, data),
    html: replaceTemplateVariables(template.html, data),
    text: replaceTemplateVariables(template.text, data)
  };
};

/**
 * 邮件模板（向后兼容的导出）
 */
const emailTemplates = {
  test: (data) => getEmailTemplate('test', data),
  verification: (data) => getEmailTemplate('verification', data),
  passwordReset: (data) => getEmailTemplate('passwordReset', data),
  diaryReview: (data) => getEmailTemplate('diaryReview', data),
  accountStatus: (data) => getEmailTemplate('accountStatus', data)
};

/**
 * 发送邮件
 * 支持两种调用方式：
 * 1. 模板方式：sendEmail(to, template, data, options)
 * 2. 直接方式：sendEmail({ to, subject, html, text })
 * @param {string|object} to - 收件人邮箱 或 邮件选项对象
 * @param {string} template - 邮件模板名称
 * @param {object} data - 模板数据
 * @param {object} options - 额外选项
 */
const sendEmail = async (to, template, data = {}, options = {}) => {
  try {
    // 支持对象参数方式调用：sendEmail({ to, subject, html })
    if (typeof to === 'object' && to !== null) {
      const emailOptions = to;
      to = emailOptions.to;
      template = null;
      data = {};
      options = {
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text
      };
    }

    // 检查邮件功能是否启用，并获取自定义模板配置
    const config = await getEmailConfig();
    if (!config.smtp || !config.smtp.host) {
      throw new Error('SMTP未配置');
    }

    // 获取邮件内容
    let emailContent;
    if (template) {
      // 使用模板
      emailContent = getEmailTemplate(template, data, config.emailTemplates);
    } else {
      // 直接使用 options 中的内容
      emailContent = {
        subject: options.subject || 'Mio日记系统通知',
        html: options.html || '',
        text: options.text || ''
      };
    }
    
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
    console.error(`[邮件发送失败] ${typeof to === 'string' ? to : to?.to}:`, error.message);
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
        // 生产环境必须验证证书，开发环境可通过环境变量临时禁用
        rejectUnauthorized: process.env.NODE_ENV === 'production'
          ? true
          : (process.env.EMAIL_REJECT_UNAUTHORIZED !== 'false')
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
  emailTemplates,
  getEmailTemplate,
  replaceTemplateVariables
};
