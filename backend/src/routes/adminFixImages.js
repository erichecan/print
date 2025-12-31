/**
* 临时管理员 API 端点：修复商品图片记录
 * 
 * ⚠️  这是一个临时端点，修复完成后应该删除或禁用
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// 前端服务 URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';

// 已知的商品图片文件列表（基于本地文件系统检查）
const PRODUCT_IMAGE_FILES = {
  '1021100': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '107200': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '108200': ['main.png', 'image-1.jpg'],
  '134000': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '135300': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '135500': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '175800': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '176100': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '225900': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '2435100': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg'],
  '364900': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
  '4600': ['main.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg'],
};

/**
 * 生成图片 URL
 */
function generateImageUrl(productSlug, filename) {
  return `${FRONTEND_URL}/assets/products/${productSlug}/${filename}`;
}

/**
 * 获取商品的图片文件列表
 */
function getImageFilesForProduct(productSlug) {
  return PRODUCT_IMAGE_FILES[productSlug] || ['main.png', 'image-1.jpg'];
}

/**
 * 主修复函数
 */
async function fixProductImages() {
  try {
    logger.info('🔍 开始检查和修复商品图片记录...');
    
    // 1. 获取所有激活的商品
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { slug: 'asc' },
    });
    
    logger.info(`📦 找到 ${products.length} 个激活商品`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const product of products) {
      const productResult = {
        slug: product.slug,
        name: product.name,
        status: 'skipped',
        message: '',
      };
      
      try {
        // 获取该商品的图片文件列表
        const imageFilenames = getImageFilesForProduct(product.slug);
        
        if (imageFilenames.length === 0) {
          productResult.message = '没有找到图片文件列表';
          results.push(productResult);
          skippedCount++;
          continue;
        }
        
        // 如果数据库中没有图片记录，需要创建
        if (product.images.length === 0) {
          logger.info(`  🔧 为商品 ${product.slug} 创建 ${imageFilenames.length} 张图片记录...`);
          
          // 创建图片记录
          const imageRecords = imageFilenames.map((filename, index) => ({
            productId: product.id,
            url: generateImageUrl(product.slug, filename),
            alt: index === 0 ? product.name : `${product.name} - Image ${index}`,
            sortOrder: index,
          }));
          
          await prisma.productImage.createMany({
            data: imageRecords,
          });
          
          productResult.status = 'fixed';
          productResult.message = `已创建 ${imageRecords.length} 张图片记录`;
          results.push(productResult);
          fixedCount++;
        } else {
          // 检查并更新 URL
          let needsUpdate = false;
          
          for (let i = 0; i < imageFilenames.length && i < product.images.length; i++) {
            const filename = imageFilenames[i];
            const expectedUrl = generateImageUrl(product.slug, filename);
            const existingImage = product.images[i];
            
            if (existingImage && existingImage.url !== expectedUrl) {
              needsUpdate = true;
              await prisma.productImage.update({
                where: { id: existingImage.id },
                data: { url: expectedUrl },
              });
            }
          }
          
          // 如果记录的图片数量不够，添加缺失的
          if (product.images.length < imageFilenames.length) {
            logger.info(`  🔧 为商品 ${product.slug} 添加缺失的图片记录...`);
            
            const existingCount = product.images.length;
            const missingFiles = imageFilenames.slice(existingCount);
            
            const missingRecords = missingFiles.map((filename, index) => ({
              productId: product.id,
              url: generateImageUrl(product.slug, filename),
              alt: `${product.name} - Image ${existingCount + index + 1}`,
              sortOrder: existingCount + index,
            }));
            
            await prisma.productImage.createMany({
              data: missingRecords,
            });
            
            productResult.status = 'fixed';
            productResult.message = `已添加 ${missingRecords.length} 张缺失的图片记录`;
            results.push(productResult);
            fixedCount++;
          } else if (needsUpdate) {
            productResult.status = 'updated';
            productResult.message = '已更新图片 URL';
            results.push(productResult);
            fixedCount++;
          } else {
            productResult.status = 'ok';
            productResult.message = '图片记录已是最新';
            results.push(productResult);
            skippedCount++;
          }
        }
      } catch (error) {
        logger.error(`  ❌ 处理商品 ${product.slug} 失败:`, error);
        productResult.status = 'error';
        productResult.message = error.message;
        results.push(productResult);
        errorCount++;
      }
    }
    
    return {
      success: true,
      summary: {
        total: products.length,
        fixed: fixedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      results,
    };
  } catch (error) {
    logger.error('❌ 修复过程失败:', error);
    throw error;
  }
}

/**
 * POST /api/admin/fix-images/fix-product-images
 * 修复商品图片记录
 */
router.post('/fix-product-images', async (req, res) => {
  try {
    logger.info('收到修复商品图片请求');
    
    const result = await fixProductImages();
    
    res.json({
      success: true,
      message: '图片修复完成',
      ...result,
    });
  } catch (error) {
    logger.error('修复商品图片失败:', error);
    res.status(500).json({
      success: false,
      error: '修复失败',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/fix-images/status
 * 检查修复状态（不执行修复）
 */
router.get('/status', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        images: {
          select: {
            url: true,
          },
        },
      },
    });
    
    const stats = {
      totalProducts: products.length,
      productsWithImages: products.filter(p => p.images.length > 0).length,
      productsWithoutImages: products.filter(p => p.images.length === 0).length,
      totalImages: products.reduce((sum, p) => sum + p.images.length, 0),
    };
    
    res.json({
      success: true,
      stats,
      products: products.map(p => ({
        slug: p.slug,
        name: p.name,
        imageCount: p.images.length,
        needsFix: p.images.length === 0,
      })),
    });
  } catch (error) {
    logger.error('检查修复状态失败:', error);
    res.status(500).json({
      success: false,
      error: '检查失败',
      message: error.message,
    });
  }
});

module.exports = router;
