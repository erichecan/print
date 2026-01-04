/**
 * Design Controller
* 提供 Design Lab 草稿、素材上传、报价与下单接口
 */
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { getUploadSignedUrl } = require('../config/aws');

// 校验设计归属权，支持用户或会话草稿
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

// 创建 Design Lab 草稿
exports.createDesignDraft = async (req, res) => {
  try {
    let { productVariantId, name, canvas, pricing, thumbnailUrl } = req.body || {};
    const userId = req.user?.id || null;
    const sessionId = userId ? null : req.sessionId || uuidv4();

    // Fix: Backend fallback for 'default' variant ID
    // If frontend sends 'default' (e.g. failure to resolve), we find a valid one here.
    if (productVariantId === 'default') {
      try {
        const defaultVariant = await prisma.variant.findFirst({
          where: {
            product: {
              isActive: true,
              isCustomizable: true
            }
          },
          include: { product: true }
        });
        if (defaultVariant) {
          console.log(`[DesignController] Auto-resolved 'default' variant to: ${defaultVariant.id} (${defaultVariant.product.name})`);
          productVariantId = defaultVariant.id;
        } else {
          console.warn("[DesignController] Could not find any default customizable variant!");
        }
      } catch (err) {
        console.error("[DesignController] Error resolving default variant:", err);
      }
    }

    if (!productVariantId) {
      return res.status(400).json({ error: 'productVariantId is required' });
    }

    // Updated for Variant model rename
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
        pricingSnapshot: pricing || null,
        thumbnailUrl: thumbnailUrl || null
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
    console.error(' createDesignDraft error:', error);
    res.status(500).json({ error: 'Failed to create design draft' });
  }
};

// 获取单个 Design 草稿
exports.getDesignDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    return res.json({ data: result.design });
  } catch (error) {
    console.error(' getDesignDraft error:', error);
    return res.status(500).json({ error: 'Failed to load design draft' });
  }
};

// 更新 Design 草稿并记录版本
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
    console.error(' updateDesignDraft error:', error);
    return res.status(500).json({ error: 'Failed to update design draft' });
  }
};

// 删除 Design 草稿
exports.deleteDesign = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  console.log('[DesignController] Delete request received:', { id, userId });

  try {
    const result = await fetchOwnedDesign(id, req); // Use req to pass user and sessionId

    if (result.error) {
      console.warn('[DesignController] Design not found or not owned by user:', { id, userId, error: result.error.message });
      return res.status(result.error.status).json({ error: result.error.message });
    }

    console.log('[DesignController] Deleting design from database:', id);
    await prisma.design.delete({
      where: { id },
    });

    console.log('[DesignController] Deletion successful:', id);
    res.status(200).json({ success: true, message: 'Design deleted successfully' });
  } catch (error) {
    console.error('[DesignController] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete design' });
  }
};

// 生成素材上传签名 URL（需要登录）
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
    console.error(' generateAssetUploadUrl error:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

// 计算报价（扩展版：考虑使用的面、图层数、数量折扣）
exports.requestQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1, sidesUsed = [], layerCount = 0, sizeQuantities = [] } = req.body || {};

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than zero' });
    }

    const result = await fetchOwnedDesign(id, req);

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const variant = result.design.variant;
    // 基础价格（Base Price）来自产品定义
    const basePrice = Number(variant.product.basePrice || 0);

    // 计算使用的面数（front, back, sleeve）
    const sidesCount = Array.isArray(sidesUsed) ? sidesUsed.length : 0;
    const additionalSides = Math.max(0, sidesCount - 1);
    const sidesFee = additionalSides * 2 * 100; // 转换为分，每个额外面 $2

    // 图层复杂度费用
    const baseLayers = 5;
    const additionalLayers = Math.max(0, layerCount - baseLayers);
    const layersFee = additionalLayers * 0.5 * 100; // 转换为分，每个额外图层 $0.50

    // 数量折扣
    let quantityDiscount = 0;
    if (quantity >= 50) {
      quantityDiscount = 0.15;
    } else if (quantity >= 25) {
      quantityDiscount = 0.10;
    } else if (quantity >= 10) {
      quantityDiscount = 0.05;
    }

    // Fetch global size fees for synchronization
    let globalSizeFees = [];
    try {
      globalSizeFees = await prisma.offline_order_size_fees.findMany();
    } catch (e) {
      console.warn("Failed to fetch offline_order_size_fees, using defaults:", e.message);
    }
    const globalFeeMap = {};
    globalSizeFees.forEach(fee => {
      globalFeeMap[fee.size] = Math.round(Number(fee.additional_fee) * 100);
    });

    // 默认变体调整（如果未使用 sizeQuantities）
    const defaultAdjustment = Number(variant.priceAdjustment || 0);

    // 计算总价和详细 Breakdown
    let totalBasePrice = 0;
    let totalAdjustment = 0;
    let weightedUnitPrice = 0;

    if (sizeQuantities && sizeQuantities.length > 0) {
      // 1. 获取该产品的所有变体，建立 尺寸 -> 价格调整 映射
      const allVariants = await prisma.variant.findMany({
        where: { productId: variant.product.id },
        select: { size: true, priceAdjustment: true }
      });

      const sizeAdjustmentMap = {};
      allVariants.forEach(v => {
        // Synchronize with global size fee config
        const globalFee = v.size ? globalFeeMap[v.size] : undefined;
        // CRITICAL: Use global fee if exists, otherwise 0
        sizeAdjustmentMap[v.size] = globalFee !== undefined ? globalFee : 0;
      });

      // 2. 根据每种尺寸的数量计算总价
      let calculatedQuantity = 0;
      sizeQuantities.forEach(sq => {
        if (sq.quantity > 0) {
          const adj = sizeAdjustmentMap[sq.size] || 0;
          totalBasePrice += basePrice * sq.quantity;
          totalAdjustment += adj * sq.quantity;
          calculatedQuantity += sq.quantity;
        }
      });

      // 如果 sizeQuantities 总和不为 0，则使用计算出的总和
      // 但前端傳來的 quantity 是 override? 不，應該是 totalQuantity.
      // 這裡為了保险，我们 calculate unit price based on breakdown
      if (calculatedQuantity > 0) {
        weightedUnitPrice = (totalBasePrice + totalAdjustment) / calculatedQuantity;
      } else {
        weightedUnitPrice = basePrice + defaultAdjustment;
      }

    } else {
      // 老逻辑：使用当前 design 关联的变体价格
      // Synchronize with global size fee config
      const globalFee = variant.size ? globalFeeMap[variant.size] : undefined;
      const effectiveAdjustment = globalFee !== undefined ? globalFee : 0;

      weightedUnitPrice = basePrice + effectiveAdjustment;
      totalAdjustment = effectiveAdjustment * quantity;
    }

    // 单价包含基础费用（base + adjustment）加上 附加费用（sides + layers）
    let unitPrice = weightedUnitPrice + sidesFee + layersFee;

    // 应用数量折扣
    const discountedUnitPrice = unitPrice * (1 - quantityDiscount);

    // 计算总价
    const finalQuantity = (sizeQuantities && sizeQuantities.length > 0) ?
      sizeQuantities.reduce((sum, sq) => sum + (sq.quantity || 0), 0) :
      quantity;

    const subtotal = discountedUnitPrice * finalQuantity;
    const discountAmount = (unitPrice - discountedUnitPrice) * finalQuantity;

    return res.json({
      data: {
        unitPrice: Math.round(unitPrice) / 100, // 转换为元
        discountedUnitPrice: Math.round(discountedUnitPrice) / 100, // 转换为元
        quantity: finalQuantity,
        subtotal: Math.round(subtotal) / 100, // 转换为元
        discount: Math.round(discountAmount) / 100, // 转换为元
        total: Math.round(subtotal) / 100, // 转换为元
        currency: 'CAD',
        breakdown: {
          basePrice: basePrice / 100,
          // 如果有尺寸区分，这里的 variantAdjustment 是平均值或者总值？
          // 为了兼容前端显示，这里返回 平均调整值
          variantAdjustment: (totalAdjustment / quantity) / 100,
          sidesCount,
          sidesFee: sidesFee / 100,
          layerCount,
          layersFee: layersFee / 100,
          quantityDiscount: quantityDiscount * 100, // 百分比
        }
      }
    });
  } catch (error) {
    console.error(' requestQuote error:', error);
    return res.status(500).json({ error: 'Failed to calculate quote' });
  }
};

// 锁定设计并生成下单草稿
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
    console.error(' submitDesignOrder error:', error);
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

// 分享设计（生成分享链接）
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
    console.error(' shareDesign error:', error);
    return res.status(500).json({ error: 'Failed to share design' });
  }
};

// 通过分享token获取设计（公开访问）
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
    console.error(' getDesignByShareToken error:', error);
    return res.status(500).json({ error: 'Failed to get design by share token' });
  }
};
