/**
 * Cart Controller
 * [2025-11-04 23:50:00]
 */
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

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
      thumbnail: item.variant.imageUrl || item.variant.product.images[0]?.imageUrl || null,
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
 */
exports.addItem = async (req, res) => {
  try {
    const { variantId, quantity = 1 } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    if (!variantId) {
      return res.status(400).json({ error: 'variantId is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Verify variant exists and get price
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      return res.status(404).json({ error: 'Product variant not found' });
    }

    // Calculate price (basePrice + priceAdjustment)
    const price = Number(variant.product.basePrice) + Number(variant.priceAdjustment || 0);

    // Get or create cart
    const cart = await getOrCreateCart(userId, sessionId);

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId: variantId,
      },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variantId,
          quantity: quantity,
          priceSnapshot: price,
        },
      });
    }

    res.status(201).json({
      id: cartItem.id,
      variantId: cartItem.variantId,
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
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
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
