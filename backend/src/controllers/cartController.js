/**
 * Cart Controller
 * [2025-11-04 23:50:00]
 * [2025-01-27 13:40:00] Enhanced with inventory validation
 */
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { checkStockAvailability } = require('../services/inventoryService');
const { BadRequestError } = require('../utils/errors');

/**
 * Get or create cart for user/session
 * [2025-11-04 23:50:00]
 */
async function getOrCreateCart(userId, sessionId) {
  if (userId) {
    // Try to find user's cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
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
            },
          },
        },
      });
    }
    return cart;
  }

  throw new Error('Either userId or sessionId must be provided');
}

/**
 * GET /api/cart - Get current cart
 * [2025-11-04 23:50:00]
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    if (!userId && !sessionId) {
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

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Format items for response
    const items = cart.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productId: item.variant.productId,
      productName: item.variant.product.name,
      variantDescription: `${item.variant.color || ''}${item.variant.color && item.variant.size ? ' • ' : ''}${item.variant.size || ''}`.trim(),
      quantity: item.quantity,
      unitPrice: Number(item.priceSnapshot),
      subtotal: Number(item.priceSnapshot) * item.quantity,
      // [2025-01-28 23:50:00] 修复：ProductImage 模型使用 url 字段，不是 imageUrl
      thumbnail: item.variant.imageUrl || item.variant.product.images[0]?.url || null,
    }));

    res.json({
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: 0,
      discount: 0,
      total: Math.round(subtotal * 100) / 100,
      itemCount,
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

/**
 * POST /api/cart/items - Add item to cart
 * [2025-11-04 23:50:00]
 * [2025-01-27 17:30:00] Support adding design to cart (designId + variantId)
 */
exports.addItem = async (req, res) => {
  try {
    const { variantId, designId, quantity = 1 } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    if (!variantId) {
      return res.status(400).json({ error: 'variantId is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // [2025-01-28 23:35:00] Verify variant exists and get price
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

    // [2025-01-27 17:30:00] If designId is provided, verify design exists and belongs to user
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
    // [2025-01-27 13:40:00] Inventory validation
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

    // [2025-01-28 23:55:00] Calculate price in dollars for priceSnapshot
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

    // [2025-01-27 17:30:00] Check if item already exists in cart (considering designId)
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId: variantId,
        // Note: Prisma schema doesn't have designId field yet, so we check by variantId only
        // If designId is provided, we'll create a new item (or update if same design)
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
          quantity: quantity,
          priceSnapshot: price,
        },
      });

      // [2025-01-27 17:30:00] If designId is provided, we need to link it to the cart item
      // Since Prisma schema doesn't support designId in CartItem, we'll use a workaround:
      // Store design reference in a separate table or extend the schema later
      // For now, we'll return the designId in the response for frontend to handle
    }

    res.status(201).json({
      id: cartItem.id,
      variantId: cartItem.variantId,
      designId: designId || null,
      quantity: cartItem.quantity,
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

/**
 * PATCH /api/cart/items/:id - Update item quantity
 * [2025-11-04 23:50:00]
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
    // [2025-01-27 13:40:00] Inventory validation
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
 * [2025-11-04 23:50:00]
 */
exports.removeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    // Get cart
    const cart = await getOrCreateCart(userId, sessionId);

    // Find and delete cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: id,
        cartId: cart.id,
      },
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
};

/**
 * DELETE /api/cart - Clear cart
 * [2025-11-04 23:50:00]
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
