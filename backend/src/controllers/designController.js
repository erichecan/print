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

// [2025-11-11 15:26:30] 计算报价（初版基于产品底价 + 变体调整）
exports.requestQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1 } = req.body || {};

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
    const unitPrice = Math.max(basePrice + adjustment, 0);
    const total = unitPrice * quantity;

    return res.json({
      data: {
        unitPrice,
        quantity,
        total,
        currency: 'CAD'
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


