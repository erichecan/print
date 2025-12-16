/**
 * Artworks Controller
 * [2025-12-11 23:30:00] 艺术作品 CRUD 操作，支持分类树、分页、搜索
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const gcsUtils = require('../utils/gcsStorage');

const prisma = new PrismaClient();

/**
 * [2025-12-11 23:30:00] Get artworks with pagination, filtering, and search
 * GET /api/artworks?top=emojis&sub=animals&query=lion&page=1&pageSize=48
 */
exports.getArtworks = async (req, res) => {
  try {
    const {
      top,           // 一级分类 slug
      sub,           // 二级分类 slug
      query,         // 搜索关键词
      page = 1,      // 页码
      pageSize = 48, // 每页数量
    } = req.query;

    const where = {
      is_active: true,
      status: 'active',
    };

    // [2025-12-11 23:30:00] 分类过滤
    if (top || sub) {
      const categoryWhere = {};
      
      if (top) {
        const topCategory = await prisma.artwork_categories.findUnique({
          where: { slug: top },
        });
        if (topCategory) {
          categoryWhere.top_category_id = topCategory.id;
        }
      }
      
      if (sub) {
        const subCategory = await prisma.artwork_categories.findUnique({
          where: { slug: sub },
        });
        if (subCategory) {
          categoryWhere.sub_category_id = subCategory.id;
        }
      }
      
      Object.assign(where, categoryWhere);
    }

    // [2025-12-11 23:30:00] 搜索过滤（名称、标签）
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

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

    // [2025-12-11 23:30:00] 格式化响应
    // [2025-01-30 13:15:00] 修复：只有当 gcs_key 存在时才使用 GCS URL，否则直接使用 image_url（支持外部 URL）
    const formattedArtworks = artworks.map(artwork => {
      let imageUrl = artwork.image_url; // 默认使用 image_url（可能是外部 URL）
      let thumbnailUrl = artwork.thumbnail_url;
      
      // [2025-01-30 13:15:00] 如果存在 gcs_key，尝试构建 GCS URL（需要 GCS 配置）
      if (artwork.gcs_key) {
        try {
          const baseUrl = gcsUtils.getImageBaseUrl();
          imageUrl = `${baseUrl}/${artwork.gcs_key}`;
          thumbnailUrl = artwork.thumbnail_url || `${baseUrl}/${artwork.gcs_key.replace(/\.(png|jpg|jpeg|svg)$/i, '@200x200.jpg')}`;
        } catch (error) {
          // [2025-01-30 13:15:00] GCS 配置缺失时，回退到 image_url（外部 URL）
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
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    logger.error('[getArtworks] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artworks',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * [2025-12-11 23:30:00] Get categories tree with counts
 * GET /api/artworks/categories/tree
 */
exports.getCategoriesTree = async (req, res) => {
  try {
    // [2025-12-11 23:30:00] 获取所有一级分类
    const topCategories = await prisma.artwork_categories.findMany({
      where: {
        parent_id: null,
        is_active: true,
      },
      orderBy: { sort_order: 'asc' },
    });

    // [2025-12-11 23:30:00] 获取所有二级分类
    const subCategories = await prisma.artwork_categories.findMany({
      where: {
        parent_id: { not: null },
        is_active: true,
      },
      orderBy: { sort_order: 'asc' },
    });

    // [2025-12-11 23:30:00] 构建树状结构并计算计数
    const tree = await Promise.all(
      topCategories.map(async (topCategory) => {
        const children = subCategories
          .filter(sub => sub.parent_id === topCategory.id)
          .map(sub => ({ id: sub.id, name: sub.name, slug: sub.slug }));

        // [2025-12-11 23:30:00] 计算一级分类下的素材总数
        const topCount = await prisma.art_assets.count({
          where: {
            top_category_id: topCategory.id,
            is_active: true,
            status: 'active',
          },
        });

        // [2025-12-11 23:30:00] 计算每个二级分类的计数
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
    logger.error('[getCategoriesTree] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories tree',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * [2025-12-11 23:30:00] Get single artwork
 * GET /api/artworks/:id
 */
exports.getArtwork = async (req, res) => {
  try {
    const { id } = req.params;

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
