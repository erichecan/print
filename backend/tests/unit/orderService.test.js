/**
 * Order Service Tests
* Tests for order state machine and business logic
 */
jest.mock('../../src/lib/prisma', () => ({
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  variant: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../../src/lib/prisma');
const orderService = require('../../src/services/orderService');

describe(' orderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(orderService.isValidStatusTransition('PENDING', 'PROCESSING')).toBe(true);
      expect(orderService.isValidStatusTransition('PENDING', 'CANCELLED')).toBe(true);
      expect(orderService.isValidStatusTransition('PROCESSING', 'SHIPPED')).toBe(true);
      expect(orderService.isValidStatusTransition('PROCESSING', 'CANCELLED')).toBe(true);
      expect(orderService.isValidStatusTransition('SHIPPED', 'DELIVERED')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(orderService.isValidStatusTransition('PENDING', 'SHIPPED')).toBe(false);
      expect(orderService.isValidStatusTransition('DELIVERED', 'PROCESSING')).toBe(false);
      expect(orderService.isValidStatusTransition('CANCELLED', 'PROCESSING')).toBe(false);
      expect(orderService.isValidStatusTransition('REFUNDED', 'SHIPPED')).toBe(false);
    });

    it('should allow same status (no-op)', () => {
      expect(orderService.isValidStatusTransition('PENDING', 'PENDING')).toBe(true);
      expect(orderService.isValidStatusTransition('PROCESSING', 'PROCESSING')).toBe(true);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for PENDING', () => {
      const allowed = orderService.getAllowedTransitions('PENDING');
      expect(allowed).toEqual(['PROCESSING', 'CANCELLED']);
    });

    it('should return allowed transitions for PROCESSING', () => {
      const allowed = orderService.getAllowedTransitions('PROCESSING');
      expect(allowed).toEqual(['SHIPPED', 'CANCELLED']);
    });

    it('should return empty array for terminal states', () => {
      expect(orderService.getAllowedTransitions('DELIVERED')).toEqual([]);
      expect(orderService.getAllowedTransitions('CANCELLED')).toEqual([]);
      expect(orderService.getAllowedTransitions('REFUNDED')).toEqual([]);
    });
  });

  describe('validateStatusTransition', () => {
    it('should validate valid transition', () => {
      const order = {
        status: 'PENDING',
        paymentStatus: 'COMPLETED',
      };

      expect(() => {
        orderService.validateStatusTransition(order, 'PROCESSING');
      }).not.toThrow();
    });

    it('should throw error for invalid transition', () => {
      const order = {
        status: 'PENDING',
        paymentStatus: 'COMPLETED',
      };

      expect(() => {
        orderService.validateStatusTransition(order, 'SHIPPED');
      }).toThrow();
    });

    it('should throw error when cancelling delivered order', () => {
      const order = {
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
      };

      expect(() => {
        orderService.validateStatusTransition(order, 'CANCELLED');
      }).toThrow();
    });

    it('should throw error when shipping unpaid order', () => {
      const order = {
        status: 'PROCESSING',
        paymentStatus: 'PENDING',
      };

      expect(() => {
        orderService.validateStatusTransition(order, 'SHIPPED');
      }).toThrow();
    });
  });

  describe('updateOrderStatus', () => {
    const mockOrder = {
      id: 'order_123',
      orderNumber: 'ORD-001',
      status: 'PENDING',
      paymentStatus: 'COMPLETED',
      userId: 'user_123',
    };

    it('should update order status successfully', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        status: 'PROCESSING',
        updatedAt: new Date(),
      });

      const result = await orderService.updateOrderStatus('order_123', 'PROCESSING');

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order_123' },
        select: expect.any(Object),
      });
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_123' },
          data: {
            status: 'PROCESSING',
            updatedAt: expect.any(Date),
          },
        })
      );
      expect(result.status).toBe('PROCESSING');
    });

    it('should throw error if order not found', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        orderService.updateOrderStatus('invalid_order', 'PROCESSING')
      ).rejects.toThrow('Order not found');
    });

    it('should skip validation if status unchanged', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        status: 'PROCESSING',
      });

      const result = await orderService.updateOrderStatus('order_123', 'PROCESSING');

      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(result.status).toBe('PROCESSING');
    });

    it('should skip validation when skipValidation is true', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        status: 'SHIPPED',
        updatedAt: new Date(),
      });

      const result = await orderService.updateOrderStatus('order_123', 'SHIPPED', {
        skipValidation: true,
      });

      expect(result.status).toBe('SHIPPED');
    });
  });

  describe('cancelOrder', () => {
    const mockOrder = {
      id: 'order_123',
      orderNumber: 'ORD-001',
      status: 'PENDING',
      paymentStatus: 'COMPLETED',
      userId: 'user_123',
      items: [
        {
          id: 'item_1',
          variantId: 'variant_1',
          quantity: 2,
          variant: {
            id: 'variant_1',
            stockQuantity: 10,
          },
        },
      ],
    };

    it('should cancel order and restore inventory', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            update: jest.fn().mockResolvedValueOnce({
              ...mockOrder,
              status: 'CANCELLED',
            }),
          },
          variant: {
            update: jest.fn().mockResolvedValueOnce({
              id: 'variant_1',
              stockQuantity: 12,
            }),
          },
        };
        return callback(tx);
      });

      const result = await orderService.cancelOrder('order_123', {
        userId: 'user_123',
        restoreInventory: true,
      });

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if order not found', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        orderService.cancelOrder('invalid_order', { userId: 'user_123' })
      ).rejects.toThrow('Order not found');
    });

    it('should throw error if user does not own order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      await expect(
        orderService.cancelOrder('order_123', { userId: 'other_user' })
      ).rejects.toThrow('You do not have permission to cancel this order');
    });

    it('should throw error if order cannot be cancelled', async () => {
      const deliveredOrder = {
        ...mockOrder,
        status: 'DELIVERED',
      };
      prisma.order.findUnique.mockResolvedValueOnce(deliveredOrder);

      await expect(
        orderService.cancelOrder('order_123', { userId: 'user_123' })
      ).rejects.toThrow('Cannot cancel order in DELIVERED status');
    });

    it('should not restore inventory if restoreInventory is false', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            update: jest.fn().mockResolvedValueOnce({
              ...mockOrder,
              status: 'CANCELLED',
            }),
          },
        };
        return callback(tx);
      });

      await orderService.cancelOrder('order_123', {
        userId: 'user_123',
        restoreInventory: false,
      });

      // Verify variant.update was not called
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('canCancelOrder', () => {
    it('should return true for cancellable orders', () => {
      expect(orderService.canCancelOrder({ status: 'PENDING' })).toBe(true);
      expect(orderService.canCancelOrder({ status: 'PROCESSING' })).toBe(true);
    });

    it('should return false for non-cancellable orders', () => {
      expect(orderService.canCancelOrder({ status: 'SHIPPED' })).toBe(false);
      expect(orderService.canCancelOrder({ status: 'DELIVERED' })).toBe(false);
      expect(orderService.canCancelOrder({ status: 'CANCELLED' })).toBe(false);
      expect(orderService.canCancelOrder({ status: 'REFUNDED' })).toBe(false);
    });

    it('should return false for null or undefined order', () => {
      expect(orderService.canCancelOrder(null)).toBe(false);
      expect(orderService.canCancelOrder(undefined)).toBe(false);
    });
  });
});

