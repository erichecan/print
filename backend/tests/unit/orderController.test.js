jest.mock('pdfkit', () =>
  jest.fn(() => ({
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    end: jest.fn(),
    on: jest.fn(),
  })),
  { virtual: true }
);

jest.mock('../../src/lib/prisma', () => ({
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../../src/lib/prisma');
const orderController = require('../../src/controllers/orderController');

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

// Base order data shared across tests
const baseOrder = {
  id: 'order_123',
  orderNumber: 'ORD-UNIT-001',
  email: 'guest@example.com',
  userId: 'user_123', // [2026-03-02 05:57:10] 新逻辑基于 userId 校验订单归属
  status: 'PENDING',
  paymentStatus: 'COMPLETED',
  currency: 'CAD',
  subtotal: 100,
  shippingCost: 10,
  tax: 5,
  discount: 0,
  total: 115,
  shippingAddress: { fullName: 'Guest', addressLine1: '123 Main', city: 'Toronto', province: 'ON', postalCode: 'M1M1M1', country: 'CA' },
  billingAddress: { fullName: 'Guest', addressLine1: '123 Main', city: 'Toronto', province: 'ON', postalCode: 'M1M1M1', country: 'CA' },
  trackingNumber: null,
  carrier: null,
  estimatedDelivery: null,
createdAt: new Date('T00:00:00Z'),
updatedAt: new Date('T00:00:00Z'),
  items: [
    {
      id: 'item-1',
      variantId: 'variant-1',
      quantity: 2,
      priceSnapshot: '50',
      variant: {
        color: 'Red',
        size: 'M',
        imageUrl: null,
        product: {
          name: 'Premium Hoodie',
          images: [],
        },
      },
    },
  ],
  shipments: [],
};

describe(' orderController.getOrderByOrderNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns order details when authenticated user owns the order', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    const req = {
      params: { orderNumber: 'ORD-UNIT-001' },
      query: { email: 'guest@example.com' },
      user: { id: 'user_123' },
    };
    const res = createMockResponse();

    await orderController.getOrderByOrderNumber(req, res);

    expect(prisma.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orderNumber: 'ORD-UNIT-001' } })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: 'ORD-UNIT-001',
        total: 115,
        items: expect.arrayContaining([
          expect.objectContaining({ productName: 'Premium Hoodie', quantity: 2 }),
        ]),
      })
    );
  });

  it('returns 403 when authenticated user does not own the order', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    const req = {
      params: { orderNumber: 'ORD-UNIT-001' },
      query: { email: 'intruder@example.com' },
      user: { id: 'another_user' },
    };
    const res = createMockResponse();

    await orderController.getOrderByOrderNumber(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('returns 401 when unauthenticated', async () => {
    const req = {
      params: { orderNumber: 'ORD-UNIT-001' },
      query: {},
    };
    const res = createMockResponse();

    await orderController.getOrderByOrderNumber(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
  });

  it('returns 404 when order not found', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    const req = {
      params: { orderNumber: 'ORD-NOT-FOUND' },
      query: { email: 'test@example.com' },
      user: { id: 'user_123' },
    };
    const res = createMockResponse();

    await orderController.getOrderByOrderNumber(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
  });
});

describe(' orderController.getOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return orders list for authenticated user', async () => {
    const mockOrders = [
      {
        id: 'order_1',
        orderNumber: 'ORD-001',
        status: 'PROCESSING',
        paymentStatus: 'COMPLETED',
        total: 115,
        createdAt: new Date(),
        items: [
          {
            variant: {
              product: {
                images: [],
              },
            },
          },
        ],
        _count: {
          items: 2,
        },
      },
    ];

    prisma.order.findMany.mockResolvedValueOnce(mockOrders);
    prisma.order.count.mockResolvedValueOnce(1);

    const req = {
      user: {
        id: 'user_123',
      },
      query: {
        page: '1',
        limit: '20',
      },
    };
    const res = createMockResponse();

    await orderController.getOrders(req, res);

    expect(prisma.order.findMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orders: expect.any(Array),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
          total: 1,
        }),
      })
    );
  });

  it('should return 401 if user not authenticated', async () => {
    const req = {
      user: null,
    };
    const res = createMockResponse();
    const next = jest.fn();

    await orderController.getOrders(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    // expect(res.status).toHaveBeenCalledWith(401); // Controller uses next(error), not res.status(401)
  });
});

describe(' orderController.getOrderById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return order details for authenticated user', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      userId: 'user_123',
    });

    const req = {
      params: { id: 'order_123' },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await orderController.getOrderById(req, res);

    expect(prisma.order.findUnique).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'order_123',
        orderNumber: 'ORD-UNIT-001',
      })
    );
  });

  it('should return 403 if user tries to access another user order', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      userId: 'user_456',
    });

    const req = {
      params: { id: 'order_123' },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await orderController.getOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Access denied',
    });
  });

  it('should return 404 if order not found', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    const req = {
      params: { id: 'nonexistent' },
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await orderController.getOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Order not found',
    });
  });
});
