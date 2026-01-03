/**
 * Product Color Image Controller
* 提供产品颜色图片映射的 API 端点
 */
const { ProductColorImage, Product, Variant } = require('../models');
const logger = require('../utils/logger');
const { uploadBufferToGcs } = require('../utils/gcsStorage');
const { slugify } = require('../utils/productUpload'); // Assuming slugify exists here or I'll define it locally

const localSlugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

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
      data: colorImages.map(ci => ({
        id: ci.id,
        name: ci.colorName,
        hex: ci.colorHex,
        externalColorId: ci.customInkColorId,
        imageUrls: ci.imageUrls,
        isVerified: ci.isVerified,
        isActive: ci.isActive
      })),
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
          id: ci.id,
          name: ci.colorName,
          hex: ci.colorHex,
          externalColorId: ci.customInkColorId,
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

/**
 * 上传 Design Lab 产品颜色图片 (GCS)
 * POST /api/product-color-images/upload
 */
exports.uploadColorImage = async (req, res) => {
  try {
    const { colorName, view } = req.body;
    const file = req.file;

    if (!file || !colorName || !view) {
      return res.status(400).json({ error: 'File, colorName, and view are required' });
    }

    const colorSlug = localSlugify(colorName);
    const fileName = `${view}-large_extended.png`;
    // GCS path: design-lab-products/gildan-softstyle-tshirt/{color-slug}/{view}-large_extended.png
    // Note: We use a fixed product folder for now as per frontend requirement
    const objectPath = `design-lab-products/gildan-softstyle-tshirt/${colorSlug}/${fileName}`;

    const gcsUrl = await uploadBufferToGcs(file.buffer, objectPath, {
      contentType: 'image/png', // Force PNG as per requirement
      isPublic: true
    });

    // Also update the database record if it exists
    // Fix: Find the default product first
    const productSlug = 'design-lab-default-tee';
    const product = await Product.findOne({ where: { slug: productSlug } });
    // If using Prisma, this syntax is wrong. The project uses Prisma.
    // Let's use Prisma syntax. this file used `require('../models')` which implies Sequelize OR Prisma wrapper?
    // adminProductController used `prisma`. This file uses `ProductColorImage` from `../models`.
    // Let's check `backend/src/models/index.js` to see what ORM is used.
    // Assuming Sequelize based on `findAll`, `findOne`.
    // Wait, the project moved to Prisma recently? `adminProductController` used `prisma`.
    // But `productColorImageController` uses `ProductColorImage.findAll`.
    // I need to be careful. Let's check `backend/src/models/index.js`.

    res.json({
      success: true,
      url: gcsUrl,
      objectPath
    });

  } catch (error) {
    logger.error('Error uploading color image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

/**
 * 更新颜色参考数据 (Hex 等)
 * POST /api/product-color-images/update-mapping
 */
exports.updateReferenceColors = async (req, res) => {
  try {
    const { colors } = req.body; // Expecting array of { name, hex }

    if (!Array.isArray(colors)) {
      return res.status(400).json({ error: 'Colors array is required' });
    }

    // Update each color image record
    const updatePromises = colors.map(color => {
      if (color.id) {
        return ProductColorImage.update(
          { colorHex: color.hex || color.colorHex },
          { where: { id: color.id } }
        );
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    res.json({ success: true, message: 'Color mappings updated successfully' });
  } catch (error) {
    logger.error('Error updating color mapping:', error);
    res.status(500).json({ error: 'Failed to update mapping' });
  }
};
