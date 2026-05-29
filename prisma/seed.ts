// Seed script bootstraps catalog/products/variants/projects
// Extend seeding with coupons/promotions/orders for E2E coverage
import { Prisma, PrismaClient, ProjectStatus, UserRole, CouponType, PromotionDiscountType } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_PASSWORDS = {
// Precomputed bcrypt hashes for deterministic seed accounts
  customer: '$2a$10$JYz3K0OkELuvlNXdVJO7l.77vfMyT2Rwg9LzHJxgW7ZNpQL5ma0he',
  admin: '$2a$10$V4bv7NqQWXa5JDHXFPF2WOIeRuHyp6Q4LEDR1Gz/QPyO8eCWaekJ6',
};
const now = new Date();
const nextYear = new Date(now);
nextYear.setFullYear(now.getFullYear() + 1);

type ColorSeed = {
  name: string;
  hex: string;
};

type ProductSeed = {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  skuPrefix: string;
  colors: ColorSeed[];
  sizes: string[];
  printableAreas: Prisma.JsonObject;
};

type CategorySeed = {
  name: string;
  slug: string;
  description: string;
  products: ProductSeed[];
};

const catalogSeed: CategorySeed[] = [
  {
    name: 'T-Shirts',
    slug: 't-shirts',
    description: 'Premium cotton tees ready for full-front prints.',
    products: [
      {
        name: 'Classic Crew Tee',
        slug: 'classic-crew-tee',
        description: 'Midweight 5.3oz tee with reinforced neckline.',
        basePrice: 2500,
        skuPrefix: 'TS-CLASSIC',
        colors: [
          { name: 'White', hex: '#FFFFFF' },
          { name: 'Black', hex: '#111111' },
          { name: 'Heather Grey', hex: '#B3B3B3' }
        ],
        sizes: ['S', 'M', 'L'],
        printableAreas: {
          front: {
            unit: 'cm',
            safeZone: { x: 4, y: 5, width: 28, height: 32 }
          }
        }
      },
      {
        name: 'Relaxed Fit Tee',
        slug: 'relaxed-fit-tee',
        description: 'Soft enzyme-washed tee perfect for oversized prints.',
        basePrice: 2800,
        skuPrefix: 'TS-RELAX',
        colors: [
          { name: 'Dusty Rose', hex: '#D9A3A2' },
          { name: 'Sage', hex: '#9CAF88' }
        ],
        sizes: ['S', 'M', 'L'],
        printableAreas: {
          front: {
            unit: 'cm',
            safeZone: { x: 3.5, y: 4, width: 30, height: 34 }
          }
        }
      }
    ]
  },
  {
    name: 'Mugs',
    slug: 'mugs',
    description: 'Ceramic drinkware with wrap-ready coatings.',
    products: [
      {
        name: 'Classic 11oz Mug',
        slug: 'classic-11oz-mug',
        description: 'Glossy white ceramic mug for everyday branding.',
        basePrice: 1500,
        skuPrefix: 'MG-11OZ',
        colors: [
          { name: 'White', hex: '#FFFFFF' },
          { name: 'Midnight', hex: '#1C1C2E' }
        ],
        sizes: ['S', 'M', 'L'],
        printableAreas: {
          front: {
            unit: 'px',
            safeZone: { x: 40, y: 30, width: 280, height: 90 }
          }
        }
      },
      {
        name: 'Color Rim Mug',
        slug: 'color-rim-mug',
        description: 'Two-tone mug with colored rim and handle.',
        basePrice: 1700,
        skuPrefix: 'MG-RIM',
        colors: [
          { name: 'Navy', hex: '#13294B' },
          { name: 'Sunset', hex: '#F47A60' }
        ],
        sizes: ['S', 'M', 'L'],
        printableAreas: {
          front: {
            unit: 'px',
            safeZone: { x: 35, y: 28, width: 300, height: 95 }
          }
        }
      }
    ]
  },
  {
    name: 'Caps',
    slug: 'caps',
    description: 'Structured and unstructured hats ready for embroidery.',
    products: [
      {
        name: 'Structured Trucker Cap',
        slug: 'structured-trucker-cap',
        description: 'Five-panel cap with mesh back and snap closure.',
        basePrice: 2200,
        skuPrefix: 'CP-TRUCKER',
        colors: [
          { name: 'Black/White', hex: '#0F0F0F' },
          { name: 'Khaki/White', hex: '#BFAE8F' }
        ],
        sizes: ['S', 'M', 'L'],
        printableAreas: {
          front: {
            unit: 'cm',
            safeZone: { x: 2.5, y: 2, width: 12, height: 5.5 }
          }
        }
      },
      {
        name: 'Unstructured Dad Cap',
        slug: 'unstructured-dad-cap',
        description: 'Low-profile cap with antique brass buckle.',
        basePrice: 2100,
        skuPrefix: 'CP-DAD',
        colors: [
          { name: 'Forest', hex: '#314E35' },
          { name: 'Slate', hex: '#5C6D7C' },
          { name: 'Sand', hex: '#D7C6A4' }
        ],
        sizes: ['S', 'M', 'L'],
        printableAreas: {
          front: {
            unit: 'cm',
            safeZone: { x: 2, y: 2, width: 11, height: 5 }
          }
        }
      }
    ]
  }
];

const categorySlugToId = new Map<string, string>();

const moneyFromCents = (cents: number) =>
  new Prisma.Decimal(cents).dividedBy(new Prisma.Decimal(100));

const normalizeColorCode = (name: string) =>
  name.replace(/[^a-z0-9]/gi, '').toUpperCase();

async function main() {
  console.info('➡️  Start seeding printable catalog');

  await prisma.orderItem.deleteMany({
    where: { order: { orderNumber: { in: ['ORD-1001', 'ORD-DR-001', 'ORD-DR-002', 'ORD-DR-003'] } } }
  });
  await prisma.project.deleteMany({
    where: { name: { in: ['Demo Canvas Draft', 'Ready For Production'] } }
  });
  await prisma.order.deleteMany({
    where: { orderNumber: { in: ['ORD-1001', 'ORD-DR-001', 'ORD-DR-002', 'ORD-DR-003'] } }
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@print.local' },
    update: {},
    create: {
      email: 'demo@print.local',
      passwordHash: '$2b$10$VbT8DemoHashpLrUPuAdzDuE7YZd5ZkN5vZ4XwW8iEwN7p0demo',
      firstName: 'Demo',
      lastName: 'Merchant',
      role: 'ADMIN'
    }
  });

// Additional seed accounts for automated E2E flows
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      firstName: 'Admin',
      lastName: 'Tester',
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@test.com',
      passwordHash: TEST_PASSWORDS.admin,
      firstName: 'Admin',
      lastName: 'Tester',
      role: UserRole.ADMIN,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {
      firstName: 'Customer',
      lastName: 'E2E',
      role: UserRole.CUSTOMER,
    },
    create: {
      email: 'customer@test.com',
      passwordHash: TEST_PASSWORDS.customer,
      firstName: 'Customer',
      lastName: 'E2E',
      role: UserRole.CUSTOMER,
    },
  });

  const seededProducts: {
    productId: string;
    variantIds: string[];
  }[] = [];

  for (const categorySeed of catalogSeed) {
    const category = await prisma.category.upsert({
      where: { slug: categorySeed.slug },
      update: {
        name: categorySeed.name,
        description: categorySeed.description
      },
      create: {
        name: categorySeed.name,
        slug: categorySeed.slug,
        description: categorySeed.description
      }
    });
    categorySlugToId.set(categorySeed.slug, category.id);

    for (const productSeed of categorySeed.products) {
      const product = await prisma.product.upsert({
        where: { slug: productSeed.slug },
        update: {
          name: productSeed.name,
          description: productSeed.description,
          basePrice: productSeed.basePrice,
          printableAreas: productSeed.printableAreas,
          sku: `${productSeed.skuPrefix}-BASE`,
          category: { connect: { id: category.id } },
          unitCost: moneyFromCents(Math.floor(productSeed.basePrice * 0.45)),
          salePrice: moneyFromCents(productSeed.basePrice),
          grossProfit: moneyFromCents(Math.floor(productSeed.basePrice * 0.2))
        },
        create: {
          name: productSeed.name,
          slug: productSeed.slug,
          description: productSeed.description,
          longDescription: productSeed.description,
          basePrice: productSeed.basePrice,
          printableAreas: productSeed.printableAreas,
          sku: `${productSeed.skuPrefix}-BASE`,
          category: { connect: { id: category.id } },
          unitCost: moneyFromCents(Math.floor(productSeed.basePrice * 0.45)),
          salePrice: moneyFromCents(productSeed.basePrice),
          grossProfit: moneyFromCents(Math.floor(productSeed.basePrice * 0.2))
        }
      });

      await prisma.variant.deleteMany({ where: { productId: product.id } });

      const variantIds: string[] = [];
      let totalStock = 0;
      for (const color of productSeed.colors) {
        for (const size of productSeed.sizes) {
          const sku = `${productSeed.skuPrefix}-${normalizeColorCode(color.name)}-${size}`;
          const stockQuantity = 150 - Math.floor(Math.random() * 25);
          const variant = await prisma.variant.create({
            data: {
              productId: product.id,
              color: color.name,
              colorHex: color.hex,
              size,
              sku,
              stockQuantity,
              priceAdjustment: new Prisma.Decimal(0)
            }
          });
          variantIds.push(variant.id);
          totalStock += stockQuantity;
        }
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: totalStock }
      });

      seededProducts.push({ productId: product.id, variantIds });
    }
  }

  const couponSeeds = [
    {
      code: 'SAVE10CAD',
      type: CouponType.FIXED,
      value: new Prisma.Decimal(10),
      minOrderValue: new Prisma.Decimal(50),
      maxDiscount: null,
      usageLimit: 500,
    },
    {
      code: 'FREESHIP15',
      type: CouponType.PERCENTAGE,
      value: new Prisma.Decimal(15),
      minOrderValue: new Prisma.Decimal(75),
      maxDiscount: new Prisma.Decimal(40),
      usageLimit: 300,
    },
    {
      code: 'FIRSTBUY',
      type: CouponType.FIXED,
      value: new Prisma.Decimal(20),
      minOrderValue: new Prisma.Decimal(60),
      maxDiscount: null,
      usageLimit: 1,
      userUsageLimit: 1,
    },
  ];

  const couponRecords = await Promise.all(
    couponSeeds.map((coupon) =>
      prisma.coupon.upsert({
        where: { code: coupon.code },
        update: {
          type: coupon.type,
          value: coupon.value,
          minOrderValue: coupon.minOrderValue,
          maxDiscount: coupon.maxDiscount,
          usageLimit: coupon.usageLimit,
          userUsageLimit: coupon.userUsageLimit,
          startDate: now,
          endDate: nextYear,
          isActive: true,
        },
        create: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrderValue: coupon.minOrderValue,
          maxDiscount: coupon.maxDiscount,
          usageLimit: coupon.usageLimit,
          userUsageLimit: coupon.userUsageLimit,
          startDate: now,
          endDate: nextYear,
          isActive: true,
        },
      })
    )
  );
  const couponMap = new Map(couponRecords.map((coupon) => [coupon.code, coupon]));

  const promotionSeeds = [
    {
      id: 'promo-holiday-drop',
      title: 'Holiday Drop',
      description: 'Seasonal tees + hoodies with guaranteed delivery.',
      bannerImageUrl: '/assets/hero/hero-card-tee.jpg',
      linkUrl: '/products?collection=t-shirts',
      discountType: PromotionDiscountType.PERCENTAGE,
      discountValue: new Prisma.Decimal(15),
      minOrderValue: new Prisma.Decimal(100),
      sortOrder: 10,
      categorySlug: 't-shirts',
    },
    {
      id: 'promo-bogo-mugs',
      title: 'Buy More Drinkware',
      description: 'Add a second mug for 50% off.',
      bannerImageUrl: '/assets/hero/hero-card-bottle.jpg',
      linkUrl: '/products?collection=mugs',
      discountType: PromotionDiscountType.FIXED,
      discountValue: new Prisma.Decimal(5),
      minOrderValue: new Prisma.Decimal(40),
      sortOrder: 20,
      categorySlug: 'mugs',
    },
  ];

  for (const promotionSeed of promotionSeeds) {
    const promotion = await prisma.promotion.upsert({
      where: { id: promotionSeed.id },
      update: {
        title: promotionSeed.title,
        description: promotionSeed.description,
        bannerImageUrl: promotionSeed.bannerImageUrl,
        linkUrl: promotionSeed.linkUrl,
        discountType: promotionSeed.discountType,
        discountValue: promotionSeed.discountValue,
        minOrderValue: promotionSeed.minOrderValue,
        maxDiscount: promotionSeed.maxDiscount ?? null,
        startDate: now,
        endDate: nextYear,
        isActive: true,
        sortOrder: promotionSeed.sortOrder,
      },
      create: {
        id: promotionSeed.id,
        title: promotionSeed.title,
        description: promotionSeed.description,
        bannerImageUrl: promotionSeed.bannerImageUrl,
        linkUrl: promotionSeed.linkUrl,
        discountType: promotionSeed.discountType,
        discountValue: promotionSeed.discountValue,
        minOrderValue: promotionSeed.minOrderValue,
        maxDiscount: promotionSeed.maxDiscount ?? null,
        startDate: now,
        endDate: nextYear,
        isActive: true,
        sortOrder: promotionSeed.sortOrder,
      },
    });

    const categoryId = promotionSeed.categorySlug ? categorySlugToId.get(promotionSeed.categorySlug) : null;
    if (categoryId) {
      await prisma.promotionCategory.deleteMany({ where: { promotionId: promotion.id } });
      await prisma.promotionCategory.create({
        data: {
          promotionId: promotion.id,
          categoryId,
        },
      });
    }
  }

  const [firstProduct] = seededProducts;
  if (!firstProduct) {
    throw new Error('Catalog seed did not produce any products');
  }
  const [primaryVariantId] = firstProduct.variantIds;
  if (!primaryVariantId) {
    throw new Error('Primary variant missing for first product');
  }

  const demoDraft = await prisma.project.create({
    data: {
      name: 'Demo Canvas Draft',
      userId: user.id,
      productId: firstProduct.productId,
      variantId: primaryVariantId,
      status: ProjectStatus.DRAFT,
      canvasState: {
        zoom: 0.9,
        layers: [
          { type: 'text', value: 'Your Brand', fontSize: 48 },
          { type: 'shape', shape: 'rectangle', width: 200, height: 80 }
        ]
      },
      previewUrls: ['https://cdn.print.dev/previews/demo-draft/front.png'],
      notes: 'Draft project ready for refinement.'
    }
  });

  const readyProject = await prisma.project.create({
    data: {
      name: 'Ready For Production',
      userId: user.id,
      productId: firstProduct.productId,
      variantId: primaryVariantId,
      status: ProjectStatus.READY_FOR_UPLOAD,
      canvasState: {
        zoom: 1,
        layers: [
          { type: 'image', src: 'https://cdn.print.dev/assets/mockup.png' },
          { type: 'text', value: 'Limited Drop', fontSize: 52 }
        ]
      },
      previewUrls: [
        'https://cdn.print.dev/previews/ready/front.png',
        'https://cdn.print.dev/previews/ready/detail.png'
      ],
      notes: 'Approved mockup synced from design editor.'
    }
  });

  const primaryVariant = await prisma.variant.findUniqueOrThrow({
    where: { id: primaryVariantId },
    include: { product: true }
  });

  const orderSubtotalCents = primaryVariant.product.basePrice * 2;
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-1001',
      userId: user.id,
      email: 'demo@print.local',
      status: 'PROCESSING',
      currency: 'CAD',
      subtotal: moneyFromCents(orderSubtotalCents),
      shippingCost: moneyFromCents(1200),
      tax: moneyFromCents(650),
      discount: moneyFromCents(0),
      total: moneyFromCents(orderSubtotalCents + 1200 + 650),
      paymentStatus: 'COMPLETED',
      shippingAddress: {
        firstName: 'Demo',
        lastName: 'Merchant',
        address1: '123 Print St',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5V 2T6',
        country: 'CA'
      },
      billingAddress: {
        firstName: 'Demo',
        lastName: 'Merchant',
        address1: '123 Print St',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5V 2T6',
        country: 'CA'
      },
      projects: {
        connect: [{ id: readyProject.id }]
      },
      items: {
        create: [
          {
            variantId: primaryVariantId,
            quantity: 2,
            priceSnapshot: moneyFromCents(primaryVariant.product.basePrice)
          }
        ]
      }
    }
  });

  await prisma.project.update({
    where: { id: readyProject.id },
    data: { status: ProjectStatus.ORDERED, orderId: order.id }
  });

// Minimal Fabric.js canvas snapshot used as customer design stub for design-review seed orders
  const SEED_CANVAS_JSON = {
    version: '5.3.0',
    background: '',
    objects: [
      {
        type: 'textbox',
        version: '5.3.0',
        originX: 'left',
        originY: 'top',
        left: 350,
        top: 480,
        width: 500,
        height: 72,
        fill: '#111827',
        strokeWidth: 1,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        visible: true,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontSize: 64,
        text: 'Hello PrintNgo!',
        textAlign: 'center',
        fontStyle: 'normal',
        lineHeight: 1.16,
        textBackgroundColor: '',
        charSpacing: 0,
        styles: {},
        direction: 'ltr',
        minWidth: 20,
        splitByGrapheme: false,
        shadow: null,
        backgroundColor: '',
        fillRule: 'nonzero',
        paintFirst: 'fill',
        globalCompositeOperation: 'source-over',
        skewX: 0,
        skewY: 0,
        underline: false,
        overline: false,
        linethrough: false,
        path: null,
        pathStartOffset: 0,
        pathSide: 'left',
        pathAlign: 'baseline',
      },
      {
        type: 'rect',
        version: '5.3.0',
        originX: 'left',
        originY: 'top',
        left: 450,
        top: 600,
        width: 300,
        height: 80,
        fill: '#3B82F6',
        stroke: null,
        strokeWidth: 1,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 0.8,
        visible: true,
        shadow: null,
        backgroundColor: '',
        fillRule: 'nonzero',
        paintFirst: 'fill',
        globalCompositeOperation: 'source-over',
        skewX: 0,
        skewY: 0,
        rx: 12,
        ry: 12,
      },
    ],
  };

// Helper to create repeatable sample orders
  async function ensureOrderSeed({
    orderNumber,
    user: seedUser,
    email,
    couponCode,
    status = 'PENDING',
    paymentStatus = 'COMPLETED',
    designReviewStatus,
    designerDraft,
    mockupUrl,
    createdAt,
  }: {
    orderNumber: string;
    user?: { id: string; email: string };
    email?: string;
    couponCode?: string;
    status?: string;
    paymentStatus?: string;
    designReviewStatus?: string;
    designerDraft?: object;
    mockupUrl?: string;
    createdAt?: Date;
  }) {
    const existing = await prisma.order.findUnique({ where: { orderNumber } });
    if (existing) {
      return existing;
    }

    const variantSource = seededProducts[1] || seededProducts[0];
    const variantId = variantSource?.variantIds[0];
    if (!variantId) {
      throw new Error('No variants available for seeded orders');
    }
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant || !variant.product) {
      throw new Error('Variant lookup failed for seeded order');
    }

    const quantity = 2;
    const basePriceCents = variant.product.basePrice;
    const subtotalCents = basePriceCents * quantity;
    const shippingCents = 1500;
    const taxCents = 700;
    const coupon = couponCode ? couponMap.get(couponCode) : undefined;
    const discountCents = coupon ? Math.min(subtotalCents, Number(coupon.value) * 100) : 0;
    const totalCents = subtotalCents - discountCents + shippingCents + taxCents;
    const orderEmail = email || seedUser?.email || 'guest@print.local';

    return prisma.order.create({
      data: {
        orderNumber,
        userId: seedUser?.id ?? null,
        email: orderEmail,
        status,
        currency: 'CAD',
        subtotal: moneyFromCents(subtotalCents),
        shippingCost: moneyFromCents(shippingCents),
        tax: moneyFromCents(taxCents),
        discount: moneyFromCents(discountCents),
        total: moneyFromCents(totalCents),
        paymentStatus,
        shippingAddress: {
          firstName: seedUser?.firstName || 'Seed',
          lastName: seedUser?.lastName || 'Customer',
          address1: '500 King St W',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M5V1L9',
          country: 'CA',
        },
        billingAddress: {
          firstName: seedUser?.firstName || 'Seed',
          lastName: seedUser?.lastName || 'Customer',
          address1: '500 King St W',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M5V1L9',
          country: 'CA',
        },
        items: {
          create: [
            {
              variantId: variant.id,
              quantity,
              priceSnapshot: moneyFromCents(basePriceCents),
            },
          ],
        },
        ...(coupon
          ? {
              orderCoupons: {
                create: {
                  couponId: coupon.id,
                  userId: seedUser?.id ?? null,
                  discountAmount: moneyFromCents(discountCents),
                },
              },
            }
          : {}),
        ...(designReviewStatus ? { designReviewStatus } : {}),
        ...(designerDraft ? { designerDraft } : {}),
        ...(mockupUrl ? { mockupUrl } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
    });
  }

  await ensureOrderSeed({
    orderNumber: 'ORD-2001',
    user: customerUser,
    email: 'customer@test.com',
    couponCode: 'SAVE10CAD',
    status: 'PENDING',
    paymentStatus: 'COMPLETED',
  });

  await ensureOrderSeed({
    orderNumber: 'ORD-2002',
    email: 'guest+seed@print.local',
    status: 'PROCESSING',
    paymentStatus: 'COMPLETED',
  });

  // Design-review test orders — used to test the designer draft save/load flow
  // ORD-DR-001: customer submitted design (canvasJson in designerDraft), awaiting first review
  await ensureOrderSeed({
    orderNumber: 'ORD-DR-001',
    user: customerUser,
    email: 'customer@test.com',
    status: 'PROCESSING',
    paymentStatus: 'COMPLETED',
    designReviewStatus: 'PENDING_REVIEW',
    designerDraft: SEED_CANVAS_JSON,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  });

  // ORD-DR-002: designer already opened and partially worked on it (IN_REVIEW), no draft yet
  await ensureOrderSeed({
    orderNumber: 'ORD-DR-002',
    user: customerUser,
    email: 'customer@test.com',
    status: 'PROCESSING',
    paymentStatus: 'COMPLETED',
    designReviewStatus: 'IN_REVIEW',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago → triggers urgent badge
  });

  // ORD-DR-003: designer rejected, customer needs to resubmit
  await ensureOrderSeed({
    orderNumber: 'ORD-DR-003',
    email: 'guest+seed@print.local',
    status: 'PROCESSING',
    paymentStatus: 'COMPLETED',
    designReviewStatus: 'REJECTED',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  });

  console.info('✅ Seed completed successfully');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

