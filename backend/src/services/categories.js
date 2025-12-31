/**
 * Categories Service
* 分类服务：提供树状分类与计数逻辑
 */

const prisma = require('../lib/prisma');

/**
* 获取树状分类（含产品计数）
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
* 根据 slug 获取分类及其子分类的产品列表
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

/**
* 获取分组分类树（含精确计数）
 * @param {Object} options - 配置选项
 * @param {string} options.strategy - 计数策略：'direct'（仅本类）或 'aggregate'（包含子类）
 * @returns {Promise<Array>} 分组分类数组
 */
async function getTreeWithCounts({ strategy = 'direct' } = {}) {
  // 获取所有一级分类（groups）
  const rootCategories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null,
    },
    include: {
      children: {
        where: { isActive: true },
        include: {
          productCategories: {
            select: {
              productId: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // 获取所有子分类的 ID（用于 aggregate 策略）
  const allChildCategoryIds = rootCategories.flatMap((group) =>
    group.children.map((child) => child.id)
  );

  // 计算每个子分类的产品计数
  const countMap = new Map();

  if (strategy === 'direct') {
    // 直接计数：仅统计该分类直接关联的产品
    const counts = await prisma.productCategory.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: { in: allChildCategoryIds },
      },
      _count: {
        productId: true,
      },
    });

    counts.forEach((item) => {
      countMap.set(item.categoryId, item._count.productId);
    });
  } else {
    // Aggregate 策略：统计该分类及其所有子孙分类的产品
    for (const childId of allChildCategoryIds) {
      // 获取该分类及其所有子孙分类的 ID
      const categoryIds = await getCategoryAndDescendantsIds(childId);
      
      // 统计这些分类下的产品数量（去重）
      const count = await prisma.productCategory.groupBy({
        by: ['productId'],
        where: {
          categoryId: { in: categoryIds },
        },
      });

      countMap.set(childId, count.length);
    }
  }

  // 构建分组结构
  const groups = rootCategories
    .filter((group) => {
      // 只返回有子分类的组
      return group.children && group.children.length > 0;
    })
    .map((group) => {
      const children = group.children
        .map((child) => {
          const count = countMap.get(child.id) || 0;
          return {
            id: child.id,
            name: child.name,
            slug: child.slug,
            count,
          };
        })
        .filter((child) => child.count > 0); // 只返回有产品的子分类

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        children,
      };
    })
    .filter((group) => group.children.length > 0); // 只返回有子分类的组

  return groups;
}

/**
* 递归获取分类及其所有子孙分类的 ID
 */
async function getCategoryAndDescendantsIds(categoryId) {
  const categoryIds = [categoryId];
  
  const children = await prisma.category.findMany({
    where: {
      parentId: categoryId,
      isActive: true,
    },
    select: { id: true },
  });

  for (const child of children) {
    const descendantIds = await getCategoryAndDescendantsIds(child.id);
    categoryIds.push(...descendantIds);
  }

  return categoryIds;
}

module.exports = {
  getCategoryTree,
  getProductsByCategorySlug,
  getTreeWithCounts,
};
