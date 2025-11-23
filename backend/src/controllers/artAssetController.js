/**
 * Art Asset Controller
 * [2025-01-28 00:45:00] CRUD operations for Design Lab art assets
 */
const { ArtAsset } = require('../models');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs'); // [2025-01-28 02:20:00] 同步文件系统操作
const { optimizeImageUrl } = require('../utils/imageHelper');

// [2025-01-28 00:45:00] 确保素材上传目录存在
const ensureArtAssetUploadRoot = () => {
  const uploadRoot = path.join(__dirname, '../../uploads/art-assets');
  if (!require('fs').existsSync(uploadRoot)) {
    require('fs').mkdirSync(uploadRoot, { recursive: true });
  }
  return uploadRoot;
};

// [2025-01-28 00:45:00] 构建存储键
const buildStorageKey = (filename) => {
  return `art-assets/${filename}`;
};

// [2025-01-28 00:45:00] 构建公共 URL
const buildPublicUrl = (storageKey, req) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  return `${baseUrl}/uploads/${storageKey}`;
};

/**
 * Get all art assets (public API)
 * GET /api/art-assets
 */
exports.getArtAssets = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    
    const where = {};
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined) {
      where.is_active = isActive === 'true';
    } else {
      // 默认只返回启用的素材
      where.is_active = true;
    }

    const assets = await ArtAsset.findAll({
      where,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      attributes: ['id', 'category', 'name', 'image_url', 'thumbnail_url', 'width', 'height', 'sort_order']
    });

    // [2025-01-28 00:45:00] 按分类分组
    const groupedAssets = assets.reduce((acc, asset) => {
      const category = asset.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: asset.id,
        name: asset.name,
        imageUrl: optimizeImageUrl(asset.image_url, req) || asset.image_url,
        thumbnailUrl: asset.thumbnail_url ? (optimizeImageUrl(asset.thumbnail_url, req) || asset.thumbnail_url) : null,
        width: asset.width,
        height: asset.height
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedAssets,
      categories: Object.keys(groupedAssets)
    });
  } catch (error) {
    logger.error('Error fetching art assets:', error);
    res.status(500).json({ error: 'Failed to fetch art assets' });
  }
};

/**
 * Get art assets by category (public API)
 * GET /api/art-assets/category/:category
 */
exports.getArtAssetsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const assets = await ArtAsset.findAll({
      where: {
        category,
        is_active: true
      },
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      attributes: ['id', 'category', 'name', 'image_url', 'thumbnail_url', 'width', 'height']
    });

    res.json({
      success: true,
      data: assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        imageUrl: optimizeImageUrl(asset.image_url, req) || asset.image_url,
        thumbnailUrl: asset.thumbnail_url ? (optimizeImageUrl(asset.thumbnail_url, req) || asset.thumbnail_url) : null,
        width: asset.width,
        height: asset.height
      }))
    });
  } catch (error) {
    logger.error('Error fetching art assets by category:', error);
    res.status(500).json({ error: 'Failed to fetch art assets' });
  }
};

/**
 * Get all art assets (admin API - includes inactive)
 * GET /api/admin/art-assets
 */
exports.getAllArtAssets = async (req, res) => {
  try {
    logger.info('[getAllArtAssets] Request received', {
      query: req.query,
      user: req.user ? { id: req.user.id, email: req.user.email } : 'No user'
    });
    
    const { category, isActive, page = 1, limit = 50 } = req.query;
    
    const where = {};
    if (category) {
      where.category = category;
    }
    // [2025-01-27] 正确处理 isActive 参数（支持字符串和布尔值）
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      if (typeof isActive === 'string') {
        where.is_active = isActive === 'true' || isActive === '1';
      } else {
        where.is_active = Boolean(isActive);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    logger.info('[getAllArtAssets] Query params', { where, offset, limit: parseInt(limit) });
    
    // [2025-01-28 02:00:00] 暂时移除 include，避免关联查询错误
    const { count, rows: assets } = await ArtAsset.findAndCountAll({
      where,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      // include: [{
      //   model: require('../models').User,
      //   as: 'creator',
      //   attributes: ['id', 'email', 'first_name', 'last_name'],
      //   required: false
      // }]
    });
    
    logger.info('[getAllArtAssets] Query result', { count, assetsCount: assets.length });

    // [2025-01-28 02:30:00] 转换数据格式，将下划线命名转换为驼峰命名
    const formattedAssets = assets.map(asset => {
      const formatted = {
        id: asset.id,
        category: asset.category,
        name: asset.name,
        imageUrl: asset.image_url,
        thumbnailUrl: asset.thumbnail_url,
        width: asset.width,
        height: asset.height,
        fileSize: asset.file_size,
        mimeType: asset.mime_type,
        isActive: asset.is_active,
        sortOrder: asset.sort_order,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at,
        createdBy: asset.created_by
      };
      // [2025-01-28 02:30:00] 记录图片 URL 以便调试
      logger.debug('Formatted asset imageUrl:', formatted.imageUrl);
      return formatted;
    });

    res.json({
      success: true,
      data: formattedAssets,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching all art assets:', error);
    logger.error('Error details:', error.stack);
    res.status(500).json({ error: 'Failed to fetch art assets', details: error.message });
  }
};

/**
 * Get single art asset (admin API)
 * GET /api/admin/art-assets/:id
 */
exports.getArtAsset = async (req, res) => {
  try {
    const { id } = req.params;
    
    // [2025-01-28 02:00:00] 暂时移除 include，避免关联查询错误
    const asset = await ArtAsset.findByPk(id);

    if (!asset) {
      return res.status(404).json({ error: 'Art asset not found' });
    }

    // [2025-01-28 02:05:00] 转换数据格式，将下划线命名转换为驼峰命名
    const formattedAsset = {
      id: asset.id,
      category: asset.category,
      name: asset.name,
      imageUrl: asset.image_url,
      thumbnailUrl: asset.thumbnail_url,
      width: asset.width,
      height: asset.height,
      fileSize: asset.file_size,
      mimeType: asset.mime_type,
      isActive: asset.is_active,
      sortOrder: asset.sort_order,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
      createdBy: asset.created_by
    };

    res.json({
      success: true,
      data: formattedAsset
    });
  } catch (error) {
    logger.error('Error fetching art asset:', error);
    logger.error('Error details:', error.stack);
    res.status(500).json({ error: 'Failed to fetch art asset', details: error.message });
  }
};

/**
 * Create art asset (admin API)
 * POST /api/admin/art-assets
 */
exports.createArtAsset = async (req, res) => {
  try {
    // [2025-01-28 02:20:00] 添加详细日志
    logger.info('=== Creating Art Asset ===');
    logger.info('Request body:', req.body);
    logger.info('Request file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    logger.info('Request files:', req.files);
    logger.info('User:', req.user ? { id: req.user.id, email: req.user.email } : 'No user');

    const { category, name, sortOrder } = req.body;
    const file = req.file;

    // [2025-01-27] 改进错误处理，提供更详细的错误信息
    if (!file) {
      logger.warn('No file uploaded');
      logger.warn('Request body keys:', Object.keys(req.body));
      logger.warn('Request files:', req.files);
      return res.status(400).json({ 
        error: 'Image file is required',
        details: 'Please select an image file to upload'
      });
    }

    if (!category || !name) {
      logger.warn('Missing required fields:', { 
        category: category || 'missing', 
        name: name || 'missing',
        bodyKeys: Object.keys(req.body)
      });
      const missingFields = [];
      if (!category) missingFields.push('category');
      if (!name) missingFields.push('name');
      return res.status(400).json({ 
        error: 'Category and name are required',
        details: `Missing fields: ${missingFields.join(', ')}`
      });
    }

    const uploadRoot = ensureArtAssetUploadRoot();
    logger.info('Upload root:', uploadRoot);
    logger.info('File path:', file.path);
    
    // [2025-01-28 02:20:00] 检查文件是否存在
    if (!fsSync.existsSync(file.path)) {
      logger.error('File does not exist at path:', file.path);
      return res.status(500).json({ error: 'Uploaded file not found' });
    }

    const storageKey = buildStorageKey(file.filename);
    const publicUrl = buildPublicUrl(storageKey, req);
    logger.info('Storage key:', storageKey);
    logger.info('Public URL:', publicUrl);
    logger.info('Expected file path:', path.join(uploadRoot, file.filename));
    logger.info('File exists:', fsSync.existsSync(path.join(uploadRoot, file.filename)));

    // [2025-01-28 00:45:00] 获取图片尺寸（如果可能）
    let width = null;
    let height = null;
    try {
      const sharp = require('sharp');
      const metadata = await sharp(file.path).metadata();
      width = metadata.width;
      height = metadata.height;
      logger.info('Image dimensions:', { width, height });
    } catch (err) {
      logger.warn('Could not get image dimensions:', err.message);
    }

    logger.info('Creating asset in database...');
    const asset = await ArtAsset.create({
      category,
      name,
      image_url: publicUrl,
      file_size: file.size,
      width,
      height,
      mime_type: file.mimetype,
      sort_order: sortOrder ? parseInt(sortOrder) : 0,
      created_by: req.user?.id || null,
      is_active: true // [2025-01-28 02:20:00] 默认启用
    });
    logger.info('Asset created:', asset.id);

    // [2025-01-28 02:05:00] 转换数据格式
    const formattedAsset = {
      id: asset.id,
      category: asset.category,
      name: asset.name,
      imageUrl: asset.image_url,
      thumbnailUrl: asset.thumbnail_url,
      width: asset.width,
      height: asset.height,
      fileSize: asset.file_size,
      mimeType: asset.mime_type,
      isActive: asset.is_active,
      sortOrder: asset.sort_order,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
      createdBy: asset.created_by
    };

    logger.info('Art asset created successfully');
    res.status(201).json({
      success: true,
      data: formattedAsset
    });
  } catch (error) {
    logger.error('Error creating art asset:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to create art asset',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update art asset (admin API)
 * PUT /api/admin/art-assets/:id
 */
exports.updateArtAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, isActive, sortOrder } = req.body;
    const file = req.file;

    const asset = await ArtAsset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ error: 'Art asset not found' });
    }

    const updateData = {};
    if (category) updateData.category = category;
    if (name) updateData.name = name;
    // [2025-01-28 02:10:00] 处理 isActive，支持字符串和布尔值
    if (isActive !== undefined) {
      if (typeof isActive === 'string') {
        updateData.is_active = isActive === 'true';
      } else {
        updateData.is_active = Boolean(isActive);
      }
    }
    if (sortOrder !== undefined) updateData.sort_order = parseInt(sortOrder);

    // [2025-01-28 00:45:00] 如果上传了新文件，更新图片 URL
    if (file) {
      const uploadRoot = ensureArtAssetUploadRoot();
      const storageKey = buildStorageKey(file.filename);
      const publicUrl = buildPublicUrl(storageKey, req);

      // 删除旧文件
      try {
        const oldFilePath = path.join(uploadRoot, path.basename(asset.image_url));
        await fs.unlink(oldFilePath);
      } catch (err) {
        logger.warn('Could not delete old file:', err);
      }

      updateData.image_url = publicUrl;
      updateData.file_size = file.size;
      updateData.mime_type = file.mimetype;

      // 获取新图片尺寸
      try {
        const sharp = require('sharp');
        const metadata = await sharp(file.path).metadata();
        updateData.width = metadata.width;
        updateData.height = metadata.height;
      } catch (err) {
        logger.warn('Could not get image dimensions:', err);
      }
    }

    await asset.update(updateData);
    
    // [2025-01-28 02:05:00] 重新加载以获取最新数据
    await asset.reload();

    // [2025-01-28 02:05:00] 转换数据格式
    const formattedAsset = {
      id: asset.id,
      category: asset.category,
      name: asset.name,
      imageUrl: asset.image_url,
      thumbnailUrl: asset.thumbnail_url,
      width: asset.width,
      height: asset.height,
      fileSize: asset.file_size,
      mimeType: asset.mime_type,
      isActive: asset.is_active,
      sortOrder: asset.sort_order,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
      createdBy: asset.created_by
    };

    res.json({
      success: true,
      data: formattedAsset
    });
  } catch (error) {
    logger.error('Error updating art asset:', error);
    res.status(500).json({ error: 'Failed to update art asset' });
  }
};

/**
 * Delete art asset (admin API)
 * DELETE /api/admin/art-assets/:id
 */
exports.deleteArtAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await ArtAsset.findByPk(id);
    if (!asset) {
      return res.status(404).json({ error: 'Art asset not found' });
    }

    // 删除文件
    try {
      const uploadRoot = ensureArtAssetUploadRoot();
      const fileName = path.basename(asset.image_url);
      const filePath = path.join(uploadRoot, fileName);
      await fs.unlink(filePath);
    } catch (err) {
      logger.warn('Could not delete file:', err);
    }

    await asset.destroy();

    res.json({
      success: true,
      message: 'Art asset deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting art asset:', error);
    res.status(500).json({ error: 'Failed to delete art asset' });
  }
};

