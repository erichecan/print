/**
 * Admin Content Controller
* CMS content management APIs including image upload
 */
const logger = require('../utils/logger');
const path = require('path');
const fsSync = require('fs');

// 确保 CMS 上传目录存在
const ensureCmsUploadRoot = () => {
  const uploadRoot = path.join(__dirname, '../../uploads/cms');
  if (!fsSync.existsSync(uploadRoot)) {
    fsSync.mkdirSync(uploadRoot, { recursive: true });
  }
  return uploadRoot;
};

// 构建存储键
const buildStorageKey = (filename) => {
  return `cms/${filename}`;
};

// 构建公共 URL
const buildPublicUrl = (storageKey, req) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  return `${baseUrl}/uploads/${storageKey}`;
};

/**
 * Upload image for CMS content
 * POST /api/admin/content/upload
 */
exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const uploadRoot = ensureCmsUploadRoot();
    
// 检查文件是否存在
    if (!fsSync.existsSync(file.path)) {
      logger.error('File does not exist at path:', file.path);
      return res.status(500).json({ error: 'Uploaded file not found' });
    }

    const storageKey = buildStorageKey(file.filename);
    const publicUrl = buildPublicUrl(storageKey, req);

    logger.info('CMS image uploaded:', {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: publicUrl,
    });

    res.json({
      success: true,
      data: {
        url: publicUrl,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      },
    });
  } catch (error) {
    logger.error('Error uploading CMS image:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

