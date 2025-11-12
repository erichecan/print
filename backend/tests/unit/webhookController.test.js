/**
 * Webhook Controller Tests
 * [2025-01-27 14:15:00] Tests for Stripe webhook handling
 */
jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

jest.mock('../../src/lib/prisma', () => ({
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../src/services/emailService', () => ({
  sendOrderConfirmation: jest.fn(),
}));

const Stripe = require('stripe');
const prisma = require('../../src/lib/prisma');
const { sendOrderConfirmation } = require('../../src/services/emailService');
const webhookController = require('../../src/controllers/webhookController');

function createMockRequest(body, headers = {}) {
  return {
    body,
    headers: {
      'stripe-signature': 'test_signature',
      ...headers,
    },
  };
}

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('[2025-01-27 14:15:00] webhookController.handleStripeWebhook', () => {
  let stripeInstance;
  let mockOrder;

  beforeEach(() => {
    jest.clearAllMocks();
    stripeInstance = new Stripe();
    mockOrder = {
      id: 'order_123',
      orderNumber: 'ORD-001',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentIntentId: 'pi_test_123',
      email: 'test@example.com',
      total: 100,
      items: [],
    };
  });

  describe('Webhook signature verification', () => {
    it('should return 400 if webhook secret is not configured', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Webhook secret not configured' })
      );

      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
      }
    });

    it('should return 400 if signature verification fails', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
      stripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Webhook Error') })
      );
    });
  });

  describe('payment_intent.succeeded event', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'pi_test_123',
          },
        },
      });
    });

    it('should update order status to PROCESSING when payment succeeds', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        status: 'PROCESSING',
        paymentStatus: 'COMPLETED',
      });
      sendOrderConfirmation.mockResolvedValueOnce();

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { paymentIntentId: 'pi_test_123' },
        include: expect.any(Object),
      });
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_123' },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'PROCESSING',
          },
        })
      );
      expect(sendOrderConfirmation).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should not update order if already processed', async () => {
      const processedOrder = {
        ...mockOrder,
        status: 'PROCESSING',
        paymentStatus: 'COMPLETED',
      };
      prisma.order.findUnique.mockResolvedValueOnce(processedOrder);

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle email send failure gracefully', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        status: 'PROCESSING',
        paymentStatus: 'COMPLETED',
      });
      sendOrderConfirmation.mockRejectedValueOnce(new Error('Email failed'));

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('payment_intent.payment_failed event', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'pi_test_123',
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined.',
            },
          },
        },
      });
    });

    it('should update order payment status to FAILED', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        paymentStatus: 'FAILED',
      });

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_123' },
          data: {
            paymentStatus: 'FAILED',
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('charge.refunded event', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'charge.refunded',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'ch_test_123',
            payment_intent: 'pi_test_123',
            amount_refunded: 10000, // $100.00 in cents
          },
        },
      });
    });

    it('should update order status to REFUNDED for full refund', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        total: 100,
      });
      prisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
      });

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_123' },
          data: {
            status: 'REFUNDED',
            paymentStatus: 'REFUNDED',
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle partial refund correctly', async () => {
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'charge.refunded',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'ch_test_123',
            payment_intent: 'pi_test_123',
            amount_refunded: 5000, // $50.00 in cents (partial refund)
          },
        },
      });

      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        total: 100,
      });
      prisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        paymentStatus: 'REFUNDED',
      });

      const req = createMockRequest({});
      const res = createMockResponse();

      await webhookController.handleStripeWebhook(req, res);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: 'REFUNDED',
          }),
        })
      );
    });
  });
});

