/**
 * Design Controller
 * [2025-11-11 15:26:30] 提供 Design Lab 草稿、素材上传、报价与下单接口
 */
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { getUploadSignedUrl } = require('../config/aws');

// [2025-11-11 15:26:30] 校验设计归属权，支持用户或会话草稿
const fetchOwnedDesign = async (designId, { user, sessionId }) => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: {
      variant: {
        include: {
          product: true
        }
      }
    }
  });

  if (!design) {
    return { error: { status: 404, message: 'Design not found' } };
  }

  const isUserOwner = design.userId && user?.id === design.userId;
  const isSessionOwner = !design.userId && design.sessionId && design.sessionId === sessionId;

  if (!isUserOwner && !isSessionOwner) {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  return { design };
};

// [2025-11-11 15:26:30] 创建 Design Lab 草稿
exports.createDesignDraft = async (req, res) => {
  try {
    const { productVariantId, name, canvas, pricing } = req.body || {};
    const userId = req.user?.id || null;
    const sessionId = userId ? null : req.sessionId || uuidv4();

    if (!productVariantId) {
      return res.status(400).json({ error: 'productVariantId is required' });
    }

    // [2025-11-18 14:30:00] Updated for Variant model rename
    const variant = await prisma.variant.findUnique({
      where: { id: productVariantId },
      include: {
        product: {
          select: {
            name: true,
            basePrice: true,
            isCustomizable: true,
            isActive: true
          }
        }
      }
    });

    if (!variant || !variant.product?.isCustomizable || !variant.product?.isActive) {
      return res.status(400).json({ error: 'Variant is not available for customization' });
    }

    const initialCanvas = canvas || {
      size: { width: 500, height: 600 },
      objects: []
    };

    const draft = await prisma.$transaction(async (tx) => {
      const baseDesignData = {
        sessionId,
        variant: { connect: { id: productVariantId } },
        name: name || `${variant.product.name} Design`,
        status: 'DRAFT',
        currentVersion: 1,
        canvasSnapshot: initialCanvas,
        pricingSnapshot: pricing || null
      };

      const designData = userId
        ? {
            ...baseDesignData,
            sessionId: null,
            user: { connect: { id: userId } },
          }
        : baseDesignData;

      const createdDesign = await tx.design.create({
        data: designData
      });

      await tx.designVersion.create({
        data: {
          designId: createdDesign.id,
          version: 1,
          summary: 'Initial draft',
          canvasSnapshot: initialCanvas,
          pricingSnapshot: pricing || null,
          createdBy: userId || sessionId
        }
      });

      return createdDesign;
    });

    res.status(201).json({
      data: draft,
      meta: {
        sessionId
      }
    });
  } catch (error) {
    console.error('[2025-11-11 15:26:30] createDesignDraft error:', error);
    res.status(500).json({ error: 'Failed to create design draft' });
  }
};

// [2025-11-11 15:26:30] 获取单个 Design 草稿
exports.getDesignDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    return res.json({ data: result.design });
  } catch (error) {
    console.error('[2025-11-11 15:26:30] getDesignDraft error:', error);
    return res.status(500).json({ error: 'Failed to load design draft' });
  }
};

// [2025-11-11 15:26:30] 更新 Design 草稿并记录版本
exports.updateDesignDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { canvas, pricing, name, thumbnailUrl, summary } = req.body || {};

    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const nextVersion = result.design.currentVersion + 1;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedDesign = await tx.design.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(canvas ? { canvasSnapshot: canvas } : {}),
          ...(pricing ? { pricingSnapshot: pricing } : {}),
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          currentVersion: nextVersion
        }
      });

      await tx.designVersion.create({
        data: {
          designId: id,
          version: nextVersion,
          summary: summary || 'Auto save',
          canvasSnapshot: canvas || result.design.canvasSnapshot,
          pricingSnapshot: pricing || result.design.pricingSnapshot,
          createdBy: req.user?.id || req.sessionId
        }
      });

      return updatedDesign;
    });

    return res.json({ data: updated });
  } catch (error) {
    console.error('[2025-11-11 15:26:30] updateDesignDraft error:', error);
    return res.status(500).json({ error: 'Failed to update design draft' });
  }
};

// [2025-11-11 15:26:30] 生成素材上传签名 URL（需要登录）
exports.generateAssetUploadUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, fileSize, contentType } = req.body || {};

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required for asset upload' });
    }

    if (!fileName || !fileSize || !contentType) {
      return res.status(400).json({ error: 'fileName, fileSize, contentType are required' });
    }

    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const extension = fileName.split('.').pop();
    const key = `design-assets/${id}/${uuidv4()}.${extension || 'bin'}`;

    const signed = await getUploadSignedUrl({
      key,
      contentType
    });

    const asset = await prisma.designAsset.create({
      data: {
        designId: id,
        fileName,
        fileSize,
        contentType,
        storageKey: key,
        url: signed.fileUrl,
        uploadedBy: req.user.id
      }
    });

    return res.json({
      data: {
        asset,
        uploadUrl: signed.uploadUrl
      }
    });
  } catch (error) {
    console.error('[2025-11-11 15:26:30] generateAssetUploadUrl error:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

// [2025-11-11 15:26:30] 计算报价（扩展版：考虑使用的面、图层数、数量折扣）
exports.requestQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1, sidesUsed = [], layerCount = 0 } = req.body || {};

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than zero' });
    }

    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const variant = result.design.variant;
    const basePrice = Number(variant.product.basePrice || 0);
    const adjustment = Number(variant.priceAdjustment || 0);
    
    // [2025-01-28 07:00:00] 基础单价 = 产品底价 + 变体调整
    let unitPrice = Math.max(basePrice + adjustment, 0);
    
    // [2025-01-28 07:00:00] 计算使用的面数（front, back, sleeve）
    const sidesCount = Array.isArray(sidesUsed) ? sidesUsed.length : 0;
    
    // [2025-01-28 07:00:00] 多面印刷费用：每增加一个面，增加 $2 CAD（示例定价）
    // 第一个面（front）包含在基础价格中，back 和 sleeve 需要额外收费
    const additionalSides = Math.max(0, sidesCount - 1);
    const sidesFee = additionalSides * 2 * 100; // 转换为分，每个额外面 $2
    
    // [2025-01-28 07:00:00] 图层复杂度费用：超过 5 个图层后，每增加一个图层增加 $0.50 CAD
    const baseLayers = 5;
    const additionalLayers = Math.max(0, layerCount - baseLayers);
    const layersFee = additionalLayers * 0.5 * 100; // 转换为分，每个额外图层 $0.50
    
    // [2025-01-28 07:00:00] 数量折扣（示例定价规则）
    let quantityDiscount = 0;
    if (quantity >= 50) {
      quantityDiscount = 0.15; // 50+ 件：15% 折扣
    } else if (quantity >= 25) {
      quantityDiscount = 0.10; // 25-49 件：10% 折扣
    } else if (quantity >= 10) {
      quantityDiscount = 0.05; // 10-24 件：5% 折扣
    }
    
    // [2025-01-28 07:00:00] 计算单价（包含面和图层费用）
    unitPrice = unitPrice + sidesFee + layersFee;
    
    // [2025-01-28 07:00:00] 应用数量折扣
    const discountedUnitPrice = unitPrice * (1 - quantityDiscount);
    
    // [2025-01-28 07:00:00] 计算总价
    const subtotal = discountedUnitPrice * quantity;
    const discountAmount = (unitPrice - discountedUnitPrice) * quantity;
    
    return res.json({
      data: {
        unitPrice: Math.round(unitPrice) / 100, // 转换为元
        discountedUnitPrice: Math.round(discountedUnitPrice) / 100, // 转换为元
        quantity,
        subtotal: Math.round(subtotal) / 100, // 转换为元
        discount: Math.round(discountAmount) / 100, // 转换为元
        total: Math.round(subtotal) / 100, // 转换为元
        currency: 'CAD',
        breakdown: {
          basePrice: basePrice / 100,
          variantAdjustment: adjustment / 100,
          sidesCount,
          sidesFee: sidesFee / 100,
          layerCount,
          layersFee: layersFee / 100,
          quantityDiscount: quantityDiscount * 100, // 百分比
        }
      }
    });
  } catch (error) {
    console.error('[2025-11-11 15:26:30] requestQuote error:', error);
    return res.status(500).json({ error: 'Failed to calculate quote' });
  }
};

// [2025-11-11 15:26:30] 锁定设计并生成下单草稿
exports.submitDesignOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1, notes } = req.body || {};
    const userId = req.user?.id || null;

    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Login required to submit order' });
    }

    const lockedDesign = await prisma.design.update({
      where: { id },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
        lockedBy: userId
      }
    });

    return res.json({
      data: {
        design: lockedDesign,
        orderDraft: {
          designId: lockedDesign.id,
          quantity,
          notes: notes || null
        }
      }
    });
  } catch (error) {
    console.error('[2025-11-11 15:26:30] submitDesignOrder error:', error);
    return res.status(500).json({ error: 'Failed to submit design order' });
  }
};

// [新增] 处理直接文件上传（例如，用于签名）
exports.uploadSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // 构建文件的公开访问 URL
    // req.protocol: http 或 https
    // req.get('host'): localhost:3001
    // /uploads/: 在 app.js 中定义的静态路径
    // req.file.filename: multer 生成的文件名
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    // 实际应用中，你可能会将这个 URL 保存到数据库
    // await prisma.design.update(...);

    res.status(200).json({
      message: 'File uploaded successfully',
      filePath: fileUrl
    });

  } catch (error) {
    console.error('[新增] uploadSignature error:', error);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
};

// [2025-12-08] 分享设计（生成分享链接）
exports.shareDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const design = result.design;

    // 如果已有分享token，直接返回
    if (design.shareToken) {
      const shareUrl = `${req.protocol}://${req.get('host')}/design-lab/share/${design.shareToken}`;
      return res.json({
        success: true,
        data: {
          shareToken: design.shareToken,
          shareUrl: shareUrl,
        },
      });
    }

    // 生成新的分享token
    const shareToken = uuidv4().replace(/-/g, '').substring(0, 16);

    // 更新设计，添加分享token并设置为公开
    const updatedDesign = await prisma.design.update({
      where: { id: design.id },
      data: {
        shareToken: shareToken,
        isPublic: true,
      },
    });

    const shareUrl = `${req.protocol}://${req.get('host')}/design-lab/share/${shareToken}`;

    res.json({
      success: true,
      data: {
        shareToken: shareToken,
        shareUrl: shareUrl,
      },
    });
  } catch (error) {
    console.error('[2025-12-08] shareDesign error:', error);
    return res.status(500).json({ error: 'Failed to share design' });
  }
};

// [2025-12-08] 通过分享token获取设计（公开访问）
exports.getDesignByShareToken = async (req, res) => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      return res.status(400).json({ error: 'Share token is required' });
    }

    const design = await prisma.design.findUnique({
      where: { shareToken: shareToken },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!design || !design.isPublic) {
      return res.status(404).json({ error: 'Design not found or not shared' });
    }

    // 返回设计数据（只读，不包含敏感信息）
    res.json({
      success: true,
      data: {
        id: design.id,
        name: design.name,
        canvasSnapshot: design.canvasSnapshot,
        thumbnailUrl: design.thumbnailUrl,
        shareToken: design.shareToken,
        isPublic: design.isPublic,
        variant: {
          id: design.variant.id,
          product: {
            id: design.variant.product.id,
            name: design.variant.product.name,
          },
        },
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
      },
    });
  } catch (error) {
    console.error('[2025-12-08] getDesignByShareToken error:', error);
    return res.status(500).json({ error: 'Failed to get design by share token' });
  }
};
