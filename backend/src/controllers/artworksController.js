/**
 * Artworks Controller
* 艺术作品 CRUD 操作，支持分类树、分页、搜索
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const gcsUtils = require('../utils/gcsStorage');

const prisma = new PrismaClient();

// Dev 稳定性：当艺术素材表未迁移时，降级为返回空数据（避免前端 ArtPanel 报 500）
const isMissingArtworkTablesError = (error) => {
  const message = String(error?.message || '');
  const code = String(error?.code || '');

  // Prisma 常见：P2021（table does not exist）或底层报错信息包含 "does not exist"
  const looksLikeMissingTable =
    code === 'P2021' ||
    message.includes('does not exist') ||
    message.includes('does not exist in the current database');

  if (!looksLikeMissingTable) return false;

  // 只针对 art 相关表
  return (
    message.includes('artwork_categories') ||
    message.includes('art_assets') ||
    message.includes('public.artwork_categories') ||
    message.includes('public.art_assets')
  );
};

/**
* Get artworks with pagination, filtering, and search
 * GET /api/artworks?top=emojis&sub=animals&query=lion&page=1&pageSize=48
 */
exports.getArtworks = async (req, res) => {
  try {
    const { page = 1, limit = 48, search, topCategory, subCategory } = req.query;

    const where = {
      is_active: true,
      status: 'active',
    };

    // 分类过滤
    if (topCategory || subCategory) {
      const categoryWhere = {};

      if (topCategory) {
        const foundTopCategory = await prisma.artwork_categories.findUnique({
          where: { slug: topCategory },
        });
        if (foundTopCategory) {
          categoryWhere.top_category_id = foundTopCategory.id;
        }
      }

      if (subCategory) {
        const foundSubCategory = await prisma.artwork_categories.findUnique({
          where: { slug: subCategory },
        });
        if (foundSubCategory) {
          categoryWhere.sub_category_id = foundSubCategory.id;
        }
      }

      Object.assign(where, categoryWhere);
    }

    // 搜索过滤（名称、标签）
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [artworks, total] = await Promise.all([
      prisma.art_assets.findMany({
        where,
        skip,
        take,
        orderBy: [
          { sort_order: 'asc' },
          { created_at: 'desc' },
        ],
        include: {
          top_category: {
            select: { id: true, name: true, slug: true },
          },
          sub_category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.art_assets.count({ where }),
    ]);

    // 格式化响应
    // 修复：只有当 gcs_key 存在时才使用 GCS URL，否则直接使用 image_url（支持外部 URL）
    const formattedArtworks = artworks.map(artwork => {
      let imageUrl = artwork.image_url; // 默认使用 image_url（可能是外部 URL）
      let thumbnailUrl = artwork.thumbnail_url;

      // 如果存在 gcs_key，尝试构建 GCS URL（需要 GCS 配置）
      if (artwork.gcs_key) {
        try {
          const baseUrl = gcsUtils.getImageBaseUrl();
          imageUrl = `${baseUrl}/${artwork.gcs_key}`;
          thumbnailUrl = artwork.thumbnail_url || `${baseUrl}/${artwork.gcs_key.replace(/\.(png|jpg|jpeg|svg)$/i, '@200x200.jpg')}`;
        } catch (error) {
          // GCS 配置缺失时，回退到 image_url（外部 URL）
          console.warn(`[getArtworks] GCS not configured, using image_url for artwork ${artwork.id}:`, error.message);
          // imageUrl 和 thumbnailUrl 保持默认值（使用 image_url）
        }
      }

      return {
        id: artwork.id,
        title: artwork.name,
        slug: artwork.slug,
        description: artwork.description,
        imageUrl,
        thumbnailUrl,
        width: artwork.width,
        height: artwork.height,
        tags: artwork.tags,
        license: artwork.license,
        attribution: artwork.attribution,
        topCategory: artwork.top_category ? {
          id: artwork.top_category.id,
          name: artwork.top_category.name,
          slug: artwork.top_category.slug,
        } : null,
        subCategory: artwork.sub_category ? {
          id: artwork.sub_category.id,
          name: artwork.sub_category.name,
          slug: artwork.sub_category.slug,
        } : null,
      };
    });

    res.json({
      success: true,
      data: formattedArtworks,
      pagination: {
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // Dev 降级：表未创建时返回空列表，避免页面报 500（生产环境仍返回 500）
    if (process.env.NODE_ENV === 'development' && isMissingArtworkTablesError(error)) {
      console.warn('[getArtworks] Missing artwork tables in dev DB, returning empty data:', error?.message);
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(req.query.page || 1, 10),
          pageSize: parseInt(req.query.pageSize || 48, 10),
          total: 0,
          totalPages: 0,
        },
      });
    }

    logger.error('[getArtworks] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artworks',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
* Get categories tree with counts
 * GET /api/artworks/categories/tree
 */
exports.getCategoriesTree = async (req, res) => {
  try {
    // 获取所有一级分类
    const topCategories = await prisma.artwork_categories.findMany({
      where: {
        parent_id: null,
        is_active: true,
      },
      orderBy: { sort_order: 'asc' },
    });

    // 获取所有二级分类
    const subCategories = await prisma.artwork_categories.findMany({
      where: {
        parent_id: { not: null },
        is_active: true,
      },
      orderBy: { sort_order: 'asc' },
    });

    // 构建树状结构并计算计数
    const tree = await Promise.all(
      topCategories.map(async (topCategory) => {
        const children = subCategories
          .filter(sub => sub.parent_id === topCategory.id)
          .map(sub => ({ id: sub.id, name: sub.name, slug: sub.slug }));

        // 计算一级分类下的素材总数
        const topCount = await prisma.art_assets.count({
          where: {
            top_category_id: topCategory.id,
            is_active: true,
            status: 'active',
          },
        });

        // 计算每个二级分类的计数
        const childrenWithCounts = await Promise.all(
          children.map(async (child) => {
            const subCategory = subCategories.find(s => s.id === child.id);
            const count = await prisma.art_assets.count({
              where: {
                sub_category_id: subCategory.id,
                is_active: true,
                status: 'active',
              },
            });
            return { ...child, count };
          })
        );

        return {
          id: topCategory.id,
          name: topCategory.name,
          slug: topCategory.slug,
          count: topCount,
          children: childrenWithCounts,
        };
      })
    );

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    // Dev 降级：表未创建时返回空分类树，避免前端 ArtPanel 报错阻断
    if (process.env.NODE_ENV === 'development' && isMissingArtworkTablesError(error)) {
      console.warn('[getCategoriesTree] Missing artwork tables in dev DB, returning empty tree:', error?.message);
      return res.json({
        success: true,
        data: [],
      });
    }

    logger.error('[getCategoriesTree] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories tree',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
* Get single artwork
 * GET /api/artworks/:id
 */
exports.getArtwork = async (req, res) => {
  try {
    const { id } = req.params;

    // Manual UUID check or simple length check to avoid Prisma errors on bad input
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    const artwork = await prisma.art_assets.findUnique({
      where: { id },
      include: {
        top_category: {
          select: { id: true, name: true, slug: true },
        },
        sub_category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: 'Artwork not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: artwork.id,
        title: artwork.name,
        slug: artwork.slug,
        description: artwork.description,
        imageUrl: (() => {
          if (artwork.gcs_key) {
            try {
              return `${gcsUtils.getImageBaseUrl()}/${artwork.gcs_key}`;
            } catch (error) {
              console.warn(`[getArtwork] GCS not configured, using image_url:`, error.message);
              return artwork.image_url;
            }
          }
          return artwork.image_url;
        })(),
        thumbnailUrl: artwork.thumbnail_url,
        width: artwork.width,
        height: artwork.height,
        tags: artwork.tags,
        license: artwork.license,
        attribution: artwork.attribution,
        topCategory: artwork.top_category,
        subCategory: artwork.sub_category,
      },
    });
  } catch (error) {
    logger.error('[getArtwork] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artwork',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
