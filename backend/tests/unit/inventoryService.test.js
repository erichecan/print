/**
 * Inventory Service Tests
 * [2025-01-27 14:20:00] Tests for inventory management service
 */
jest.mock('../../src/lib/prisma', () => ({
  productVariant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../../src/lib/prisma');
const inventoryService = require('../../src/services/inventoryService');

describe('[2025-01-27 14:20:00] inventoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('decreaseInventory', () => {
    it('should decrease inventory for order items', async () => {
      const orderItems = [
        { variantId: 'variant_1', quantity: 2 },
        { variantId: 'variant_2', quantity: 1 },
      ];

      const mockVariants = [
        {
          id: 'variant_1',
          sku: 'SKU-001',
          stockQuantity: 8,
          product: { name: 'Product 1' },
        },
        {
          id: 'variant_2',
          sku: 'SKU-002',
          stockQuantity: 4,
          product: { name: 'Product 2' },
        },
      ];

      prisma.$transaction.mockImplementation((queries) => {
        return Promise.all(queries.map((query, index) => query(mockVariants[index])));
      });

      prisma.productVariant.update.mockImplementation(({ where, data }) => {
        const variant = mockVariants.find((v) => v.id === where.id);
        return Promise.resolve({
          ...variant,
          stockQuantity: variant.stockQuantity - data.stockQuantity.decrement,
        });
      });

      const results = await inventoryService.decreaseInventory(orderItems);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it('should handle negative inventory detection', async () => {
      const orderItems = [{ variantId: 'variant_1', quantity: 100 }];

      prisma.$transaction.mockResolvedValueOnce([
        {
          id: 'variant_1',
          sku: 'SKU-001',
          stockQuantity: -90,
          product: { name: 'Product 1' },
        },
      ]);

      await inventoryService.decreaseInventory(orderItems);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('increaseInventory', () => {
    it('should increase inventory (restore stock)', async () => {
      const orderItems = [
        { variantId: 'variant_1', quantity: 2 },
        { variantId: 'variant_2', quantity: 1 },
      ];

      prisma.$transaction.mockResolvedValueOnce([
        {
          id: 'variant_1',
          sku: 'SKU-001',
          stockQuantity: 12,
          product: { name: 'Product 1' },
        },
        {
          id: 'variant_2',
          sku: 'SKU-002',
          stockQuantity: 6,
          product: { name: 'Product 2' },
        },
      ]);

      const results = await inventoryService.increaseInventory(orderItems);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });
  });

  describe('checkStockAvailability', () => {
    it('should return sufficient stock when available', async () => {
      const variant = {
        id: 'variant_1',
        sku: 'SKU-001',
        stockQuantity: 10,
        product: {
          name: 'Product 1',
          isActive: true,
        },
      };

      prisma.productVariant.findUnique.mockResolvedValueOnce(variant);

      const result = await inventoryService.checkStockAvailability('variant_1', 5);

      expect(result.sufficient).toBe(true);
      expect(result.available).toBe(10);
      expect(result.requested).toBe(5);
    });

    it('should return insufficient stock when not available', async () => {
      const variant = {
        id: 'variant_1',
        sku: 'SKU-001',
        stockQuantity: 3,
        product: {
          name: 'Product 1',
          isActive: true,
        },
      };

      prisma.productVariant.findUnique.mockResolvedValueOnce(variant);

      const result = await inventoryService.checkStockAvailability('variant_1', 5);

      expect(result.sufficient).toBe(false);
      expect(result.available).toBe(3);
      expect(result.requested).toBe(5);
    });

    it('should throw error if variant not found', async () => {
      prisma.productVariant.findUnique.mockResolvedValueOnce(null);

      await expect(
        inventoryService.checkStockAvailability('invalid_variant', 1)
      ).rejects.toThrow('Product variant not found');
    });

    it('should throw error if product is not active', async () => {
      const variant = {
        id: 'variant_1',
        sku: 'SKU-001',
        stockQuantity: 10,
        product: {
          name: 'Product 1',
          isActive: false,
        },
      };

      prisma.productVariant.findUnique.mockResolvedValueOnce(variant);

      await expect(
        inventoryService.checkStockAvailability('variant_1', 1)
      ).rejects.toThrow('Product is not active');
    });
  });

  describe('checkMultipleStockAvailability', () => {
    it('should return all sufficient when all items have stock', async () => {
      prisma.productVariant.findUnique
        .mockResolvedValueOnce({
          id: 'variant_1',
          sku: 'SKU-001',
          stockQuantity: 10,
          product: { name: 'Product 1', isActive: true },
        })
        .mockResolvedValueOnce({
          id: 'variant_2',
          sku: 'SKU-002',
          stockQuantity: 5,
          product: { name: 'Product 2', isActive: true },
        });

      const items = [
        { variantId: 'variant_1', quantity: 5 },
        { variantId: 'variant_2', quantity: 3 },
      ];

      const result = await inventoryService.checkMultipleStockAvailability(items);

      expect(result.allSufficient).toBe(true);
      expect(result.insufficient).toHaveLength(0);
    });

    it('should identify insufficient stock items', async () => {
      prisma.productVariant.findUnique
        .mockResolvedValueOnce({
          id: 'variant_1',
          sku: 'SKU-001',
          stockQuantity: 2,
          product: { name: 'Product 1', isActive: true },
        })
        .mockResolvedValueOnce({
          id: 'variant_2',
          sku: 'SKU-002',
          stockQuantity: 5,
          product: { name: 'Product 2', isActive: true },
        });

      const items = [
        { variantId: 'variant_1', quantity: 5 },
        { variantId: 'variant_2', quantity: 3 },
      ];

      const result = await inventoryService.checkMultipleStockAvailability(items);

      expect(result.allSufficient).toBe(false);
      expect(result.insufficient).toHaveLength(1);
      expect(result.insufficient[0].sufficient).toBe(false);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with stock below threshold', async () => {
      const lowStockVariants = [
        {
          id: 'variant_1',
          sku: 'SKU-001',
          stockQuantity: 5,
          productId: 'product_1',
          product: {
            id: 'product_1',
            name: 'Product 1',
            sku: 'PROD-001',
            isActive: true,
          },
        },
        {
          id: 'variant_2',
          sku: 'SKU-002',
          stockQuantity: 8,
          productId: 'product_2',
          product: {
            id: 'product_2',
            name: 'Product 2',
            sku: 'PROD-002',
            isActive: true,
          },
        },
      ];

      prisma.productVariant.findMany.mockResolvedValueOnce(lowStockVariants);

      const result = await inventoryService.getLowStockProducts(10);

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            stockQuantity: { lte: 10 },
            product: { isActive: true },
          },
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].currentStock).toBe(5);
      expect(result[0].threshold).toBe(10);
    });

    it('should use default threshold if not provided', async () => {
      prisma.productVariant.findMany.mockResolvedValueOnce([]);

      await inventoryService.getLowStockProducts();

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stockQuantity: { lte: expect.any(Number) },
          }),
        })
      );
    });
  });

  describe('getOutOfStockProducts', () => {
    it('should return products with zero or negative stock', async () => {
      const outOfStockVariants = [
        {
          id: 'variant_1',
          sku: 'SKU-001',
          stockQuantity: 0,
          productId: 'product_1',
          product: {
            id: 'product_1',
            name: 'Product 1',
            sku: 'PROD-001',
            isActive: true,
          },
        },
      ];

      prisma.productVariant.findMany.mockResolvedValueOnce(outOfStockVariants);

      const result = await inventoryService.getOutOfStockProducts();

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            stockQuantity: { lte: 0 },
            product: { isActive: true },
          },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].currentStock).toBe(0);
    });
  });

  describe('updateStockQuantity', () => {
    it('should update stock quantity', async () => {
      const updatedVariant = {
        id: 'variant_1',
        sku: 'SKU-001',
        stockQuantity: 20,
        product: {
          name: 'Product 1',
        },
      };

      prisma.productVariant.update.mockResolvedValueOnce(updatedVariant);

      const result = await inventoryService.updateStockQuantity('variant_1', 20);

      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant_1' },
        data: {
          stockQuantity: 20,
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      });
      expect(result.stockQuantity).toBe(20);
    });

    it('should ensure non-negative stock quantity', async () => {
      const updatedVariant = {
        id: 'variant_1',
        sku: 'SKU-001',
        stockQuantity: 0,
        product: {
          name: 'Product 1',
        },
      };

      prisma.productVariant.update.mockResolvedValueOnce(updatedVariant);

      await inventoryService.updateStockQuantity('variant_1', -5);

      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            stockQuantity: 0, // Math.max(0, -5) = 0
          },
        })
      );
    });
  });
});

