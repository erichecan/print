// [2025-11-18 10:45:12] Seed script bootstraps catalog/products/variants/projects
import { Prisma, PrismaClient, ProjectStatus } from '@prisma/client';

const prisma = new PrismaClient();

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

const moneyFromCents = (cents: number) =>
  new Prisma.Decimal(cents).dividedBy(new Prisma.Decimal(100));

const normalizeColorCode = (name: string) =>
  name.replace(/[^a-z0-9]/gi, '').toUpperCase();

async function main() {
  console.info('➡️  Start seeding printable catalog');

  await prisma.orderItem.deleteMany({
    where: { order: { orderNumber: { in: ['ORD-1001'] } } }
  });
  await prisma.project.deleteMany({
    where: { name: { in: ['Demo Canvas Draft', 'Ready For Production'] } }
  });
  await prisma.order.deleteMany({
    where: { orderNumber: { in: ['ORD-1001'] } }
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

