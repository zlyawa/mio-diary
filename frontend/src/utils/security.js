/**
 * 安全工具函数
 * 提供XSS防护、输入验证等安全功能
 */

import DOMPurify from 'dompurify';

/**
 * 配置DOMPurify选项
 */
const PURIFY_CONFIG = {
  // 允许的HTML标签
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'img',
    'div', 'span'
  ],
  // 允许的属性
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'class', 'id',
    'data-*'
  ],
  // 允许URL协议
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // 强制所有链接在新标签页打开
  FORCE_BODY: true,
  // 移除空元素
  REMOVE_EMPTY_ELEMENTS: false,
  // 保留文本内容
  KEEP_CONTENT: true
};

/**
 * 净化HTML内容（用于富文本编辑器内容）
 * @param {string} html - 原始HTML内容
 * @returns {string} - 净化后的HTML
 */
export const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: PURIFY_CONFIG.ALLOWED_TAGS,
    ALLOWED_ATTR: PURIFY_CONFIG.ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORCE_BODY: true,
    // 为链接添加安全属性
    HOOKS: {
      'afterSanitizeAttributes': (node) => {
        // 为所有链接添加安全属性
        if (node.tagName === 'A') {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer nofollow');
        }
        // 为图片添加loading="lazy"
        if (node.tagName === 'IMG') {
          node.setAttribute('loading', 'lazy');
        }
      }
    }
  });
};

/**
 * 净化SVG内容（用于验证码等）
 * @param {string} svg - 原始SVG内容
 * @returns {string} - 净化后的SVG
 */
export const sanitizeSVG = (svg) => {
  if (!svg || typeof svg !== 'string') return '';
  
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true },
    ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'g', 'defs', 'use'],
    ADD_ATTR: ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'viewBox', 'xmlns'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onstart', 'onactivate']
  });
};

/**
 * 净化纯文本（移除所有HTML标签）
 * @param {string} text - 原始文本
 * @returns {string} - 纯文本
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证用户名格式
 * @param {string} username - 用户名
 * @returns {boolean}
 */
export const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  // 2-20字符，允许字母、数字、下划线、中文
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;
  return usernameRegex.test(username);
};

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {object} - { valid: boolean, message: string, strength: number }
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '密码不能为空', strength: 0 };
  }
  
  const checks = {
    length: password.length >= 8 && password.length <= 100,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const strength = Object.values(checks).filter(Boolean).length;
  
  if (!checks.length) {
    return { valid: false, message: '密码长度需为8-100字符', strength };
  }
  if (!checks.hasLetter) {
    return { valid: false, message: '密码需包含至少一个字母', strength };
  }
  if (!checks.hasNumber) {
    return { valid: false, message: '密码需包含至少一个数字', strength };
  }
  if (!checks.hasSpecial) {
    return { valid: false, message: '密码需包含至少一个特殊字符', strength };
  }
  
  return { valid: true, message: '密码强度良好', strength };
};

/**
 * 转义HTML特殊字符
 * @param {string} text - 原始文本
 * @returns {string} - 转义后的文本
 */
export const escapeHTML = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
};

/**
 * 安全地解析JSON
 * @param {string} jsonString - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} - 解析结果或默认值
 */
export const safeJSONParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * 验证URL是否安全（防止跳转漏洞）
 * @param {string} url - URL地址
 * @returns {boolean}
 */
export const isSafeURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // 只允许相对路径或指定的安全协议
  const safePatterns = [
    /^\/[^\/]/,  // 相对路径 /path
    /^https?:\/\//i,  // http:// 或 https://
    /^mailto:/i,  // mailto:
    /^tel:/i  // tel:
  ];
  
  // 禁止javascript: data:等危险协议
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(url)) return false;
  
  return safePatterns.some(pattern => pattern.test(url));
};

/**
 * 生成安全的随机字符串
 * @param {number} length - 字符串长度
 * @returns {string}
 */
export const generateSecureRandomString = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export default {
  sanitizeHTML,
  sanitizeSVG,
  sanitizeText,
  isValidEmail,
  isValidUsername,
  validatePassword,
  escapeHTML,
  safeJSONParse,
  isSafeURL,
  generateSecureRandomString
};
