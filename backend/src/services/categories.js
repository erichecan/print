/**
 * Categories Service
 * [2025-12-11 09:21:35] 分类服务：提供树状分类与计数逻辑
 */

const prisma = require('../lib/prisma');

/**
 * [2025-12-11 09:21:35] 获取树状分类（含产品计数）
 * 计数策略：统计该分类下（含子类）的所有产品数量
 */
async function getCategoryTree() {
  // 获取所有活跃分类
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      productCategories: {
        select: {
          productId: true,
        },
      },
      children: {
        where: { isActive: true },
        include: {
          productCategories: {
            select: {
              productId: true,
            },
          },
          children: {
            where: { isActive: true },
            include: {
              productCategories: {
                select: {
                  productId: true,
                },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // 计算每个分类的产品数量（含子类）
  function calculateProductCount(category) {
    // 直接产品数量
    const directCount = category.productCategories?.length || 0;

    // 子类产品数量（递归）
    const childrenCount = (category.children || []).reduce(
      (sum, child) => sum + calculateProductCount(child),
      0
    );

    return directCount + childrenCount;
  }

  // 构建树节点
  function buildTreeNode(category) {
    const productCount = calculateProductCount(category);

    const node = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      productCount,
      children: (category.children || []).map((child) => buildTreeNode(child)),
    };

    return node;
  }

  // 只返回根分类（parentId 为 null）
  const rootCategories = categories.filter((c) => !c.parentId);
  return rootCategories.map((c) => buildTreeNode(c));
}

/**
 * [2025-12-11 09:21:35] 根据 slug 获取分类及其子分类的产品列表
 */
async function getProductsByCategorySlug(slug, options = {}) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  // 查找分类
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  if (!category) {
    return {
      category: null,
      products: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  // 获取该分类及其所有子分类的 ID
  const categoryIds = [category.id];
  if (category.children) {
    categoryIds.push(...category.children.map((c) => c.id));
  }

  // 查询产品
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        productCategories: {
          some: {
            categoryId: { in: categoryIds },
          },
        },
      },
      include: {
        images: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          take: 1,
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({
      where: {
        isActive: true,
        productCategories: {
          some: {
            categoryId: { in: categoryIds },
          },
        },
      },
    }),
  ]);

  return {
    category,
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  getCategoryTree,
  getProductsByCategorySlug,
};
