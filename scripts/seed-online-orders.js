/**
 * Seed script: create test online orders covering all statuses.
 * Run:  node scripts/seed-online-orders.js
 * Clean: node scripts/seed-online-orders.js --clean
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: `${__dirname}/../backend/.env` });

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const SEED_PREFIX = 'SEED-';

const address = (first, last, city = 'Toronto', province = 'ON') => ({
  firstName: first,
  lastName: last,
  addressLine1: '123 Test Street',
  city,
  province,
  postalCode: 'M5V 3A1',
  country: 'CA',
});

async function clean() {
  const deleted = await prisma.order.deleteMany({
    where: { orderNumber: { startsWith: SEED_PREFIX } },
  });
  console.log(`Deleted ${deleted.count} seed orders.`);
}

async function seed() {
  // Pick 6 real variants from the DB
  const variants = await prisma.variant.findMany({
    take: 6,
    include: { product: { select: { name: true } } },
  });

  if (variants.length < 2) {
    console.error('Not enough variants in DB — run product seed first.');
    process.exit(1);
  }

  const v = (i) => variants[i % variants.length];

  const orders = [
    // 1. Pending payment, no production
    {
      orderNumber: `${SEED_PREFIX}001`,
      email: 'alice@example.com',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      subtotal: 29.99,
      shippingCost: 8.5,
      tax: 4.94,
      total: 43.43,
      shippingAddress: address('Alice', 'Chen'),
      billingAddress: address('Alice', 'Chen'),
      variantId: v(0).id,
      quantity: 1,
      price: 29.99,
    },
    // 2. Paid, processing, no production
    {
      orderNumber: `${SEED_PREFIX}002`,
      email: 'bob@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 59.98,
      shippingCost: 0,
      tax: 7.8,
      total: 67.78,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      shippingAddress: address('Bob', 'Smith', 'Vancouver', 'BC'),
      billingAddress: address('Bob', 'Smith', 'Vancouver', 'BC'),
      variantId: v(1).id,
      quantity: 2,
      price: 29.99,
    },
    // 3. Paid, queued for factory
    {
      orderNumber: `${SEED_PREFIX}003`,
      email: 'carol@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 44.99,
      shippingCost: 8.5,
      tax: 6.95,
      total: 60.44,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      productionStatus: 'QUEUED',
      printToken: uuidv4(),
      sentToFactoryAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      shippingAddress: address('Carol', 'Wang', 'Calgary', 'AB'),
      billingAddress: address('Carol', 'Wang', 'Calgary', 'AB'),
      variantId: v(2).id,
      quantity: 1,
      price: 44.99,
    },
    // 4. Paid, in production
    {
      orderNumber: `${SEED_PREFIX}004`,
      email: 'david@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 89.97,
      shippingCost: 0,
      tax: 11.7,
      total: 101.67,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      productionStatus: 'IN_PRODUCTION',
      printToken: uuidv4(),
      sentToFactoryAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h ago
      shippingAddress: address('David', 'Kim', 'Montreal', 'QC'),
      billingAddress: address('David', 'Kim', 'Montreal', 'QC'),
      variantId: v(3).id,
      quantity: 3,
      price: 29.99,
    },
    // 5. Shipped, production done
    {
      orderNumber: `${SEED_PREFIX}005`,
      email: 'eva@example.com',
      status: 'SHIPPED',
      paymentStatus: 'COMPLETED',
      subtotal: 29.99,
      shippingCost: 12.0,
      tax: 5.46,
      total: 47.45,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      productionStatus: 'DONE',
      printToken: uuidv4(),
      sentToFactoryAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      shippingAddress: address('Eva', 'Martinez', 'Ottawa', 'ON'),
      billingAddress: address('Eva', 'Martinez', 'Ottawa', 'ON'),
      variantId: v(4).id,
      quantity: 1,
      price: 29.99,
    },
    // 6. Delivered
    {
      orderNumber: `${SEED_PREFIX}006`,
      email: 'frank@example.com',
      status: 'DELIVERED',
      paymentStatus: 'COMPLETED',
      subtotal: 119.96,
      shippingCost: 0,
      tax: 15.6,
      total: 135.56,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      productionStatus: 'DONE',
      printToken: uuidv4(),
      sentToFactoryAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      shippingAddress: address('Frank', 'Lee', 'Edmonton', 'AB'),
      billingAddress: address('Frank', 'Lee', 'Edmonton', 'AB'),
      variantId: v(5).id,
      quantity: 4,
      price: 29.99,
    },
    // 7. Cancelled, payment pending
    {
      orderNumber: `${SEED_PREFIX}007`,
      email: 'grace@example.com',
      status: 'CANCELLED',
      paymentStatus: 'FAILED',
      subtotal: 29.99,
      shippingCost: 8.5,
      tax: 4.94,
      total: 43.43,
      shippingAddress: address('Grace', 'Liu', 'Winnipeg', 'MB'),
      billingAddress: address('Grace', 'Liu', 'Winnipeg', 'MB'),
      variantId: v(0).id,
      quantity: 1,
      price: 29.99,
    },
    // 8. Refunded
    {
      orderNumber: `${SEED_PREFIX}008`,
      email: 'henry@example.com',
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      subtotal: 59.98,
      shippingCost: 8.5,
      tax: 8.89,
      total: 77.37,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      shippingAddress: address('Henry', 'Park', 'Victoria', 'BC'),
      billingAddress: address('Henry', 'Park', 'Victoria', 'BC'),
      variantId: v(1).id,
      quantity: 2,
      price: 29.99,
    },
    // 9. Multi-item order, in production
    {
      orderNumber: `${SEED_PREFIX}009`,
      email: 'iris@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 74.97,
      shippingCost: 0,
      tax: 9.75,
      total: 84.72,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      productionStatus: 'QUEUED',
      printToken: uuidv4(),
      sentToFactoryAt: new Date(Date.now() - 30 * 60 * 1000), // 30min ago
      shippingAddress: address('Iris', 'Zhang', 'Halifax', 'NS'),
      billingAddress: address('Iris', 'Zhang', 'Halifax', 'NS'),
      variantId: v(2).id,
      quantity: 3,
      price: 24.99,
      extraItems: [{ variantId: v(3).id, quantity: 1, price: 0 }],
    },

    // --- Design Review flow orders ---

    // 10. Design uploaded, awaiting review
    {
      orderNumber: `${SEED_PREFIX}010`,
      email: 'jack@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 34.99,
      shippingCost: 8.5,
      tax: 5.65,
      total: 49.14,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      designReviewStatus: 'PENDING_REVIEW',
      mockupUrl: 'https://placehold.co/800x800/E5E7EB/6B7280?text=Mockup+010',
      shippingAddress: address('Jack', 'Brown', 'Toronto', 'ON'),
      billingAddress: address('Jack', 'Brown', 'Toronto', 'ON'),
      variantId: v(0).id,
      quantity: 1,
      price: 34.99,
    },
    // 11. Design currently being reviewed by admin
    {
      orderNumber: `${SEED_PREFIX}011`,
      email: 'karen@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 69.98,
      shippingCost: 0,
      tax: 9.1,
      total: 79.08,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      designReviewStatus: 'IN_REVIEW',
      mockupUrl: 'https://placehold.co/800x800/DBEAFE/1E40AF?text=Mockup+011',
      shippingAddress: address('Karen', 'Johnson', 'Vancouver', 'BC'),
      billingAddress: address('Karen', 'Johnson', 'Vancouver', 'BC'),
      variantId: v(1).id,
      quantity: 2,
      price: 34.99,
    },
    // 12. Design approved and synced to factory
    {
      orderNumber: `${SEED_PREFIX}012`,
      email: 'liam@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 44.99,
      shippingCost: 8.5,
      tax: 6.95,
      total: 60.44,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      designReviewStatus: 'SYNCED',
      mockupUrl: 'https://placehold.co/800x800/D1FAE5/065F46?text=Mockup+012',
      designReviewSyncedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      gangSheetUrl: 'https://placehold.co/1200x1600/F3F4F6/111827?text=Gang+Sheet+012',
      gangSheetGeneratedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      carrier: 'Canada Post',
      trackingNumber: 'CP' + Math.random().toString().slice(2, 16),
      shippingAddress: address('Liam', 'Wilson', 'Calgary', 'AB'),
      billingAddress: address('Liam', 'Wilson', 'Calgary', 'AB'),
      variantId: v(2).id,
      quantity: 1,
      price: 44.99,
    },
    // 13. Design rejected — customer needs to resubmit
    {
      orderNumber: `${SEED_PREFIX}013`,
      email: 'mia@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 34.99,
      shippingCost: 8.5,
      tax: 5.65,
      total: 49.14,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      designReviewStatus: 'REJECTED',
      mockupUrl: 'https://placehold.co/800x800/FEE2E2/991B1B?text=Mockup+013',
      designReviewNote: '图片分辨率过低（当前 72 dpi，需要至少 300 dpi），请重新上传高清原图。',
      designReviewRejectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      shippingAddress: address('Mia', 'Taylor', 'Ottawa', 'ON'),
      billingAddress: address('Mia', 'Taylor', 'Ottawa', 'ON'),
      variantId: v(3).id,
      quantity: 1,
      price: 34.99,
    },
    // 14. Another pending review — older submission
    {
      orderNumber: `${SEED_PREFIX}014`,
      email: 'noah@example.com',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      subtotal: 104.97,
      shippingCost: 0,
      tax: 13.65,
      total: 118.62,
      paymentIntentId: `pi_seed_${uuidv4().replace(/-/g, '').slice(0, 20)}`,
      designReviewStatus: 'PENDING_REVIEW',
      mockupUrl: 'https://placehold.co/800x800/FEF3C7/92400E?text=Mockup+014',
      shippingAddress: address('Noah', 'Anderson', 'Montreal', 'QC'),
      billingAddress: address('Noah', 'Anderson', 'Montreal', 'QC'),
      variantId: v(4).id,
      quantity: 3,
      price: 34.99,
    },
  ];

  let created = 0;
  for (const o of orders) {
    const existing = await prisma.order.findUnique({ where: { orderNumber: o.orderNumber } });
    if (existing) {
      console.log(`  skip ${o.orderNumber} (already exists)`);
      continue;
    }

    const { variantId, quantity, price, extraItems, ...orderData } = o;
    const itemsToCreate = [
      { variantId, quantity, priceSnapshot: price },
      ...(extraItems || []).map((ei) => ({ variantId: ei.variantId, quantity: ei.quantity, priceSnapshot: ei.price })),
    ];

    await prisma.order.create({
      data: {
        ...orderData,
        subtotal: orderData.subtotal,
        shippingCost: orderData.shippingCost,
        tax: orderData.tax,
        total: orderData.total,
        discount: 0,
        currency: 'CAD',
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        items: { create: itemsToCreate },
      },
    });
    console.log(`  created ${o.orderNumber} [${o.status}/${o.paymentStatus}${o.productionStatus ? '/' + o.productionStatus : ''}]`);
    created++;
  }

  console.log(`\nDone: ${created} orders created.`);
}

async function main() {
  const isClean = process.argv.includes('--clean');
  if (isClean) {
    await clean();
  } else {
    await clean(); // always clean first so re-runs are idempotent
    await seed();
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
