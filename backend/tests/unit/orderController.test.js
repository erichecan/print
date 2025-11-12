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
  },
}));

const prisma = require('../../src/lib/prisma');
const orderController = require('../../src/controllers/orderController');

function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('[2025-11-12 02:10:00] orderController.getOrderByOrderNumber', () => {
  const baseOrder = {
    id: 'order_123',
    orderNumber: 'ORD-UNIT-001',
    email: 'guest@example.com',
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
    createdAt: new Date('2025-11-10T00:00:00Z'),
    updatedAt: new Date('2025-11-10T00:00:00Z'),
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns order details when email matches', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    const req = {
      params: { orderNumber: 'ORD-UNIT-001' },
      query: { email: 'guest@example.com' },
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

  it('returns 403 when email does not match', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    const req = {
      params: { orderNumber: 'ORD-UNIT-001' },
      query: { email: 'intruder@example.com' },
    };
    const res = createMockResponse();

    await orderController.getOrderByOrderNumber(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });
});
