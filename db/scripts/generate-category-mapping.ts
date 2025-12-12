/**
 * 分类映射脚本
 * [2025-12-11 09:21:35] 基于现有产品属性生成分类映射（参考 Custom Ink 分类体系）
 * 
 * 用法:
 *   --dry-run: 预览将要创建的分类和映射（不实际写入数据库）
 *   --apply: 实际创建/更新分类和映射
 *   --export: 导出树状分类清单到 markdown 文档
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// [2025-12-11 09:21:35] 参考 Custom Ink 的分类体系
const CATEGORY_MAPPING = {
  // 一级分类
  'Apparel': {
    slug: 'apparel',
    sortOrder: 1,
    children: {
      'T-Shirts': {
        slug: 't-shirts',
        sortOrder: 1,
        children: {
          'Short Sleeve T-shirts': { slug: 'short-sleeve-t-shirts', sortOrder: 1 },
          'Long Sleeve T-shirts': { slug: 'long-sleeve-t-shirts', sortOrder: 2 },
          'Tank Tops': { slug: 'tank-tops', sortOrder: 3 },
          "Women's T-shirts": { slug: 'womens-t-shirts', sortOrder: 4 },
          "Kids & Youth T-shirts": { slug: 'kids-youth-t-shirts', sortOrder: 5 },
          'Performance T-shirts': { slug: 'performance-t-shirts', sortOrder: 6 },
        },
      },
      'Sweatshirts': {
        slug: 'sweatshirts',
        sortOrder: 2,
        children: {
          'Hoodies': { slug: 'hoodies', sortOrder: 1 },
          'Crewneck Sweatshirts': { slug: 'crewneck-sweatshirts', sortOrder: 2 },
          'Full Zip Sweatshirts': { slug: 'full-zip-sweatshirts', sortOrder: 3 },
          'Quarter Zip Sweatshirts': { slug: 'quarter-zip-sweatshirts', sortOrder: 4 },
        },
      },
      "Women's": {
        slug: 'womens',
        sortOrder: 3,
        children: {
          "Women's T-shirts": { slug: 'womens-t-shirts', sortOrder: 1 },
          "Women's Sweatshirts": { slug: 'womens-sweatshirts', sortOrder: 2 },
          "Women's Tanks": { slug: 'womens-tanks', sortOrder: 3 },
        },
      },
      'Kids & Youth': {
        slug: 'kids-youth',
        sortOrder: 4,
        children: {
          "Kids T-shirts": { slug: 'kids-t-shirts', sortOrder: 1 },
          "Kids Sweatshirts": { slug: 'kids-sweatshirts', sortOrder: 2 },
        },
      },
      'Performance': {
        slug: 'performance',
        sortOrder: 5,
        children: {
          'Performance T-shirts': { slug: 'performance-t-shirts', sortOrder: 1 },
          'Performance Polos': { slug: 'performance-polos', sortOrder: 2 },
        },
      },
      'Polos': {
        slug: 'polos',
        sortOrder: 6,
        children: {},
      },
      'Hats': {
        slug: 'hats',
        sortOrder: 7,
        children: {
          'Baseball Hats': { slug: 'baseball-hats', sortOrder: 1 },
          'Beanies': { slug: 'beanies', sortOrder: 2 },
          'Trucker Hats': { slug: 'trucker-hats', sortOrder: 3 },
        },
      },
      'Accessories': {
        slug: 'accessories',
        sortOrder: 8,
        children: {
          'Bags': { slug: 'bags', sortOrder: 1 },
          'Drinkware': { slug: 'drinkware', sortOrder: 2 },
        },
      },
    },
  },
};

// [2025-12-11 09:21:35] 从名称生成 slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// [2025-12-11 09:21:35] 确保分类存在
async function ensureCategory(
  name: string,
  slug: string,
  parentId: string | null,
  sortOrder: number,
  isDryRun: boolean
): Promise<string> {
  const existing = await prisma.category.findUnique({
    where: { slug },
  });

  if (existing) {
    if (!isDryRun) {
      await prisma.category.update({
        where: { slug },
        data: {
          name,
          parentId,
          sortOrder,
          isActive: true,
        },
      });
    }
    console.log(`  ✅ ${isDryRun ? '[DRY-RUN]' : ''} 更新分类: ${name} (${slug})`);
    return existing.id;
  } else {
    if (!isDryRun) {
      const created = await prisma.category.create({
        data: {
          name,
          slug,
          parentId,
          sortOrder,
          isActive: true,
        },
      });
      console.log(`  ✅ ${isDryRun ? '[DRY-RUN]' : ''} 创建分类: ${name} (${slug})`);
      return created.id;
    } else {
      console.log(`  ✅ [DRY-RUN] 将创建分类: ${name} (${slug})`);
      return 'dry-run-id';
    }
  }
}

// [2025-12-11 09:21:35] 递归创建分类树
async function createCategoryTree(
  mapping: any,
  parentId: string | null = null,
  isDryRun: boolean = false
): Promise<Record<string, string>> {
  const categoryIds: Record<string, string> = {};

  for (const [name, config] of Object.entries(mapping)) {
    const slug = (config as any).slug || generateSlug(name);
    const sortOrder = (config as any).sortOrder || 0;
    const children = (config as any).children || {};

    const categoryId = await ensureCategory(name, slug, parentId, sortOrder, isDryRun);
    categoryIds[slug] = categoryId;

    if (Object.keys(children).length > 0) {
      const childIds = await createCategoryTree(children, categoryId, isDryRun);
      Object.assign(categoryIds, childIds);
    }
  }

  return categoryIds;
}

// [2025-12-11 09:21:35] 根据产品名称/描述匹配分类
function matchProductToCategories(product: any): string[] {
  const categorySlugs: string[] = [];
  const name = (product.name || '').toLowerCase();
  const description = (product.description || '').toLowerCase();

  // T-Shirts
  if (name.includes('t-shirt') || name.includes('tee') || name.includes('tshirt')) {
    if (name.includes('long sleeve') || name.includes('long-sleeve')) {
      categorySlugs.push('long-sleeve-t-shirts');
    } else if (name.includes('tank') || name.includes('sleeveless')) {
      categorySlugs.push('tank-tops');
    } else if (name.includes('women') || name.includes("women's")) {
      categorySlugs.push('womens-t-shirts');
    } else if (name.includes('kid') || name.includes('youth')) {
      categorySlugs.push('kids-t-shirts');
    } else if (name.includes('performance') || name.includes('athletic')) {
      categorySlugs.push('performance-t-shirts');
    } else {
      categorySlugs.push('short-sleeve-t-shirts');
    }
    categorySlugs.push('t-shirts');
  }

  // Sweatshirts
  if (name.includes('sweatshirt') || name.includes('hoodie')) {
    if (name.includes('hoodie')) {
      categorySlugs.push('hoodies');
    } else if (name.includes('crewneck')) {
      categorySlugs.push('crewneck-sweatshirts');
    } else if (name.includes('zip')) {
      if (name.includes('full')) {
        categorySlugs.push('full-zip-sweatshirts');
      } else {
        categorySlugs.push('quarter-zip-sweatshirts');
      }
    }
    categorySlugs.push('sweatshirts');
  }

  // Hats
  if (name.includes('hat') || name.includes('cap') || name.includes('beanie')) {
    if (name.includes('baseball')) {
      categorySlugs.push('baseball-hats');
    } else if (name.includes('beanie')) {
      categorySlugs.push('beanies');
    } else if (name.includes('trucker')) {
      categorySlugs.push('trucker-hats');
    }
    categorySlugs.push('hats');
  }

  // Polos
  if (name.includes('polo')) {
    categorySlugs.push('polos');
    if (name.includes('performance')) {
      categorySlugs.push('performance-polos');
    }
  }

  // Accessories
  if (name.includes('bag') || name.includes('tote') || name.includes('backpack')) {
    categorySlugs.push('bags');
    categorySlugs.push('accessories');
  }
  if (name.includes('mug') || name.includes('bottle') || name.includes('tumbler')) {
    categorySlugs.push('drinkware');
    categorySlugs.push('accessories');
  }

  // Women's
  if (name.includes('women') || name.includes("women's")) {
    categorySlugs.push('womens');
  }

  // Kids & Youth
  if (name.includes('kid') || name.includes('youth') || name.includes('child')) {
    categorySlugs.push('kids-youth');
  }

  // Performance
  if (name.includes('performance') || name.includes('athletic') || name.includes('sport')) {
    categorySlugs.push('performance');
  }

  // 默认添加到 Apparel
  if (categorySlugs.length > 0 && !categorySlugs.includes('apparel')) {
    categorySlugs.push('apparel');
  }

  return categorySlugs;
}

// [2025-12-11 09:21:35] 映射产品到分类
async function mapProductsToCategories(isDryRun: boolean): Promise<void> {
  console.log('\n📦 开始映射产品到分类...\n');

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      categoryId: true,
    },
  });

  console.log(`找到 ${products.length} 个活跃产品\n`);

  let mappedCount = 0;
  let uncategorizedCount = 0;

  for (const product of products) {
    const categorySlugs = matchProductToCategories(product);

    if (categorySlugs.length === 0) {
      console.log(`  ⚠️  产品 "${product.name}" 无法匹配分类，将归入 "Uncategorized"`);
      uncategorizedCount++;
      
      // 创建 Uncategorized 分类（如果不存在）
      const uncategorizedId = await ensureCategory(
        'Uncategorized',
        'uncategorized',
        null,
        999,
        isDryRun
      );

      if (!isDryRun) {
        await prisma.productCategory.upsert({
          where: {
            productId_categoryId: {
              productId: product.id,
              categoryId: uncategorizedId,
            },
          },
          create: {
            productId: product.id,
            categoryId: uncategorizedId,
          },
          update: {},
        });
      }
    } else {
      // 获取分类 ID
      const categories = await prisma.category.findMany({
        where: { slug: { in: categorySlugs } },
        select: { id: true, slug: true },
      });

      const categoryMap = new Map(categories.map(c => [c.slug, c.id]));

      for (const slug of categorySlugs) {
        const categoryId = categoryMap.get(slug);
        if (categoryId) {
          if (!isDryRun) {
            await prisma.productCategory.upsert({
              where: {
                productId_categoryId: {
                  productId: product.id,
                  categoryId,
                },
              },
              create: {
                productId: product.id,
                categoryId,
              },
              update: {},
            });
          }
        }
      }

      mappedCount++;
      console.log(`  ✅ ${isDryRun ? '[DRY-RUN]' : ''} 产品 "${product.name}" -> ${categorySlugs.join(', ')}`);
    }
  }

  console.log(`\n✅ 映射完成: ${mappedCount} 个产品已映射, ${uncategorizedCount} 个产品未分类`);
}

// [2025-12-11 09:21:35] 生成树状分类清单
async function generateTreeDocument(outputPath: string): Promise<void> {
  console.log('\n📄 生成树状分类清单...\n');

  // [2025-12-11 09:21:35] 获取分类树（兼容 productCategories 和 products 关系）
  let categories;
  try {
    // 尝试使用 productCategories 关系（如果表存在）
    categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        productCategories: {
          select: {
            productId: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
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
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  } catch (error: any) {
    // 如果 product_categories 表不存在,使用 products 关系（向后兼容）
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('⚠️  product_categories 表不存在,使用 products 关系（向后兼容）\n');
      categories = await prisma.category.findMany({
        where: { isActive: true },
        include: {
          products: {
            where: { isActive: true },
            select: {
              id: true,
            },
          },
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              products: {
                where: { isActive: true },
                select: {
                  id: true,
                },
              },
              children: {
                where: { isActive: true },
                include: {
                  products: {
                    where: { isActive: true },
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });
    } else {
      throw error;
    }
  }

  const rootCategories = categories.filter(c => !c.parentId);

  let markdown = `# 商品分类树状清单

**生成时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
**数据来源**: 数据库 categories 表

## 分类口径与映射规则

1. **一级分类**: 参考 Custom Ink 左侧导航的主要分类
2. **二级分类**: 根据产品类型（T恤、卫衣、帽子等）细分
3. **产品计数**: 统计该分类下（含子类）的产品数量
4. **命名规范**: 使用英文，slug 为小写短横线格式

## 变更记录

- [2025-12-11 09:21:35] 初始分类体系建立，参考 Custom Ink

---

## 分类树

\`\`\`
`;

  // 计算每个分类的产品数量（含子类）
  function calculateProductCount(category: any): number {
    // 直接产品数量（兼容两种关系）
    const directCount = category.productCategories?.length || category.products?.length || 0;

    // 子类产品数量（递归）
    const childrenCount = (category.children || []).reduce(
      (sum: number, child: any) => sum + calculateProductCount(child),
      0
    );

    return directCount + childrenCount;
  }

  function buildTree(category: any, prefix: string = '', isLast: boolean = true): string {
    const count = calculateProductCount(category);
    const connector = isLast ? '└─' : '├─';
    let result = `${prefix}${connector} ${category.name} (count: ${count})\n`;

    if (category.children && category.children.length > 0) {
      const childPrefix = prefix + (isLast ? '   ' : '│  ');
      category.children.forEach((child: any, index: number) => {
        const isChildLast = index === category.children.length - 1;
        result += buildTree(child, childPrefix, isChildLast);
      });
    }

    return result;
  }

  for (const root of rootCategories) {
    markdown += buildTree(root, '', false);
  }

  markdown += `\`\`\`

---

## 待补充分类

以下分类在数据库中无对应商品，标注为"待补充"：

`;

  // 查找空分类
  const emptyCategories: string[] = [];
  for (const category of categories) {
    const productCount = calculateProductCount(category);
    if (productCount === 0 && (!category.children || category.children.length === 0)) {
      emptyCategories.push(category.name);
    }
  }

  if (emptyCategories.length > 0) {
    markdown += emptyCategories.map(name => `- ${name}`).join('\n');
  } else {
    markdown += '- 无';
  }

  markdown += `\n\n## 未分类产品

以下产品暂未明确归属分类，需要人工二次分类：

`;

  // 查找未分类产品（所有产品都有 categoryId,所以这里查找没有对应分类的产品）
  let uncategorizedProducts: any[] = [];
  try {
    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
      take: 100,
    });

    // 检查产品的分类是否存在
    const categoryIds = new Set(categories.map((c: any) => c.id));
    uncategorizedProducts = allProducts
      .filter((p) => !categoryIds.has(p.categoryId))
      .slice(0, 20);
  } catch (error: any) {
    console.warn('⚠️  无法查找未分类产品:', error.message);
    uncategorizedProducts = [];
  }

  if (uncategorizedProducts.length > 0) {
    markdown += uncategorizedProducts.map(p => `- ${p.name} (ID: ${p.id})`).join('\n');
  } else {
    markdown += '- 无';
  }

  markdown += '\n';

  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`✅ 树状分类清单已生成: ${outputPath}`);
}

// [2025-12-11 09:21:35] 主函数
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isApply = args.includes('--apply');
  const exportPath = args.find(arg => arg.startsWith('--export='))?.split('=')[1];

  try {
    if (exportPath) {
      await generateTreeDocument(exportPath);
    } else if (isDryRun || isApply) {
      console.log(`\n${isDryRun ? '🔍 [DRY-RUN 模式]' : '🚀 [APPLY 模式]'} 开始生成分类映射...\n`);

      // 1. 创建分类树
      console.log('📁 创建分类树...\n');
      await createCategoryTree(CATEGORY_MAPPING, null, isDryRun);

      // 2. 映射产品到分类
      await mapProductsToCategories(isDryRun);

      console.log(`\n✅ ${isDryRun ? '[DRY-RUN]' : ''} 分类映射完成！`);
    } else {
      console.log(`
用法:
  --dry-run              预览将要创建的分类和映射（不实际写入数据库）
  --apply                实际创建/更新分类和映射
  --export=<path>        导出树状分类清单到 markdown 文档

示例:
  ts-node db/scripts/generate-category-mapping.ts --dry-run
  ts-node db/scripts/generate-category-mapping.ts --apply
  ts-node db/scripts/generate-category-mapping.ts --export docs/catalog-taxonomy-tree.md
      `);
    }
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
