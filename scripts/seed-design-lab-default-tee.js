/**
 * Seed: Design Lab Default Tee
 * Creates the system product used when entering Design Lab from the top nav.
 * slug = 'design-lab-default-tee', isSystem = true (excluded from all product listings)
 */

require('dotenv').config({ path: './backend/.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Matches COLOR_HEX_MAP in TagFilterPanel.tsx
const COLORS = [
  { name: 'White',          hex: '#FFFFFF' },
  { name: 'Black',          hex: '#111111' },
  { name: 'Ash',            hex: '#C9C9C9' },
  { name: 'Sport Grey',     hex: '#9EA3A8' },
  { name: 'Charcoal',       hex: '#3D3D3D' },
  { name: 'Dark Heather',   hex: '#4A4A4A' },
  { name: 'Natural',        hex: '#F5F0E1' },
  { name: 'Vintage White',  hex: '#EDE8D5' },
  { name: 'Navy',           hex: '#1B2A4A' },
  { name: 'Royal Blue',     hex: '#1F4DAA' },
  { name: 'Sapphire',       hex: '#0E4F8F' },
  { name: 'Indigo',         hex: '#3B3C8C' },
  { name: 'Carolina Blue',  hex: '#82B4D8' },
  { name: 'Light Blue',     hex: '#A8D0E6' },
  { name: 'Turquoise',      hex: '#00A9C0' },
  { name: 'Red',            hex: '#CC2529' },
  { name: 'Cherry Red',     hex: '#B22040' },
  { name: 'Cardinal Red',   hex: '#8B1A2D' },
  { name: 'Maroon',         hex: '#5C1A2A' },
  { name: 'Heliconia',      hex: '#CD2C6E' },
  { name: 'Azalea',         hex: '#E8638E' },
  { name: 'Coral',          hex: '#E8604C' },
  { name: 'Light Pink',     hex: '#F5AABB' },
  { name: 'Daisy',          hex: '#F5C842' },
  { name: 'Gold',           hex: '#D4A800' },
  { name: 'Orange',         hex: '#E5581A' },
  { name: 'Safety Orange',  hex: '#FF6600' },
  { name: 'Purple',         hex: '#6B3F8F' },
  { name: 'Violet',         hex: '#5B3D8F' },
  { name: 'Irish Green',    hex: '#2A7B3F' },
  { name: 'Forest Green',   hex: '#2D5C34' },
  { name: 'Military Green', hex: '#3E4A2F' },
  { name: 'Lime',           hex: '#93C83D' },
  { name: 'Brown',          hex: '#5C3A1E' },
  { name: 'Sand',           hex: '#C8B880' },
  { name: 'Tan',            hex: '#C8A87A' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const CATEGORY_ID = 'ec0b0984-86f8-4354-bccb-80d4d8433570'; // T-shirts
const SLUG = 'design-lab-default-tee';

async function main() {
  // Upsert: delete existing variants + product, then recreate cleanly
  const existing = await prisma.product.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log('Found existing product, deleting variants...');
    await prisma.variant.deleteMany({ where: { productId: existing.id } });
    await prisma.product.delete({ where: { id: existing.id } });
    console.log('Deleted existing product.');
  }

  const product = await prisma.product.create({
    data: {
      name: 'Design Lab Default Tee',
      slug: SLUG,
      description: 'System product for Design Lab — not for sale.',
      basePrice: 0,
      sku: 'SYSTEM-DESIGN-LAB-DEFAULT-TEE',
      isCustomizable: true,
      isActive: true,
      isDraft: false,
      isSystem: true,
      stockQuantity: 9999,
      categoryId: CATEGORY_ID,
      tags: [],
    },
  });

  console.log(`Created product: ${product.id} (${product.slug})`);

  // Create one variant per color × size
  const variants = [];
  for (const color of COLORS) {
    for (const size of SIZES) {
      const colorSlug = color.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      variants.push({
        productId: product.id,
        color: color.name,
        colorHex: color.hex,
        colorDisplayName: color.name,
        size,
        sku: `SYSTEM-DL-DEFAULT-${colorSlug}-${size}`,
        stockQuantity: 9999,
        priceAdjustment: 0,
      });
    }
  }

  await prisma.variant.createMany({ data: variants });
  console.log(`Created ${variants.length} variants (${COLORS.length} colors × ${SIZES.length} sizes).`);
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
