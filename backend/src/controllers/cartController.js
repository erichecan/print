/**
 * Cart Controller
* Enhanced with inventory validation
* 添加图片 URL 优化处理
 */
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { checkStockAvailability } = require('../services/inventoryService');
const { BadRequestError } = require('../utils/errors');
const { optimizeImageUrl } = require('../utils/imageHelper');

/**
 * Get or create cart for user/session
 * 修复时间：2026-01-06T22:45:00.000Z - 添加错误处理和防御性检查
 */
async function getOrCreateCart(userId, sessionId) {
  try {
  if (userId) {
    // Try to find user's cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
design: true, // Include design details
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: { sortOrder: 'asc' },
                      take: 1,
                    },
                  },
                },
              },
            },
design: true, // Include design details
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        orderBy: { sortOrder: 'asc' },
                        take: 1,
                      },
                    },
                  },
                },
              },
design: true, // Include design details
            },
          },
        },
      });
    }
    return cart;
  } else if (sessionId) {
    // Try to find session cart
    let cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: { sortOrder: 'asc' },
                      take: 1,
                    },
                  },
                },
              },
            },
design: true, // Include design details
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        orderBy: { sortOrder: 'asc' },
                        take: 1,
                      },
                    },
                  },
                },
              },
design: true, // Include design details
            },
          },
        },
      });
    }
    return cart;
  }

    throw new Error('Either userId or sessionId must be provided');
  } catch (error) {
    // 记录详细错误信息
    logger.error('Error in getOrCreateCart:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      userId: userId || null,
      sessionId: sessionId || null,
    });
    // 重新抛出错误，让调用者处理
    throw error;
  }
}

/**
 * GET /api/cart - Get current cart
 */
// GET /api/cart - Get current cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

// 添加日志用于调试购物车为空的问题
    logger.info('Getting cart', {
      userId: userId || null,
      sessionId: sessionId || null,
      hasUser: !!req.user,
      hasSessionCookie: !!req.cookies?.sessionId,
    });

    if (!userId && !sessionId) {
      logger.warn('No userId or sessionId, returning empty cart');
      return res.json({
        items: [],
        subtotal: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        itemCount: 0,
      });
    }

    const cart = await getOrCreateCart(userId, sessionId);

// 添加日志记录购物车状态
    logger.info('Cart retrieved', {
      cartId: cart.id,
      itemCount: cart.items?.length || 0,
      userId: userId || null,
      sessionId: sessionId || null,
    });

// 确保 sessionId cookie 被设置（即使已经有 cookie，也要确保响应中包含）
    // 这样可以确保浏览器在跨域情况下正确保存 cookie
    if (!userId && sessionId) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Format items for response
// 优化图片 URL，确保返回完整的绝对路径
    const items = cart.items
      .filter(item => {
        if (!item.variant) {
          logger.warn(`Cart item ${item.id} has no variant`, { cartId: cart.id });
          return false;
        }
        if (!item.variant.product) {
          logger.warn(`Cart item ${item.id} variant ${item.variant.id} has no product`, { cartId: cart.id });
          return false;
        }
        return true;
      })
      .map((item) => {
        // 获取图片 URL（优先使用设计缩略图，其次是 variant 的 imageUrl，最后是 product 的第一张图片）
        let thumbnailUrl = item.design?.thumbnailUrl || item.variant.imageUrl || item.variant.product.images?.[0]?.url || null;

// 使用 optimizeImageUrl 优化图片 URL，确保是完整的绝对路径
        if (thumbnailUrl) {
          try {
            thumbnailUrl = optimizeImageUrl(thumbnailUrl, { req }) || thumbnailUrl;
          } catch (error) {
            logger.warn('Failed to optimize image URL for cart item', {
              itemId: item.id,
              originalUrl: thumbnailUrl,
              error: error.message,
            });
          }
        }

        return {
          id: item.id,
          variantId: item.variantId,
          productId: item.variant.productId,
          productName: item.variant.product.name,
          variantDescription: `${item.variant.color || ''}${item.variant.color && item.variant.size ? ' • ' : ''}${item.variant.size || ''}`.trim(),
          quantity: item.quantity,
          unitPrice: Number(item.priceSnapshot),
          subtotal: Number(item.priceSnapshot) * item.quantity,
// 修复：ProductImage 模型使用 url 字段，不是 imageUrl
// 优化后的图片 URL
          thumbnail: thumbnailUrl,
          designId: item.designId,
          sizeBreakdown: item.sizeBreakdown,
          metadata: item.metadata,
        };
      });

    res.json({
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: 0,
      discount: 0,
      total: Math.round(subtotal * 100) / 100,
      itemCount,
    });
  } catch (error) {
    // 修复时间：2026-01-06T22:45:00.000Z - 增强错误处理，提供更详细的错误信息
    logger.error('Error fetching cart:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      userId: req.user?.id || null,
      sessionId: req.sessionId || null,
      hasUser: !!req.user,
      hasSessionCookie: !!req.cookies?.sessionId,
    });
    console.error('Error fetching cart:', error);
    
    // 根据错误类型返回不同的状态码和错误信息
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Cart conflict',
        details: 'A cart with this identifier already exists'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: 'Cart not found',
        details: 'The requested cart could not be found'
      });
    }
    
    // 数据库连接错误（2026-03-06：改为返回 200 + 空购物车，避免整页 503；前端会展示空购物车并可重试）
    if (error.code === 'P1001' || error.code === 'P1002' || error.message?.includes('connect')) {
      logger.error('Database connection error in getCart, returning empty cart');
      return res.status(200).json({
        items: [],
        subtotal: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        itemCount: 0,
      });
    }
    
    // 其他错误返回 500，但在开发环境提供详细信息
    res.status(500).json({ 
      error: 'Failed to fetch cart',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        code: error.code 
      })
    });
  }
};

/**
 * POST /api/cart/items - Add item to cart
* Support adding design to cart (designId + variantId)
 */
// POST /api/cart/items - Add item to cart
exports.addItem = async (req, res) => {
  try {
    const { variantId, designId, quantity = 1, sizeBreakdown, metadata } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

// 添加日志用于调试购物车为空的问题
    logger.info('Adding item to cart - request received', {
      variantId,
      quantity,
      userId: userId || null,
      sessionId: sessionId || null,
      hasUser: !!req.user,
      hasSessionCookie: !!req.cookies?.sessionId,
    });

    if (!variantId) {
      return res.status(400).json({ error: 'variantId is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

// Verify variant exists and get price
    // 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      return res.status(404).json({ error: 'Product variant not found' });
    }

// If designId is provided, verify design exists and belongs to user
    let design = null;
    if (designId) {
      design = await prisma.design.findUnique({
        where: { id: designId },
        include: {
          variant: true,
        },
      });

      if (!design) {
        return res.status(404).json({ error: 'Design not found' });
      }

      // Verify design belongs to user or is public
      if (design.userId && design.userId !== userId) {
        return res.status(403).json({ error: 'Access denied to this design' });
      }

      // Verify design variant matches the requested variant
      if (design.variantId !== variantId) {
        return res.status(400).json({ error: 'Design variant does not match requested variant' });
      }
    }

    // Check stock availability
// Inventory validation
    const totalQuantity = quantity; // Will check existing item quantity below
    const stockCheck = await checkStockAvailability(variantId, totalQuantity);

    if (!stockCheck.sufficient) {
      return res.status(400).json({
        error: 'Insufficient stock',
        message: `Only ${stockCheck.available} available, but ${stockCheck.requested} requested`,
        available: stockCheck.available,
        requested: stockCheck.requested,
        variant: {
          sku: stockCheck.variant.sku,
          productName: stockCheck.variant.productName,
        },
      });
    }

// Calculate price in dollars for priceSnapshot
    // 参考 productController.js: price = (basePrice + priceAdjustment) / 100
    // basePrice 是 cents (Int), priceAdjustment 是 Decimal(10,2) 但实际存储的值是 cents 的数值
    // priceSnapshot should be stored in dollars (Decimal) for cart items
    // 与 productController.js 保持一致的计算方式
    const basePriceInCents = Number(variant.product.basePrice) || 0;
    const priceAdjustmentInCents = Number(variant.priceAdjustment || 0); // priceAdjustment 存储的是 cents 的数值
    const priceInCents = basePriceInCents + priceAdjustmentInCents;
    const price = priceInCents / 100; // Convert to dollars for priceSnapshot (Decimal)

// Get or create cart
    const cart = await getOrCreateCart(userId, sessionId);

// 记录购物车ID用于调试
    logger.info('Cart retrieved for adding item', {
      cartId: cart.id,
      userId: userId || null,
      sessionId: sessionId || null,
      existingItemCount: cart.items?.length || 0,
    });

// Check if item already exists in cart (considering designId)
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId: variantId,
        designId: designId || null,
      },
    });

    let cartItem;
    if (existingItem && !designId) {
      // Check stock for updated quantity (only for non-design items)
      const newQuantity = existingItem.quantity + quantity;
      const updatedStockCheck = await checkStockAvailability(variantId, newQuantity);

      if (!updatedStockCheck.sufficient) {
        return res.status(400).json({
          error: 'Insufficient stock',
          message: `Cannot add ${quantity} more. Only ${updatedStockCheck.available} available total, but cart already has ${existingItem.quantity}`,
          available: updatedStockCheck.available,
          currentInCart: existingItem.quantity,
          requested: quantity,
          variant: {
            sku: updatedStockCheck.variant.sku,
            productName: updatedStockCheck.variant.productName,
          },
        });
      }

      // Update quantity
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
        },
      });
    } else {
      // Create new cart item (with or without design)
      // Note: Since Prisma schema doesn't have designId field, we'll store design info in a separate table
      // For now, we'll create the cart item and handle design separately if needed
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variantId,
          designId: designId || null,
          quantity: quantity,
          priceSnapshot: price,
          sizeBreakdown: sizeBreakdown || [],
          metadata: metadata || {},
        },
      });

// If designId is provided, we need to link it to the cart item
      // Since Prisma schema doesn't support designId in CartItem, we'll use a workaround:
      // Store design reference in a separate table or extend the schema later
      // For now, we'll return the designId in the response for frontend to handle
    }

// 记录添加成功的日志
    logger.info('Item added to cart successfully', {
      cartItemId: cartItem.id,
      variantId: cartItem.variantId,
      quantity: cartItem.quantity,
      cartId: cart.id,
      userId: userId || null,
      sessionId: sessionId || null,
    });

// 确保 sessionId cookie 被设置（即使已经有 cookie，也要确保响应中包含）
    // 这样可以确保浏览器在跨域情况下正确保存 cookie
    if (!userId && sessionId) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }

    res.status(201).json({
      id: cartItem.id,
      variantId: cartItem.variantId,
      designId: designId || null,
      quantity: cartItem.quantity,
    });
  } catch (error) {
// 增强错误日志记录
    logger.error('Error adding item to cart:', {
      error: error.message,
      stack: error.stack,
      variantId: req.body?.variantId,
      userId: userId || null,
      sessionId: sessionId || null,
    });
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

/**
 * PATCH /api/cart/items/:id - Update item quantity
 */
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Get cart
    const cart = await getOrCreateCart(userId, sessionId);

    // Find cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: id,
        cartId: cart.id,
      },
      include: {
        variant: true,
      },
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock availability for new quantity
// Inventory validation
    const stockCheck = await checkStockAvailability(cartItem.variantId, quantity);

    if (!stockCheck.sufficient) {
      return res.status(400).json({
        error: 'Insufficient stock',
        message: `Only ${stockCheck.available} available, but ${stockCheck.requested} requested`,
        available: stockCheck.available,
        requested: stockCheck.requested,
        variant: {
          sku: stockCheck.variant.sku,
          productName: stockCheck.variant.productName,
        },
      });
    }

    // Update quantity
    const updatedItem = await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });

    res.json({
      message: 'Item updated',
      item: {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
      },
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

/**
 * DELETE /api/cart/items/:id - Remove item from cart
 */
exports.removeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

// 添加详细日志，便于调试
    logger.info('Removing cart item', {
      itemId: id,
      userId: userId || null,
      sessionId: sessionId || null,
      hasUser: !!req.user,
      hasSessionCookie: !!req.cookies?.sessionId,
    });

// Fix: Find item first, then verify ownership
    // This handles cases where user might have multiple carts (guest + user) 
    // and the item belongs to one of them, ensuring successful deletion.
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: id },
      include: {
        cart: true
      }
    });

    if (!cartItem) {
      logger.warn('Cart item not found', {
        itemId: id,
        userId: userId || null,
        sessionId: sessionId || null,
      });
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check ownership
    const isOwnedByUser = userId && cartItem.cart.userId === userId;
    const isOwnedBySession = sessionId && cartItem.cart.sessionId === sessionId;

    if (!isOwnedByUser && !isOwnedBySession) {
      logger.warn('Unauthorized attempt to remove cart item', {
        itemId: id,
        itemCartId: cartItem.cartId,
        itemUserId: cartItem.cart.userId,
        itemSessionId: cartItem.cart.sessionId,
        requestUserId: userId,
        requestSessionId: sessionId
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    logger.info('Cart item removed successfully', {
      itemId: id,
      cartId: cartItem.cartId,
      ownership: isOwnedByUser ? 'user' : 'session'
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    logger.error('Error removing cart item:', {
      error: error.message,
      stack: error.stack,
      itemId: req.params?.id,
      userId: req.user?.id || null,
      sessionId: req.sessionId || null,
    });
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
};

/**
 * DELETE /api/cart - Clear cart
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    if (!userId && !sessionId) {
      return res.json({ message: 'Cart already empty' });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};
