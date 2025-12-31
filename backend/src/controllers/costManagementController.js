// Cost management controller
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

const toNumber = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  return Number(value) || 0;
};

const formatDecimalInput = (value, field) => {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${field} is required`);
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${field} must be a numeric value`);
  }

  return Math.round(parsed * 100) / 100;
};

const calculateMargin = (salePrice, grossProfit) => {
  const revenue = toNumber(salePrice);
  if (revenue === 0) {
    return 0;
  }
  const profit = toNumber(grossProfit);
  return (profit / revenue) * 100;
};

const mapProductCost = (product) => {
  const unitCost = toNumber(product.unitCost);
  const salePrice = toNumber(product.salePrice);
  const grossProfit = toNumber(product.grossProfit);
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name
        }
      : null,
    unitCost,
    salePrice,
    grossProfit,
    margin: calculateMargin(salePrice, grossProfit),
    updatedAt: product.updatedAt
  };
};

exports.getCostSummary = async (req, res) => {
  try {
    const aggregate = await prisma.product.aggregate({
      _sum: {
        unitCost: true,
        salePrice: true,
        grossProfit: true
      },
      _avg: {
        grossProfit: true
      }
    });

    const totalCost = toNumber(aggregate._sum.unitCost);
    const totalRevenue = toNumber(aggregate._sum.salePrice);
    const averageGrossProfit = toNumber(aggregate._avg.grossProfit);
    const averageMargin = totalRevenue > 0 ? (toNumber(aggregate._sum.grossProfit) / totalRevenue) * 100 : 0;

    res.json({
      data: {
        totalCost,
        totalRevenue,
        averageGrossProfit,
        averageMargin
      }
    });
  } catch (error) {
    logger.error('[CostManagement] Failed to load summary', error);
    res.status(500).json({
      error: 'Failed to load cost summary'
    });
  }
};

exports.listProductCosts = async (req, res) => {
  try {
    const {
      search,
      categoryId,
      sort = 'updatedAt',
      order = 'desc',
      limit = 100,
      offset = 0
    } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const orderByField = ['name', 'sku', 'updatedAt', 'salePrice', 'unitCost'].includes(sort)
      ? sort
      : 'updatedAt';
    const orderDirection = order === 'asc' ? 'asc' : 'desc';

    const products = await prisma.product.findMany({
      where,
      take: Number(limit) || 100,
      skip: Number(offset) || 0,
      orderBy: { [orderByField]: orderDirection },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      data: products.map(mapProductCost)
    });
  } catch (error) {
    logger.error('[CostManagement] Failed to list product costs', error);
    logger.error('[CostManagement] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      error: 'Failed to load product cost data',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};

exports.updateProductCost = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const unitCost = formatDecimalInput(payload.unitCost, 'unitCost');
    const salePrice = formatDecimalInput(payload.salePrice, 'salePrice');

    const grossProfit =
      payload.grossProfit !== undefined && payload.grossProfit !== null && payload.grossProfit !== ''
        ? formatDecimalInput(payload.grossProfit, 'grossProfit')
        : Math.round((salePrice - unitCost) * 100) / 100;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        unitCost: new Prisma.Decimal(unitCost.toFixed(2)),
        salePrice: new Prisma.Decimal(salePrice.toFixed(2)),
        grossProfit: new Prisma.Decimal(grossProfit.toFixed(2)),
basePrice: new Prisma.Decimal(salePrice.toFixed(2)) // Keep storefront price aligned with sale price
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      data: mapProductCost(updated)
    });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    logger.error('[CostManagement] Failed to update product cost', error);
    res.status(400).json({
      error: error.message || 'Failed to update product cost'
    });
  }
};

exports.listCostCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    res.json({
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        productCount: category._count.products
      }))
    });
  } catch (error) {
    logger.error('[CostManagement] Failed to load categories', error);
    res.status(500).json({
      error: 'Failed to load categories'
    });
  }
};


