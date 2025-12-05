/**
 * Font Controller
 * [2025-01-30 19:00:00] 字体管理控制器
 */
const { Font } = require('../models');
const logger = require('../utils/logger');

/**
 * Get all fonts (public API)
 * GET /api/fonts
 */
exports.getFonts = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    
    const where = {};
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined) {
      where.is_active = isActive === 'true';
    } else {
      // 默认只返回启用的字体
      where.is_active = true;
    }

    const fonts = await Font.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['sort_order', 'ASC'],
        ['name', 'ASC']
      ],
      attributes: [
        'id',
        'name',
        'display_name',
        'preview_text',
        'category',
        'source',
        'google_font_family',
        'weights',
        'is_active',
        'sort_order'
      ]
    });

    // [2025-01-30 19:00:00] 按分类分组
    const groupedFonts = fonts.reduce((acc, font) => {
      const category = font.category || 'latin';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: font.id,
        name: font.name,
        displayName: font.display_name || font.name,
        previewText: font.preview_text,
        category: font.category,
        source: font.source,
        googleFontFamily: font.google_font_family,
        weights: font.weights || [],
        isActive: font.is_active,
        sortOrder: font.sort_order
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedFonts,
      categories: Object.keys(groupedFonts)
    });
  } catch (error) {
    logger.error('Error fetching fonts:', error);
    res.status(500).json({ error: 'Failed to fetch fonts' });
  }
};

/**
 * Get fonts by category (public API)
 * GET /api/fonts/category/:category
 */
exports.getFontsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const fonts = await Font.findAll({
      where: {
        category,
        is_active: true
      },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
      attributes: [
        'id',
        'name',
        'display_name',
        'preview_text',
        'category',
        'source',
        'google_font_family',
        'weights',
        'sort_order'
      ]
    });

    res.json({
      success: true,
      data: fonts.map(font => ({
        id: font.id,
        name: font.name,
        displayName: font.display_name || font.name,
        previewText: font.preview_text,
        category: font.category,
        source: font.source,
        googleFontFamily: font.google_font_family,
        weights: font.weights || [],
        sortOrder: font.sort_order
      }))
    });
  } catch (error) {
    logger.error('Error fetching fonts by category:', error);
    res.status(500).json({ error: 'Failed to fetch fonts' });
  }
};

/**
 * Get all fonts (admin API - includes inactive)
 * GET /api/admin/fonts
 */
exports.getAllFonts = async (req, res) => {
  try {
    const { page = 1, limit = 50, category, isActive, source } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined) {
      where.is_active = isActive === 'true';
    }
    if (source) {
      where.source = source;
    }

    const { count, rows: fonts } = await Font.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [
        ['category', 'ASC'],
        ['sort_order', 'ASC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: fonts.map(font => ({
        id: font.id,
        name: font.name,
        displayName: font.display_name || font.name,
        previewText: font.preview_text,
        category: font.category,
        source: font.source,
        googleFontFamily: font.google_font_family,
        weights: font.weights || [],
        isActive: font.is_active,
        sortOrder: font.sort_order,
        createdAt: font.created_at,
        updatedAt: font.updated_at,
        createdBy: font.created_by
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching fonts:', error);
    res.status(500).json({ error: 'Failed to fetch fonts', details: error.message });
  }
};

/**
 * Get single font (admin API)
 * GET /api/admin/fonts/:id
 */
exports.getFont = async (req, res) => {
  try {
    const { id } = req.params;
    
    const font = await Font.findByPk(id);

    if (!font) {
      return res.status(404).json({ error: 'Font not found' });
    }

    res.json({
      success: true,
      data: {
        id: font.id,
        name: font.name,
        displayName: font.display_name || font.name,
        previewText: font.preview_text,
        category: font.category,
        source: font.source,
        googleFontFamily: font.google_font_family,
        weights: font.weights || [],
        isActive: font.is_active,
        sortOrder: font.sort_order,
        createdAt: font.created_at,
        updatedAt: font.updated_at,
        createdBy: font.created_by
      }
    });
  } catch (error) {
    logger.error('Error fetching font:', error);
    res.status(500).json({ error: 'Failed to fetch font', details: error.message });
  }
};

/**
 * Create font (admin API)
 * POST /api/admin/fonts
 */
exports.createFont = async (req, res) => {
  try {
    const {
      name,
      displayName,
      previewText,
      category,
      source,
      googleFontFamily,
      weights,
      isActive,
      sortOrder
    } = req.body;

    if (!name || !category || !source) {
      return res.status(400).json({
        error: 'Name, category, and source are required'
      });
    }

    // 检查字体名称是否已存在
    const existingFont = await Font.findOne({ where: { name } });
    if (existingFont) {
      return res.status(400).json({
        error: 'Font with this name already exists'
      });
    }

    const font = await Font.create({
      name,
      display_name: displayName || name,
      preview_text: previewText || 'Aa',
      category,
      source,
      google_font_family: googleFontFamily || null,
      weights: weights ? (Array.isArray(weights) ? weights : JSON.parse(weights)) : null,
      is_active: isActive !== undefined ? isActive : true,
      sort_order: sortOrder || 0,
      created_by: req.user?.id || null
    });

    res.status(201).json({
      success: true,
      data: {
        id: font.id,
        name: font.name,
        displayName: font.display_name || font.name,
        previewText: font.preview_text,
        category: font.category,
        source: font.source,
        googleFontFamily: font.google_font_family,
        weights: font.weights || [],
        isActive: font.is_active,
        sortOrder: font.sort_order,
        createdAt: font.created_at,
        updatedAt: font.updated_at
      }
    });
  } catch (error) {
    logger.error('Error creating font:', error);
    res.status(500).json({ error: 'Failed to create font', details: error.message });
  }
};

/**
 * Update font (admin API)
 * PUT /api/admin/fonts/:id
 */
exports.updateFont = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,
      previewText,
      category,
      source,
      googleFontFamily,
      weights,
      isActive,
      sortOrder
    } = req.body;

    const font = await Font.findByPk(id);
    if (!font) {
      return res.status(404).json({ error: 'Font not found' });
    }

    // 如果更新名称，检查是否与其他字体冲突
    if (name && name !== font.name) {
      const existingFont = await Font.findOne({ where: { name } });
      if (existingFont) {
        return res.status(400).json({
          error: 'Font with this name already exists'
        });
      }
    }

    // 更新字段
    if (name !== undefined) font.name = name;
    if (displayName !== undefined) font.display_name = displayName;
    if (previewText !== undefined) font.preview_text = previewText;
    if (category !== undefined) font.category = category;
    if (source !== undefined) font.source = source;
    if (googleFontFamily !== undefined) font.google_font_family = googleFontFamily;
    if (weights !== undefined) font.weights = Array.isArray(weights) ? weights : JSON.parse(weights);
    if (isActive !== undefined) font.is_active = isActive;
    if (sortOrder !== undefined) font.sort_order = sortOrder;

    await font.save();

    res.json({
      success: true,
      data: {
        id: font.id,
        name: font.name,
        displayName: font.display_name || font.name,
        previewText: font.preview_text,
        category: font.category,
        source: font.source,
        googleFontFamily: font.google_font_family,
        weights: font.weights || [],
        isActive: font.is_active,
        sortOrder: font.sort_order,
        createdAt: font.created_at,
        updatedAt: font.updated_at
      }
    });
  } catch (error) {
    logger.error('Error updating font:', error);
    res.status(500).json({ error: 'Failed to update font', details: error.message });
  }
};

/**
 * Delete font (admin API)
 * DELETE /api/admin/fonts/:id
 */
exports.deleteFont = async (req, res) => {
  try {
    const { id } = req.params;
    
    const font = await Font.findByPk(id);
    if (!font) {
      return res.status(404).json({ error: 'Font not found' });
    }

    await font.destroy();

    res.json({
      success: true,
      message: 'Font deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting font:', error);
    res.status(500).json({ error: 'Failed to delete font', details: error.message });
  }
};

