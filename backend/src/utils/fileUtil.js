const fs = require('fs').promises;
const path = require('path');

/**
 * 从富文本内容和图片字段中提取所有图片URL
 * @param {string} htmlContent - 富文本HTML内容
 * @param {string} imageField - 图片字段（JSON字符串或逗号分隔）
 * @returns {string[]} 图片URL数组
 */
const extractImageUrls = (htmlContent, imageField) => {
  const urls = new Set();
  
  // 1. 从富文本提取
  if (htmlContent) {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      urls.add(match[1]);
    }
  }
  
  // 2. 从images字段提取（支持JSON和逗号分隔两种格式）
  if (imageField) {
    try {
      const parsed = JSON.parse(imageField);
      if (Array.isArray(parsed)) {
        parsed.forEach(url => urls.add(url));
      }
    } catch {
      // 兼容旧格式（逗号分隔）
      imageField.split(',').forEach(url => {
        if (url.trim()) urls.add(url.trim());
      });
    }
  }
  
  return Array.from(urls);
};

/**
 * 批量删除文件
 * @param {string[]} fileUrls - 文件URL数组
 * @returns {Promise<{deletedFiles: string[], failedFiles: Array}>}
 */
const deleteFilesByUrl = async (fileUrls) => {
  const uploadDir = path.join(__dirname, '../../uploads');
  const deletedFiles = [];
  const failedFiles = [];
  
  for (const url of fileUrls) {
    try {
      // 转换URL为物理路径
      // URL格式可能是: /uploads/xxx.jpg 或 http://localhost:3001/uploads/xxx.jpg
      const relativePath = url.replace(/^.*:\/\/[^/]+/, '').replace(/^\//, '');
      const filePath = path.join(uploadDir, '..', relativePath);
      
      await fs.unlink(filePath);
      deletedFiles.push(filePath);
      console.log(`[文件清理] 成功删除: ${filePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`[文件清理] 删除失败: ${url}`, error.message);
        failedFiles.push({ url, error: error.message });
      } else {
        console.log(`[文件清理] 文件不存在，跳过: ${url}`);
      }
    }
  }
  
  return { deletedFiles, failedFiles };
};

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>}
 */
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  extractImageUrls,
  deleteFilesByUrl,
  fileExists
};