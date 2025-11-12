/**
 * Cart Controller Tests
 * [2025-01-27 12:15:00] Unit tests for cart API
 */
jest.mock('../../src/lib/prisma', () => ({
  cart: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  cartItem: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  productVariant: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../../src/lib/prisma');
const cartController = require('../../src/controllers/cartController');

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

const mockVariant = {
  id: 'variant_123',
  productId: 'product_123',
  color: 'Red',
  size: 'M',
  priceAdjustment: 5,
  product: {
    id: 'product_123',
    name: 'Test Product',
    basePrice: 29.99,
    images: [],
  },
};

const mockCart = {
  id: 'cart_123',
  userId: 'user_123',
  items: [
    {
      id: 'item_1',
      variantId: 'variant_123',
      quantity: 2,
      priceSnapshot: '34.99',
      variant: {
        productId: 'product_123',
        color: 'Red',
        size: 'M',
        imageUrl: null,
        product: {
          name: 'Test Product',
          images: [],
        },
      },
    },
  ],
};

describe('[2025-01-27 12:15:00] cartController.getCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty cart when no user or session', async () => {
    const req = {
      user: null,
      sessionId: null,
    };
    const res = createMockResponse();

    await cartController.getCart(req, res);

    expect(res.json).toHaveBeenCalledWith({
      items: [],
      subtotal: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      itemCount: 0,
    });
  });

  it('should return cart for authenticated user', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);

    const req = {
      user: {
        id: 'user_123',
      },
      sessionId: null,
    };
    const res = createMockResponse();

    await cartController.getCart(req, res);

    expect(prisma.cart.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
      include: expect.any(Object),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        subtotal: expect.any(Number),
        total: expect.any(Number),
        itemCount: expect.any(Number),
      })
    );
  });

  it('should create cart if not exists for user', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce(null);
    prisma.cart.create.mockResolvedValueOnce({ ...mockCart, items: [] });

    const req = {
      user: {
        id: 'user_123',
      },
      sessionId: null,
    };
    const res = createMockResponse();

    await cartController.getCart(req, res);

    expect(prisma.cart.create).toHaveBeenCalled();
  });
});

describe('[2025-01-27 12:15:00] cartController.addItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add new item to cart', async () => {
    prisma.productVariant.findUnique.mockResolvedValueOnce(mockVariant);
    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);
    prisma.cartItem.findFirst.mockResolvedValueOnce(null);
    prisma.cartItem.create.mockResolvedValueOnce({
      id: 'item_new',
      variantId: 'variant_123',
      quantity: 1,
    });

    const req = {
      body: {
        variantId: 'variant_123',
        quantity: 1,
      },
      user: {
        id: 'user_123',
      },
      sessionId: null,
    };
    const res = createMockResponse();

    await cartController.addItem(req, res);

    expect(prisma.productVariant.findUnique).toHaveBeenCalledWith({
      where: { id: 'variant_123' },
      include: { product: true },
    });
    expect(prisma.cartItem.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'item_new',
        variantId: 'variant_123',
        quantity: 1,
      })
    );
  });

  it('should update quantity if item already exists', async () => {
    const existingItem = {
      id: 'item_1',
      cartId: 'cart_123',
      variantId: 'variant_123',
      quantity: 2,
    };

    prisma.productVariant.findUnique.mockResolvedValueOnce(mockVariant);
    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);
    prisma.cartItem.findFirst.mockResolvedValueOnce(existingItem);
    prisma.cartItem.update.mockResolvedValueOnce({
      ...existingItem,
      quantity: 3,
    });

    const req = {
      body: {
        variantId: 'variant_123',
        quantity: 1,
      },
      user: {
        id: 'user_123',
      },
      sessionId: null,
    };
    const res = createMockResponse();

    await cartController.addItem(req, res);

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: {
        quantity: 3,
      },
    });
  });

  it('should return 400 if variantId is missing', async () => {
    const req = {
      body: {
        quantity: 1,
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.addItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'variantId is required',
    });
  });

  it('should return 400 if quantity is less than 1', async () => {
    const req = {
      body: {
        variantId: 'variant_123',
        quantity: 0,
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.addItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Quantity must be at least 1',
    });
  });

  it('should return 404 if variant not found', async () => {
    prisma.productVariant.findUnique.mockResolvedValueOnce(null);

    const req = {
      body: {
        variantId: 'nonexistent',
        quantity: 1,
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.addItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Product variant not found',
    });
  });
});

describe('[2025-01-27 12:15:00] cartController.updateItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update item quantity', async () => {
    const cartItem = {
      id: 'item_1',
      cartId: 'cart_123',
      quantity: 2,
    };

    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);
    prisma.cartItem.findFirst.mockResolvedValueOnce(cartItem);
    prisma.cartItem.update.mockResolvedValueOnce({
      ...cartItem,
      quantity: 5,
    });

    const req = {
      params: {
        id: 'item_1',
      },
      body: {
        quantity: 5,
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.updateItem(req, res);

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { quantity: 5 },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Item updated',
        item: expect.objectContaining({
          quantity: 5,
        }),
      })
    );
  });

  it('should return 400 if quantity is invalid', async () => {
    const req = {
      params: {
        id: 'item_1',
      },
      body: {
        quantity: 0,
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.updateItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Quantity must be at least 1',
    });
  });

  it('should return 404 if item not found', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);
    prisma.cartItem.findFirst.mockResolvedValueOnce(null);

    const req = {
      params: {
        id: 'nonexistent',
      },
      body: {
        quantity: 5,
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.updateItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cart item not found',
    });
  });
});

describe('[2025-01-27 12:15:00] cartController.removeItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should remove item from cart', async () => {
    const cartItem = {
      id: 'item_1',
      cartId: 'cart_123',
    };

    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);
    prisma.cartItem.findFirst.mockResolvedValueOnce(cartItem);
    prisma.cartItem.delete.mockResolvedValueOnce(cartItem);

    const req = {
      params: {
        id: 'item_1',
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.removeItem(req, res);

    expect(prisma.cartItem.delete).toHaveBeenCalledWith({
      where: { id: 'item_1' },
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Item removed from cart',
    });
  });

  it('should return 404 if item not found', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);
    prisma.cartItem.findFirst.mockResolvedValueOnce(null);

    const req = {
      params: {
        id: 'nonexistent',
      },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await cartController.removeItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cart item not found',
    });
  });
});

describe('[2025-01-27 12:15:00] cartController.clearCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear cart for authenticated user', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce(mockCart);
    prisma.cartItem.deleteMany.mockResolvedValueOnce({ count: 2 });

    const req = {
      user: {
        id: 'user_123',
      },
      sessionId: null,
    };
    const res = createMockResponse();

    await cartController.clearCart(req, res);

    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart_123' },
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cart cleared',
    });
  });

  it('should return success if no user or session', async () => {
    const req = {
      user: null,
      sessionId: null,
    };
    const res = createMockResponse();

    await cartController.clearCart(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Cart already empty',
    });
  });
});

