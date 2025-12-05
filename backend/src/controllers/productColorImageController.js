/**
 * Product Color Image Controller
 * [2025-01-30 23:55:00] 提供产品颜色图片映射的 API 端点
 */
const { ProductColorImage } = require('../models');
const logger = require('../utils/logger');

/**
 * 获取产品颜色图片映射
 * GET /api/product-color-images
 * 查询参数：
 *   - productId: Custom Ink 产品 ID（可选）
 *   - colorName: 颜色名称（可选）
 *   - colorId: Custom Ink 颜色 ID（可选）
 */
exports.getProductColorImages = async (req, res) => {
  try {
    const { productId, colorName, colorId } = req.query;
    
    const where = { isActive: true };
    if (productId) {
      where.customInkProductId = productId;
    }
    if (colorName) {
      where.colorName = colorName;
    }
    if (colorId) {
      where.customInkColorId = colorId;
    }
    
    const colorImages = await ProductColorImage.findAll({
      where,
      order: [['colorName', 'ASC']]
    });
    
    res.json({
      success: true,
      data: colorImages,
      count: colorImages.length
    });
  } catch (error) {
    logger.error('Error fetching product color images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product color images'
    });
  }
};

/**
 * 根据颜色名称获取图片 URL
 * GET /api/product-color-images/by-color/:productId/:colorName
 */
exports.getImageUrlByColor = async (req, res) => {
  try {
    const { productId, colorName } = req.params;
    const { view = 'front' } = req.query;
    
    const colorImage = await ProductColorImage.findOne({
      where: {
        customInkProductId: productId,
        colorName: colorName,
        isActive: true
      }
    });
    
    if (!colorImage) {
      return res.status(404).json({
        success: false,
        error: 'Color image not found'
      });
    }
    
    const imageUrls = colorImage.imageUrls || {};
    const imageUrl = imageUrls[view] || imageUrls.front || null;
    
    if (!imageUrl) {
      return res.status(404).json({
        success: false,
        error: `Image URL not found for view: ${view}`
      });
    }
    
    res.json({
      success: true,
      data: {
        colorId: colorImage.customInkColorId,
        colorName: colorImage.colorName,
        colorHex: colorImage.colorHex,
        imageUrl: imageUrl,
        view: view,
        allViews: imageUrls
      }
    });
  } catch (error) {
    logger.error('Error fetching image URL by color:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch image URL'
    });
  }
};

/**
 * 批量创建或更新产品颜色图片映射
 * POST /api/product-color-images/bulk
 * 需要管理员权限
 */
exports.bulkCreateOrUpdate = async (req, res) => {
  try {
    const { productId, colorImages } = req.body;
    
    if (!productId || !Array.isArray(colorImages)) {
      return res.status(400).json({
        success: false,
        error: 'productId and colorImages array are required'
      });
    }
    
    const results = [];
    
    for (const colorData of colorImages) {
      const { colorId, colorName, colorHex, imageUrls, isVerified = false } = colorData;
      
      if (!colorId || !colorName || !imageUrls) {
        continue;
      }
      
      const [colorImage, created] = await ProductColorImage.findOrCreate({
        where: {
          customInkProductId: productId,
          customInkColorId: colorId
        },
        defaults: {
          customInkProductId: productId,
          customInkColorId: colorId,
          colorName: colorName,
          colorHex: colorHex || null,
          imageUrls: imageUrls,
          isVerified: isVerified,
          isActive: true
        }
      });
      
      if (!created) {
        // 更新现有记录
        await colorImage.update({
          colorName: colorName,
          colorHex: colorHex || colorImage.colorHex,
          imageUrls: imageUrls,
          isVerified: isVerified || colorImage.isVerified,
          isActive: true
        });
      }
      
      results.push({
        colorId: colorId,
        colorName: colorName,
        created: created,
        updated: !created
      });
    }
    
    res.json({
      success: true,
      data: {
        productId: productId,
        total: results.length,
        created: results.filter(r => r.created).length,
        updated: results.filter(r => r.updated).length,
        results: results
      }
    });
  } catch (error) {
    logger.error('Error bulk creating/updating product color images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create/update product color images'
    });
  }
};

/**
 * 获取颜色映射表（用于前端 COLOR_ID_MAP）
 * GET /api/product-color-images/mapping/:productId
 */
exports.getColorMapping = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const colorImages = await ProductColorImage.findAll({
      where: {
        customInkProductId: productId,
        isActive: true,
        isVerified: true
      },
      order: [['colorName', 'ASC']]
    });
    
    // 生成映射表：{ colorName: colorId }
    const mapping = {};
    for (const colorImage of colorImages) {
      mapping[colorImage.colorName] = colorImage.customInkColorId;
    }
    
    res.json({
      success: true,
      data: {
        productId: productId,
        mapping: mapping,
        colors: colorImages.map(ci => ({
          colorId: ci.customInkColorId,
          colorName: ci.colorName,
          colorHex: ci.colorHex,
          imageUrls: ci.imageUrls
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching color mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch color mapping'
    });
  }
};

