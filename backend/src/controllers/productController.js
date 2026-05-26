/**
 * Product Controller
* Enhanced with out-of-stock filtering
* Added filter options API endpoint
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');
const { optimizeImageUrl } = require('../utils/imageHelper');

// 商品公共接口说明：
// - 所有商品、价格、图片、类目等数据统一来自数据库（包括导入脚本和后台管理创建的记录）
// - 前端页面（列表 / 详情 / 关联商品）一律通过本控制器提供的接口读取数据，不再直接依赖任何静态 JSON 或硬编码商品
// - 图片 URL 必须来自后台上传或导入后写入的数据库字段，经过 optimizeImageUrl 统一处理

const PRODUCT_LIST_CACHE_TTL = 300; // 5 minutes
const PRODUCT_DETAIL_CACHE_TTL = 600; // 10 minutes
const FILTER_OPTIONS_CACHE_TTL = 600; // 10 minutes

// 辅助函数：安全地将 Prisma.Decimal 或数字转换为 Number
const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object' && value.toNumber && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// 固定的颜色列表（参考 Custom Ink 网站）
const FIXED_COLOR_LIST = [
  { name: 'Black', hex: '#000000' },
  { name: 'Blue', hex: '#0066CC' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Green', hex: '#00CC00' },
  { name: 'Red', hex: '#CC0000' },
  { name: 'Pink', hex: '#FF99CC' },
  { name: 'Purple', hex: '#9933CC' },
  { name: 'Yellow', hex: '#FFCC00' },
  { name: 'Orange', hex: '#FF9900' },
  { name: 'Brown', hex: '#996633' },
  { name: 'Heather', hex: '#CCCCCC', pattern: true },
  { name: 'Camo', hex: '#4A5D23', pattern: true },
  { name: 'Tie-Dye', hex: '#FF00FF', pattern: true },
];

// 递归获取分类及其所有子分类的 ID
async function getCategoryIdsIncludingChildren(categorySlug) {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: {
      children: {
        where: { isActive: true },
        include: {
          children: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!category) {
    return [];
  }

  // 收集所有分类 ID（包括自身和所有子分类）
  const categoryIds = [category.id];

  // 递归收集子分类 ID
  function collectChildIds(categories) {
    for (const child of categories) {
      categoryIds.push(child.id);
      if (child.children && child.children.length > 0) {
        collectChildIds(child.children);
      }
    }
  }

  if (category.children && category.children.length > 0) {
    collectChildIds(category.children);
  }

  return categoryIds;
}

// 固定的 Rush Delivery 选项列表（参考 Custom Ink 网站）
const FIXED_RUSH_DELIVERY_OPTIONS = [
  { name: '3 days', label: 'Super Rush' },
  { name: '1 week', label: 'Rush' },
  { name: '10 days', label: 'Rush' },
  { name: '12 days', label: 'Rush' },
];

/**
 * 获取全局尺码费用映射 (用于同步 Design Lab 价格)
 */
async function getGlobalFeeMap() {
  try {
    const globalSizeFees = await prisma.offline_order_size_fees.findMany();
    const globalFeeMap = {};
    globalSizeFees.forEach(fee => {
      // Global fees are stored as Dollars (Decimal), convert to Cents for internal consistency
      globalFeeMap[fee.size] = Math.round(Number(fee.additional_fee) * 100);
    });
    return globalFeeMap;
  } catch (e) {
    logger.warn("Failed to fetch offline_order_size_fees for synchronization:", e.message);
    return {};
  }
}

/**
 * Get filter options with counts
 * GET /api/products/filters/options?collection=
* 获取筛选选项统计数据，用于动态渲染筛选器
* 修改：返回固定筛选选项列表，即使数量为0也返回
 */
exports.getFilterOptions = async (req, res) => {
  try {
    // 检查 Prisma 是否已初始化
    let prismaClient;
    try {
      prismaClient = prisma;
      // 尝试访问一个简单属性来验证 Prisma 是否可用
      if (!prismaClient || typeof prismaClient.product === 'undefined') {
        throw new Error('Prisma Client not initialized');
      }
    } catch (prismaError) {
      logger.warn(' Prisma Client not available, returning default filter options');
      // 返回默认数据
      const defaultFilterData = {
        categories: [],
        brands: [],
        colors: FIXED_COLOR_LIST.map((color) => ({
          name: color.name,
          hex: color.hex,
          pattern: color.pattern || false,
          count: 0,
        })),
        sizes: [],
        priceRanges: [
          { name: '$', count: 0 },
          { name: '$$', count: 0 },
          { name: '$$$', count: 0 },
        ],
        priceRange: { min: 0, max: 0 },
        fit: [],
        decoration: [],
        material: [],
        type: [],
        style: [],
        neckline: [],
        features: [],
        rushDelivery: FIXED_RUSH_DELIVERY_OPTIONS.map((option) => ({
          name: option.name,
          label: option.label,
          count: 0,
        })),
      };
      return res.status(200).json(defaultFilterData);
    }

    const collectionSlug = req.query.collection;
    const search = req.query.search;

    // Build base where clause
    const baseWhere = {
      isActive: true,
      isSystem: false,
    };
    const andConditions = [];

    // Filter by collection
    if (collectionSlug) {
      andConditions.push({
        collectionProducts: {
          some: {
            collection: {
              slug: collectionSlug,
              isActive: true,
            },
          },
        },
      });
    }

    // Search filter
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      baseWhere.AND = andConditions;
    }

    const cacheKey = `products:filters:${JSON.stringify({ collection: collectionSlug || '', search: search || '' })}`;
    const cachedFilters = await getCache(cacheKey);

    if (cachedFilters) {
      return res.json(cachedFilters);
    }

    // 先获取符合条件的产品ID列表，然后用于统计
    // 使用 prismaClient 而不是 prisma
    const matchingProductIds = await prismaClient.product.findMany({
      where: baseWhere,
      select: { id: true },
    });
    const productIds = matchingProductIds.map(p => p.id);

    // 获取分类统计（包括一级和二级分类）
    // 使用 prismaClient 而不是 prisma
    const allCategories = await prismaClient.category.findMany({
      where: {
        isActive: true,
      },
      include: {
        children: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 获取每个分类的商品数量
    const categoryCounts = await Promise.all(
      allCategories.map(async (cat) => {
        const productCount = await prismaClient.product.count({
          where: {
            ...baseWhere,
            categoryId: cat.id,
          },
        });
        const childCounts = await Promise.all(
          cat.children.map(async (child) => {
            const count = await prismaClient.product.count({
              where: {
                ...baseWhere,
                categoryId: child.id,
              },
            });
            return { ...child, count };
          })
        );
        return {
          ...cat,
          count: productCount,
          children: childCounts,
        };
      })
    );

    const categories = categoryCounts.filter(cat => cat.count > 0 || cat.children.some(c => c.count > 0));

    // 获取品牌统计
    // 使用 prismaClient 而不是 prisma
    const allBrands = await prismaClient.brand.findMany({
      where: {
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    // 获取所有品牌的商品数量（用于后续返回所有品牌）
    const brands = await Promise.all(
      allBrands.map(async (brand) => {
        const productCount = await prismaClient.product.count({
          where: {
            ...baseWhere,
            brandId: brand.id,
          },
        });
        return {
          ...brand,
          _count: { products: productCount },
        };
      })
    );

    // 获取颜色统计（从variants）
    // color是String（必填），colorHex是String?（可选），只需过滤空字符串
    // 使用 prismaClient 而不是 prisma
    const colorStats = await prismaClient.variant.groupBy({
      by: ['color', 'colorHex'],
      where: {
        product: baseWhere,
        color: {
          not: '',
        },
        colorHex: {
          not: '',
        },
      },
      _count: {
        _all: true,
      },
    }).catch(() => []); // 如果查询失败，返回空数组

    // 获取尺寸统计（从variants）
    // size是String（必填），只需过滤空字符串
    // 使用 prismaClient 而不是 prisma
    const sizeStats = await prismaClient.variant.groupBy({
      by: ['size'],
      where: {
        product: baseWhere,
        size: {
          not: '',
        },
      },
      _count: {
        _all: true,
      },
    }).catch(() => []); // 如果查询失败，返回空数组

    // 获取价格范围统计
    // 使用 prismaClient 而不是 prisma
    const products = await prismaClient.product.findMany({
      where: baseWhere,
      select: {
        basePrice: true,
      },
    });

    const prices = products.map((p) => toNumber(p.basePrice) / 100); // 转换为美元
    const minPrice = Math.min(...prices, 0);
    const maxPrice = Math.max(...prices, 0);

    // 价格区间统计
    const priceRanges = [
      { name: '$', min: 0, max: 20, count: 0 },
      { name: '$$', min: 20, max: 40, count: 0 },
      { name: '$$$', min: 40, max: Infinity, count: 0 },
    ];

    prices.forEach((price) => {
      priceRanges.forEach((range) => {
        if (price >= range.min && price < range.max) {
          range.count++;
        }
      });
    });

    // 格式化分类数据
    const categoryTree = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.count,
      children: cat.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        count: child.count,
      })),
    }));

    // 格式化品牌数据：返回所有品牌，即使数量为0
    const brandOptions = allBrands.map((brand) => {
      const brandWithCount = brands.find(b => b.id === brand.id);
      return {
        name: brand.name,
        slug: brand.slug,
        count: brandWithCount?._count?.products || 0,
      };
    });

    // 格式化颜色数据：返回固定颜色列表，即使数量为0
    // 创建颜色统计映射
    const colorStatsMap = new Map(
      colorStats.map((stat) => [stat.color.toLowerCase(), stat._count._all])
    );

    // 返回固定颜色列表，填充数量
    const colorOptions = FIXED_COLOR_LIST.map((fixedColor) => {
      const count = colorStatsMap.get(fixedColor.name.toLowerCase()) || 0;
      return {
        name: fixedColor.name,
        hex: fixedColor.hex,
        pattern: fixedColor.pattern || false,
        count: count,
      };
    });

    // 格式化尺寸数据
    const sizeOptions = sizeStats
      .map((stat) => ({
        name: stat.size,
        count: stat._count._all,
      }))
      .sort((a, b) => {
        // 排序：XS, S, M, L, XL, 2XL, 3XL等
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
        const indexA = sizeOrder.indexOf(a.name);
        const indexB = sizeOrder.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

    // 格式化 Rush Delivery 选项：返回固定列表，即使数量为0
    // 注意：Rush Delivery 目前不在数据库中存储，所以所有选项数量都为0
    const rushDeliveryOptions = FIXED_RUSH_DELIVERY_OPTIONS.map((option) => ({
      name: option.name,
      label: option.label,
      count: 0, // 目前没有存储 Rush Delivery 数据，数量为0
    }));

    const filterData = {
      categories: categoryTree,
      brands: brandOptions,
      colors: colorOptions,
      sizes: sizeOptions,
      priceRanges: priceRanges.map((r) => ({
        name: r.name,
        count: r.count,
      })),
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
      // 目前数据库中不存在的字段，返回空数组
      fit: [],
      decoration: [],
      material: [],
      type: [],
      style: [],
      neckline: [],
      features: [],
      // 返回固定的 Rush Delivery 选项列表
      rushDelivery: rushDeliveryOptions,
    };

    await setCache(cacheKey, filterData, FILTER_OPTIONS_CACHE_TTL);

    res.json(filterData);
  } catch (error) {
    // 增强错误处理：即使数据库查询失败，也返回默认的筛选选项，避免前端崩溃
    logger.error(' Failed to get filter options:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });

    // 返回默认的筛选选项数据，确保前端能正常渲染
    const defaultFilterData = {
      categories: [],
      brands: FIXED_COLOR_LIST.map(() => ({ name: '', slug: '', count: 0 })), // 空品牌列表
      colors: FIXED_COLOR_LIST.map((color) => ({
        name: color.name,
        hex: color.hex,
        pattern: color.pattern || false,
        count: 0,
      })),
      sizes: [],
      priceRanges: [
        { name: '$', count: 0 },
        { name: '$$', count: 0 },
        { name: '$$$', count: 0 },
      ],
      priceRange: {
        min: 0,
        max: 0,
      },
      fit: [],
      decoration: [],
      material: [],
      type: [],
      style: [],
      neckline: [],
      features: [],
      rushDelivery: FIXED_RUSH_DELIVERY_OPTIONS.map((option) => ({
        name: option.name,
        label: option.label,
        count: 0,
      })),
    };

    // 返回默认数据而不是500错误，确保前端能正常显示筛选器
    res.status(200).json(defaultFilterData);
  }
};

/**
 * Get products list with pagination, filtering, and sorting
 * GET /api/products?page=1&limit=20&collection=&search=&sort=
 */
exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;
    const collectionSlug = req.query.collection;
    const categorySlug = req.query.category; // 支持 category 筛选
    const search = req.query.search;
    // 只使用数据库中实际存在的列名，避免 Prisma 映射问题
    // 添加 basePrice 到允许的排序字段，支持价格排序
    const allowedSortFields = ['createdAt', 'name', 'updatedAt', 'basePrice'];
    const requestedSort = req.query.sort || 'createdAt';
    // 如果请求的是 price，需要特殊处理（考虑 salePrice）
    const isPriceSort = requestedSort === 'price';
    // 如果请求的是 price，映射到 basePrice（用于数据库排序，后续会重新排序）
    const mappedSort = isPriceSort ? 'basePrice' : requestedSort;
    const sortBy = allowedSortFields.includes(mappedSort) ? mappedSort : 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 'asc' : 'desc';

    // 读取筛选参数
    const colorFilter = req.query.color ? req.query.color.split(',') : [];
    const brandFilter = req.query.brand ? req.query.brand.split(',') : [];
    const sizeFilter = req.query.size ? req.query.size.split(',') : [];
    const tagsFilter = req.query.tags ? req.query.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Build where clause
    const where = {
      isActive: true,
      isSystem: false,
    };
    const andConditions = [];

    // Filter out products with no available variants (optional, can be controlled by query param)
    // Out-of-stock filtering
    // 支持仅使用产品库存的简单商品，避免前端看不到新建商品
    const includeOutOfStock = req.query.includeOutOfStock === 'true';
    if (!includeOutOfStock) {
      andConditions.push({
        OR: [
          {
            variants: {
              some: {
                stockQuantity: {
                  gt: 0,
                },
              },
            },
          },
          {
            AND: [
              {
                variants: {
                  none: {},
                },
              },
              {
                stockQuantity: {
                  gt: 0,
                },
              },
            ],
          },
        ],
      });
    }

    // Filter by collection
    if (collectionSlug) {
      andConditions.push({
        collectionProducts: {
          some: {
            collection: {
              slug: collectionSlug,
              isActive: true,
            },
          },
        },
      });
    }

    // Filter by category (slug)
    // 修改为包含所有子分类的商品
    if (categorySlug) {
      const categoryIds = await getCategoryIdsIncludingChildren(categorySlug);
      if (categoryIds.length > 0) {
        andConditions.push({
          categoryId: {
            in: categoryIds,
          },
        });
      } else {
        // 如果分类不存在，返回空结果
        andConditions.push({
          categoryId: {
            in: [],
          },
        });
      }
    }

    // Filter by brand
    if (brandFilter.length > 0) {
      andConditions.push({
        brand: {
          name: {
            in: brandFilter,
            mode: 'insensitive',
          },
        },
      });
    }

    // Filter by color (通过 variants)
    if (colorFilter.length > 0) {
      andConditions.push({
        variants: {
          some: {
            color: {
              in: colorFilter.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()), // 首字母大写
            },
          },
        },
      });
    }

    // Filter by size (通过 variants)
    if (sizeFilter.length > 0) {
      andConditions.push({
        variants: {
          some: {
            size: {
              in: sizeFilter,
            },
          },
        },
      });
    }

    // Filter by tags — OR within each dimension, AND across dimensions
    // e.g. (Adult OR Youth) AND (Crew Neck OR V-Neck)
    if (tagsFilter.length > 0) {
      const TAG_DIMENSIONS = {
        audience: ["Adult", "Women's", "Youth", "Unisex"],
        neckline: ['Crew Neck', 'V-Neck', 'Hooded', 'Polo'],
        material: ['Cotton', 'Polyester', 'Fleece', 'Blend'],
        fit: ['Regular', 'Slim', 'Relaxed', 'Oversized'],
      };
      const byDim = {};
      const unmatched = [];
      for (const tag of tagsFilter) {
        let found = false;
        for (const [dim, dimTags] of Object.entries(TAG_DIMENSIONS)) {
          if (dimTags.includes(tag)) {
            if (!byDim[dim]) byDim[dim] = [];
            byDim[dim].push(tag);
            found = true;
            break;
          }
        }
        if (!found) unmatched.push(tag);
      }
      for (const dimTags of Object.values(byDim)) {
        andConditions.push({ tags: { hasSome: dimTags } });
      }
      for (const tag of unmatched) {
        andConditions.push({ tags: { has: tag } });
      }
    }

    // Search by name, description, or SKU
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // 构建缓存key，包含所有筛选条件
    // 添加新的筛选参数到缓存key
    // 价格排序时，缓存键使用 'price' 而不是 'basePrice'，确保缓存正确
    const cacheKey = `products:list:${JSON.stringify({
      page,
      limit,
      collection: collectionSlug || '',
      category: categorySlug || '',
      search: search || '',
      color: colorFilter.join(',') || '',
      brand: brandFilter.join(',') || '',
      size: sizeFilter.join(',') || '',
      tags: tagsFilter.join(',') || '',
      sort: isPriceSort ? 'price' : sortBy, // 价格排序时使用 'price'
      order: sortOrder,
      includeOutOfStock,
    })}`;

    const cachedResponse = await getCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // 如果按价格排序，需要先查询所有产品（在当前筛选条件下），然后按实际价格排序
    // 实际价格 = salePrice（如果有且小于 basePrice）或 basePrice
    const shouldFetchAllForPriceSort = isPriceSort;

    // Execute query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: shouldFetchAllForPriceSort ? 0 : skip, // 价格排序时先查询所有
        take: shouldFetchAllForPriceSort ? undefined : limit, // 价格排序时不限制数量
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          stockQuantity: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
            // 移除 take: 1 限制，返回所有图片
          },
          variants: {
            select: {
              id: true,
              color: true,
              colorHex: true,
              imageUrl: true, // 包含 imageUrl 用于颜色悬停切换
              stockQuantity: true,
            },
            orderBy: { stockQuantity: 'desc' },
          },
          tags: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // 如果按价格排序，需要按实际价格重新排序
    // 实际价格 = salePrice（如果有且小于 basePrice）或 basePrice
    let sortedProducts = products;
    if (isPriceSort) {
      // 计算实际价格的辅助函数
      const getActualPrice = (product) => {
        const basePrice = toNumber(product.basePrice) / 100; // basePrice 从分转换为元
        const salePrice = toNumber(product.salePrice, 0);
        // salePrice 可能是"分"或"元"，需要判断
        const salePriceInDollars = salePrice > 1000 ? salePrice / 100 : salePrice;
        // 如果有有效的 salePrice 且小于 basePrice，使用 salePrice
        return salePriceInDollars > 0 && salePriceInDollars < basePrice ? salePriceInDollars : basePrice;
      };

      // 按实际价格排序
      sortedProducts = products.sort((a, b) => {
        const priceA = getActualPrice(a);
        const priceB = getActualPrice(b);

        if (sortOrder === 'asc') {
          return priceA - priceB;
        } else {
          return priceB - priceA;
        }
      });

      // 重新排序后，应用分页
      sortedProducts = sortedProducts.slice(skip, skip + limit);
    }

    const normalizedProducts = sortedProducts.map((product) => {
      const primaryImage = product.images[0];
      const primaryVariant = product.variants[0];

      // 将图片URL转换为完整的后端服务器URL
      const imageUrl = primaryImage
        ? optimizeImageUrl(primaryImage.url, req)
        : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: {
          base: toNumber(product.basePrice) / 100, // basePrice 从分转换为元
          // salePrice 在数据库中存储为 Decimal(10,2)，单位是"元"，不需要除以 100
          // 但如果历史数据中 salePrice 可能是以"分"存储的，需要兼容处理
          // 检查：如果 salePrice 值很大（> 1000），可能是"分"，需要除以 100；否则是"元"
          sale: (() => {
            const saleValue = toNumber(product.salePrice, 0);
            // 如果 salePrice 值很大，可能是历史数据（以"分"存储），需要除以 100
            // 否则是正常数据（以"元"存储）
            return saleValue > 1000 ? saleValue / 100 : saleValue;
          })(),
          currency: 'CAD',
        },
        primaryImage: imageUrl
          ? {
            url: imageUrl,
            alt: primaryImage.alt || product.name,
          }
          : null,
        // 返回完整的图片数组
        images: (product.images || []).map((image) => ({
          id: image.id || null,
          url: image.url ? (optimizeImageUrl(image.url, req) || image.url) : null,
          alt: image.alt || product.name,
          sortOrder: image.sortOrder || 0,
        })),
        category: product.category
          ? {
            name: product.category.name,
            slug: product.category.slug,
          }
          : null,
        brand: product.brand
          ? {
            name: product.brand.name,
            slug: product.brand.slug,
          }
          : null,
        // 添加variants信息用于颜色显示
        // 包含 imageUrl 字段用于颜色悬停切换图片
        // 修复：确保 imageUrl 正确返回，即使 optimizeImageUrl 返回 null 也使用原始值
        variants: product.variants
          .filter((v) => v.color && v.color.trim() !== '') // 只返回有颜色信息的variant
          .map((v) => {
            let finalImageUrl = null;
            if (v.imageUrl && v.imageUrl.trim() !== '') {
              // 尝试优化 URL，如果失败则使用原始值
              const optimized = optimizeImageUrl(v.imageUrl, req);
              finalImageUrl = optimized || v.imageUrl;
            }
            return {
              color: v.color || null,
              colorHex: v.colorHex || null,
              imageUrl: finalImageUrl, // 包含变体图片URL
            };
          }),
        tags: product.tags || [],
        rating: {
          average: 4.5, // 默认值，可以从reviews计算
          count: 10000, // 默认值
        },
      };
    });

    const response = {
      data: normalizedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await setCache(cacheKey, response, PRODUCT_LIST_CACHE_TTL);

    res.json(response);
  } catch (error) {
    logger.error(' Failed to get products:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });

    // 如果数据库连接失败或查询错误，返回空数组而不是错误
    // 这样可以避免前端因为数据库问题而完全无法工作
    // const isConnectionError = error.code === 'P1001' || 
    //                          error.code === 'P2002' || 
    //                          error.code === 'P2021' || // Table does not exist
    //                          error.message.includes('connect') || 
    //                          error.message.includes('timeout') ||
    //                          error.message.includes('does not exist');

    // if (isConnectionError) {
    //  logger.warn(' Database connection/table issue, returning empty products list');
    //  // 修复：确保 limit 变量已定义
    //   const defaultLimit = parseInt(req.query.limit, 10) || 20;
    //   return res.json({
    //     data: [],
    //     pagination: {
    //       page: 1,
    //       limit: defaultLimit,
    //       total: 0,
    //       totalPages: 0,
    //     },
    //   });
    // }

    // // 对于其他查询错误，也返回空数组（可能是数据不存在）
    // // 这样可以避免前端因为数据问题而完全无法工作
    // logger.warn(' Query error, returning empty products list to prevent frontend failure');
    // // 修复：确保 limit 变量已定义
    // const defaultLimit = parseInt(req.query.limit, 10) || 20;
    // return res.json({
    //   data: [],
    //   pagination: {
    //     page: 1,
    //     limit: defaultLimit,
    //     total: 0,
    //     totalPages: 0,
    //   },
    // });

    // 保留原始错误响应代码（注释掉，改为返回空数组）

    const errorResponse = {
      error: 'Server Error',
      message: 'Failed to fetch products',
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
      errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);

  }
};

/**
 * Get product by slug
 * GET /api/products/:slug
 */
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const cacheKey = `products:detail:${slug}`;
    const cachedProduct = await getCache(cacheKey);

    if (cachedProduct) {
      return res.json(cachedProduct);
    }

    // 修复：Product id 是 UUID，不是数字，应该始终使用 slug 查找
    // 之前代码错误地尝试将数字 slug 当作 id 查找，导致 Prisma 查询失败
    // 增加：支持通过 id 查找（回退方案），以支持 /products/[uuid] 格式
    let product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        longDescription: true,
        basePrice: true,
        salePrice: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            color: true,
            colorHex: true,
            size: true,
            priceAdjustment: true,
            stockQuantity: true,
            imageUrl: true,
          },
          orderBy: [{ size: 'asc' }, { color: 'asc' }],
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            isVerifiedPurchase: true,
            createdAt: true,
          },
        },
        collectionProducts: {
          select: {
            collection: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // 如果 slug 没找到，且 slug 看起来像个 UUID，尝试按 id 查找
    if (!product && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
      logger.info('Product not found by slug, trying by ID', { id: slug });
      product = await prisma.product.findUnique({
        where: { id: slug },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          longDescription: true,
          basePrice: true,
          salePrice: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
          variants: {
            select: {
              id: true,
              sku: true,
              color: true,
              colorHex: true,
              size: true,
              priceAdjustment: true,
              stockQuantity: true,
              imageUrl: true,
            },
            orderBy: [{ size: 'asc' }, { color: 'asc' }],
          },
          reviews: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              rating: true,
              title: true,
              comment: true,
              isVerifiedPurchase: true,
              createdAt: true,
            },
          },
          collectionProducts: {
            select: {
              collection: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
    }

    if (!product) {
      logger.info('Product not found', { slug: req.params.slug });
      return res.status(404).json({ error: 'Product not found' });
    }

    // 防御性检查：确保产品数据完整
    if (!product.id) {
      logger.error('Product data incomplete: missing id', { slug: req.params.slug, product });
      return res.status(500).json({ error: 'Product data is incomplete' });
    }

    // 安全地获取评分数据，避免查询失败导致整个请求失败
    let avgRating = { _avg: { rating: null }, _count: { rating: 0 } };
    try {
      avgRating = await prisma.productReview.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
        _count: { rating: true },
      });
    } catch (ratingError) {
      logger.warn('Failed to fetch product rating', {
        productId: product.id,
        error: ratingError.message,
        code: ratingError.code,
      });
      // 继续执行，使用默认值
    }

    // Fetch global size fees for synchronization
    const globalFeeMap = await getGlobalFeeMap();

    // 防御性处理关联数据，避免 null/undefined 导致错误
    const formattedProduct = {
      id: product.id,
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || null,
      longDescription: product.longDescription || null,
      basePrice: toNumber(product.basePrice, 0),
      price: {
        base: toNumber(product.basePrice, 0) / 100, // basePrice 从分转换为元
        // salePrice 在数据库中存储为 Decimal(10,2)，单位是"元"，不需要除以 100
        // 但如果历史数据中 salePrice 可能是以"分"存储的，需要兼容处理
        sale: (() => {
          const saleValue = toNumber(product.salePrice, 0);
          const baseValue = toNumber(product.basePrice, 0) / 100;
          // 如果 salePrice 值很大（> 1000），可能是历史数据（以"分"存储），需要除以 100
          // 否则是正常数据（以"元"存储）
          return saleValue > 1000 ? saleValue / 100 : saleValue;
        })(),
        currency: 'CAD',
        onSale: (() => {
          const sale = toNumber(product.salePrice, 0);
          const base = toNumber(product.basePrice, 0);
          // 比较时需要统一单位（都转换为元）
          const saleInYuan = sale > 1000 ? sale / 100 : sale;
          const baseInYuan = base / 100;
          return saleInYuan > 0 && saleInYuan !== baseInYuan;
        })(),
      },
      category: product.category || null,
      brand: product.brand || null,
      images: (product.images || []).map((image) => ({
        id: image.id,
        url: image.url ? (optimizeImageUrl(image.url, { width: 1280, quality: 85, req }) || image.url) : null,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder || 0,
      })),
      variants: (product.variants || []).map((variant) => {
        // Synchronize with global size fee config
        const globalFee = variant.size ? globalFeeMap[variant.size] : undefined;
        // CRITICAL: Use global fee if configured, otherwise default to 0 for "base sizes"
        // This ensures XS-XL don't have stray fees if not in the global table
        const effectiveAdjustment = globalFee !== undefined ? globalFee : 0;

        return {
          id: variant.id,
          sku: variant.sku || null,
          color: variant.color || null,
          colorHex: variant.colorHex || null,
          size: variant.size || null,
          stockQuantity: variant.stockQuantity || 0,
          priceAdjustment: effectiveAdjustment,
          price: (toNumber(product.basePrice, 0) + effectiveAdjustment) / 100,
          imageUrl: variant.imageUrl ? (optimizeImageUrl(variant.imageUrl, { width: 640, quality: 80, req }) || variant.imageUrl) : null,
        };
      }),
      rating: {
        average: Number(avgRating._avg.rating || 0),
        count: Number(avgRating._count.rating || 0),
      },
      reviews: product.reviews || [],
      collections: (product.collectionProducts || []).map((item) => item.collection).filter(Boolean),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    formattedProduct.primaryImage = formattedProduct.images.length
      ? formattedProduct.images[0]
      : null;

    // Constructed baseImages for Design Lab compatibility
    const fallbackImage = formattedProduct.primaryImage?.url || '/assets/hero/hero-card-tee.jpg';
    const optimizedImages = formattedProduct.images.map(img => img.url);

    formattedProduct.baseImages = {
      front: fallbackImage,
      back: optimizedImages[1] || fallbackImage,
      sleeve: optimizedImages[2] || fallbackImage,
      'left-sleeve': optimizedImages[3] || fallbackImage, // Additional views if available
      'right-sleeve': optimizedImages[4] || fallbackImage
    };

    await setCache(cacheKey, formattedProduct, PRODUCT_DETAIL_CACHE_TTL);

    res.json(formattedProduct);
  } catch (error) {
    // 增强错误日志，记录 Prisma 错误代码和元数据
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      slug: req.params.slug,
      code: error.code,
      meta: error.meta,
      name: error.name,
    };

    logger.error('Failed to fetch product by slug', errorDetails);

    // 区分不同类型的错误
    // Prisma P2025: Record not found (应该返回 404)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Prisma P1001: Connection error
    if (error.code === 'P1001') {
      logger.error('Database connection error', errorDetails);
      return res.status(503).json({
        error: 'Database connection failed',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      });
    }

    // 其他错误返回 500
    res.status(500).json({
      error: 'Failed to fetch product',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        code: error.code,
        meta: error.meta,
      }),
    });
  }
};

/**
 * Get related products by category
 * GET /api/products/:slug/related?limit=4
* Added for product detail page recommendations
 */
exports.getRelatedProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    // 修复：Product id 是 UUID，不是数字，应该始终使用 slug 查找
    const currentProduct = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true, brandId: true },
    });

    if (!currentProduct) {
      logger.info('Product not found for related products', { slug });
      return res.status(404).json({ error: 'Product not found' });
    }

    // 检查 categoryId 是否为 null，如果为 null 则返回空数组
    if (!currentProduct.categoryId) {
      logger.warn('Product has no categoryId, returning empty related products', {
        productId: currentProduct.id,
        slug,
      });
      return res.json({ data: [] });
    }

    const cacheKey = `products:related:${slug}:${limit}`;
    const cachedRelated = await getCache(cacheKey);

    if (cachedRelated) {
      return res.json({ data: cachedRelated });
    }

    const candidateProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
      },
      select: { id: true },
      take: limit * 2,
    });

    const productIds = candidateProducts.map((p) => p.id);

    // 安全地获取评分统计，避免查询失败
    let ratingStats = [];
    if (productIds.length > 0) {
      try {
        ratingStats = await prisma.productReview.groupBy({
          by: ['productId'],
          where: {
            productId: { in: productIds },
          },
          _avg: { rating: true },
          _count: true,
        });
      } catch (ratingError) {
        logger.warn('Failed to fetch rating stats for related products', {
          productIds,
          error: ratingError.message,
          code: ratingError.code,
        });
        // 继续执行，使用空数组
      }
    }

    const ratingMap = new Map();
    ratingStats.forEach((stat) => {
      ratingMap.set(stat.productId, {
        avgRating: Number(stat._avg.rating || 0),
        reviewCount: Number(stat._count || 0),
      });
    });

    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
      },
      take: limit * 2,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            url: true,
            alt: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        variants: {
          select: {
            id: true,
            stockQuantity: true,
          },
          orderBy: { stockQuantity: 'desc' },
          take: 1,
        },
      },
    });

    const productsWithScore = relatedProducts.map((product) => {
      const rating = ratingMap.get(product.id) || { avgRating: 0, reviewCount: 0 };
      const stockQuantity = product.variants?.[0]?.stockQuantity || 0;

      const ratingScore = (rating.avgRating / 5) * 0.4;
      const reviewScore = Math.min(Math.log10(rating.reviewCount + 1) / 10, 1) * 0.2;
      const stockScore = (stockQuantity > 0 ? 1 : 0) * 0.2;
      const randomScore = Math.random() * 0.2;

      const recommendationScore = ratingScore + reviewScore + stockScore + randomScore;

      return {
        ...product,
        recommendationScore,
        rating: {
          average: rating.avgRating,
          count: rating.reviewCount,
        },
      };
    });

    const topProducts = productsWithScore
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    const formattedRelated = topProducts.map((product) => {
      const images = (product.images || []).map((image) => ({
        url: optimizeImageUrl(image.url, { width: 480, quality: 80, req }) || image.url,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder,
      }));

      const primaryImage = images.length ? images[0] : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        basePrice: toNumber(product.basePrice, 0),
        price: {
          base: toNumber(product.basePrice, 0) / 100, // basePrice 从分转换为元
          // salePrice 在数据库中存储为 Decimal(10,2)，单位是"元"，不需要除以 100
          // 但如果历史数据中 salePrice 可能是以"分"存储的，需要兼容处理
          sale: (() => {
            const saleValue = toNumber(product.salePrice, 0);
            // 如果 salePrice 值很大（> 1000），可能是历史数据（以"分"存储），需要除以 100
            // 否则是正常数据（以"元"存储）
            return saleValue > 1000 ? saleValue / 100 : saleValue;
          })(),
          currency: 'CAD',
        },
        category: product.category,
        images,
        primaryImage,
        thumbnail: primaryImage,
        stockStatus: product.variants?.[0]?.stockQuantity > 0 ? 'in_stock' : 'out_of_stock',
        rating: product.rating,
      };
    });

    await setCache(cacheKey, formattedRelated, PRODUCT_LIST_CACHE_TTL);

    res.json({ data: formattedRelated });
  } catch (error) {
    // 增强错误日志，记录 Prisma 错误代码和元数据
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      slug: req.params.slug,
      limit: req.query.limit,
      code: error.code,
      meta: error.meta,
      name: error.name,
    };

    logger.error('Failed to fetch related products', errorDetails);

    // 区分不同类型的错误
    // Prisma P2025: Record not found (应该返回 404)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Prisma P1001: Connection error
    if (error.code === 'P1001') {
      logger.error('Database connection error in getRelatedProducts', errorDetails);
      return res.status(503).json({
        error: 'Database connection failed',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      });
    }

    // 其他错误返回 500，但返回空数组以避免前端完全失败
    logger.error('Returning empty array due to error in getRelatedProducts', errorDetails);
    res.status(500).json({
      error: 'Failed to fetch related products',
      data: [], // 返回空数组，避免前端完全失败
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        code: error.code,
        meta: error.meta,
      }),
    });
  }
};

/**
* Provide product base images via variantId for Design Lab
 * GET /api/products/variant/:variantId
 */
// 添加详细日志用于调试
exports.getProductByVariantId = async (req, res) => {
  const timestamp = new Date().toISOString();
  const { variantId } = req.params;

  console.log('[Backend] ===== getProductByVariantId START =====', {
    variantId,
    timestamp,
    url: req.url,
    method: req.method
  });

  if (!variantId) {
    console.warn('[Backend] Missing variantId', { timestamp });
    return res.status(400).json({ error: 'variantId is required' });
  }

  try {
    console.log('[Backend] Querying database for variant:', { variantId, timestamp });
    let variant = await prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
            variants: true,
          },
        },
      },
    });

    // FALLBACK: If not found as variant, check if it's a productId
    let productFallback = null;
    if (!variant) {
      console.log('[Backend] Not found as variant, checking as product ID:', { variantId, timestamp });
      productFallback = await prisma.product.findUnique({
        where: { id: variantId },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: true,
        }
      });

      if (productFallback && productFallback.variants && productFallback.variants.length > 0) {
        // Prioritize 'White' variant as default, otherwise usage alphabetical/stock sort
        let defaultVariant = productFallback.variants.find(v => v.color === 'White');

        if (!defaultVariant) {
          // If no White, try to find one with high stock
          defaultVariant = productFallback.variants.sort((a, b) => b.stockQuantity - a.stockQuantity)[0];
        }

        variant = {
          ...defaultVariant,
          product: productFallback
        };
        console.log('[Backend] Found as product, using best variant:', {
          productId: productFallback.id,
          variantId: variant.id,
          color: variant.color,
          timestamp
        });
      }
    }

    if (!variant || !variant.product) {
      console.warn('[Backend] Variant/Product not found in database:', {
        variantId,
        variantExists: !!variant,
        productExists: variant ? !!variant.product : false,
        foundProductFallback: !!productFallback,
        variantsCount: productFallback?.variants?.length,
        timestamp
      });
      return res.status(404).json({
        error: 'Variant not found',
        debug: {
          variantId,
          foundAsVariant: false,
          foundAsProduct: !!productFallback,
          variantsCount: productFallback?.variants?.length || 0
        }
      });
    }

    console.log('[Backend] Variant found:', {
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      timestamp
    });

    const product = variant.product;
    const optimizedImages = (product.images || [])
      .map((img) => (img?.url ? optimizeImageUrl(img.url, req) : null))
      .filter(Boolean);

    const fallbackImage =
      variant.imageUrl ||
      optimizedImages[0] ||
      '/assets/hero/hero-card-tee.jpg';

    // Use exact indices from uploaded order
    // 0: Front, 1: Back, 2: Left Sleeve, 3: Right Sleeve
    const baseImages = {
      front: optimizedImages[0] || fallbackImage,
      back: optimizedImages[1] || null, // Don't fallback to front
      sleeve: optimizedImages[2] || null, // Legacy support
      'left-sleeve': optimizedImages[2] || null,
      'right-sleeve': optimizedImages[3] || null,
    };

    const colors = Array.from(
      new Set(
        (product.variants || [])
          .map((v) => v.color)
          .filter((color) => color && color.trim() !== '')
      )
    );

    // 构建颜色详细信息（包含 hex、可用尺寸等）
    const colorDetails = [];
    const colorMap = new Map();

    (product.variants || []).forEach((v) => {
      if (v.color && v.color.trim() !== '') {
        const colorName = v.color;
        if (!colorMap.has(colorName)) {
          colorMap.set(colorName, {
            name: colorName,
            hex: v.colorHex || '#cccccc',
            sizes: new Set(),
            isAvailable: (v.stockQuantity || 0) > 0,
          });
        }
        const colorInfo = colorMap.get(colorName);
        if (v.size) {
          colorInfo.sizes.add(v.size);
        }
        // 如果任何一个变体有库存，则认为颜色可用
        if ((v.stockQuantity || 0) > 0) {
          colorInfo.isAvailable = true;
        }
      }
    });

    // 转换为数组格式
    colorMap.forEach((colorInfo) => {
      colorDetails.push({
        name: colorInfo.name,
        hex: colorInfo.hex,
        availableSizes: Array.from(colorInfo.sizes).sort(),
        isAvailable: colorInfo.isAvailable,
      });
    });

    // Fetch global size fees for synchronization
    const globalFeeMap = await getGlobalFeeMap();

    const response = {
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      color: variant.color || null,
      colors,
      colorDetails, // 添加颜色详细信息
      baseImages,
      gallery: optimizedImages,
      variants: product.variants.map((v) => {
        // Synchronize with global size fee config
        const globalFee = v.size ? globalFeeMap[v.size] : undefined;
        // CRITICAL: Use global fee if configured, otherwise default to 0 for "base sizes"
        const effectiveAdjustment = globalFee !== undefined ? globalFee : 0;

        return {
          id: v.id,
          color: v.color,
          colorHex: v.colorHex,
          imageUrl: v.imageUrl,
          size: v.size,
          stockQuantity: v.stockQuantity,
          priceAdjustment: effectiveAdjustment,
        };
      }), // 添加变体列表，用于颜色切换
    };

    console.log('[Backend] Sending response:', {
      productId: response.productId,
      productName: response.productName,
      variantId: response.variantId,
      colorsCount: response.colors.length,
      galleryCount: response.gallery.length,
      timestamp
    });

    console.log('[Backend] ===== getProductByVariantId SUCCESS =====', { timestamp });
    res.json(response);
  } catch (error) {
    console.error('[Backend] ===== getProductByVariantId ERROR =====', {
      error: error.message,
      stack: error.stack,
      variantId,
      timestamp
    });
    logger.error('Failed to fetch product by variantId', {
      error: error.message,
      variantId,
    });
    res.status(500).json({ error: 'Failed to fetch product by variantId' });
  }
};
/**
 * GET /api/products/tag-taxonomy
 * Returns the TAG_TAXONOMY config so frontend can build filter UI dynamically.
 * Also returns per-tag product counts from the database.
 */
exports.getTagTaxonomy = async (req, res) => {
  try {
    const TAG_TAXONOMY = {
      garmentType: {
        label: '服装类型',
        tags: ['T-Shirt', 'Hoodie', 'Crewneck Sweatshirt', 'Long-Sleeve T-Shirt', 'Polo Shirt', 'V-Neck T-Shirt'],
      },
      audience: {
        label: '适用人群',
        tags: ['Adult', "Women's", 'Youth', 'Unisex'],
      },
      neckline: {
        label: '领型 / 款式',
        tags: ['Crew Neck', 'V-Neck', 'Hooded', 'Polo'],
      },
      material: {
        label: '材质',
        tags: ['Cotton', 'Poly-Cotton'],
      },
      fit: {
        label: '版型',
        tags: ['Classic Fit', 'Fitted'],
      },
    };

    // All unique tags across all dimensions
    const allTags = Object.values(TAG_TAXONOMY).flatMap(d => d.tags);

    // Count products per tag using Prisma hasSome
    const tagCounts = {};
    await Promise.all(
      allTags.map(async (tag) => {
        const count = await prisma.product.count({
          where: {
            isActive: true,
            isSystem: false,
            deleted: false,
            tags: { has: tag },
          },
        });
        tagCounts[tag] = count;
      })
    );

    // Attach counts to each dimension
    const result = Object.fromEntries(
      Object.entries(TAG_TAXONOMY).map(([key, dim]) => [
        key,
        {
          label: dim.label,
          tags: dim.tags.map(tag => ({ tag, count: tagCounts[tag] ?? 0 })),
        },
      ])
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to get tag taxonomy', { error: error.message });
    res.status(500).json({ error: 'Failed to get tag taxonomy' });
  }
};
