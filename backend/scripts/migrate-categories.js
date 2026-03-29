require('dotenv').config({ path: __dirname + '/../.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The standard tree based on docs/CATEGORY-HIERARCHY-PLAN.md
const CATEGORY_TREE = {
  "T-shirts": [
    "Short Sleeve T-shirts",
    "Long Sleeve T-shirts",
    "Soft Tri-Blend T-shirts",
    "Performance Shirts",
    "Women's T-shirts",
    "Kids T-shirts",
    "Heavyweight T-shirts",
    "Tie-Dye T-shirts",
    "Tank Tops & Sleeveless",
    "No Minimum T-shirts",
    "Made in the USA T-shirts",
    "Tall T-shirts",
    "Sustainable T-shirts",
    "Canada T-shirts",
    "NEW T-shirts",
    "All T-shirts"
  ],
  "Hoodies & Sweatshirts": [
    "Hoodies",
    "Crewneck Sweatshirts",
    "Full Zip Sweatshirts",
    "Quarter Zip Sweatshirts",
    "Heavyweight Sweatshirts",
    "Lightweight Sweatshirts",
    "Champion Sweatshirts",
    "Carhartt Sweatshirts",
    "Nike Sweatshirts",
    "Performance Sweatshirts",
    "Fleece Jackets & Pullovers",
    "Premium Sweatshirts",
    "Women's Hoodies & Sweatshirts",
    "Kids Sweatshirts",
    "Tall Sweatshirts",
    "Embroidered Sweatshirts",
    "No Minimum Sweatshirts",
    "Canada Sweatshirts",
    "All Hoodies & Sweatshirts"
  ],
  "Hats": [
    "Baseball Hats",
    "Trucker Hats",
    "Beanies",
    "No Minimum Hats",
    "Dad Hats",
    "Patch Hats",
    "Rope Hats",
    "5 Panel Hats",
    "Premium Hats",
    "Embroidered Hats",
    "Bucket Hats",
    "New Era Hats",
    "Nike Hats",
    "Performance Hats",
    "Work Hats",
    "Visors",
    "Camo Hats",
    "Headbands",
    "Kids Hats",
    "Canada Hats",
    "NEW Hats",
    "All Hats"
  ],
  "Jackets & Vests": [
    "Fleece Jackets & Pullovers",
    "Soft Shell Jackets",
    "Vests",
    "The North Face Jackets",
    "Patagonia Jackets",
    "Insulated & Down Jackets",
    "Work Jackets",
    "Windbreakers",
    "Rain Jackets",
    "No Minimum Jackets",
    "Blazers",
    "Tech Fleece Jackets",
    "Track Jackets",
    "Women's Jackets",
    "Tall Jackets",
    "All Jackets"
  ],
  "Polo Shirts": [
    "Embroidered Polo Shirts",
    "Printed Polo Shirts",
    "Performance Polo Shirts",
    "Golf Polo Shirts",
    "Nike Dri-FIT Polo Shirts",
    "Under Armour Polo Shirts",
    "Adidas Polo Shirts",
    "Long Sleeve Polo Shirts",
    "Women's Polo Shirts",
    "No Minimum Polo Shirts",
    "Tall Polo Shirts",
    "Kids Polo Shirts",
    "Canada Polo Shirts",
    "NEW Polo Shirts",
    "All Polo Shirts"
  ],
  "Activewear": [
    "Short Sleeve Performance Shirts",
    "Long Sleeve Performance Shirts",
    "Team Jerseys",
    "Quarter Zip Performance Shirts",
    "Performance Tanks",
    "Women's Activewear",
    "Kids Activewear",
    "Under Armour Activewear",
    "Nike Activewear",
    "Performance Sweatshirts & Hoodies",
    "Performance Polos",
    "Track Jackets",
    "Performance Sweatpants",
    "Shorts",
    "No Minimum Activewear",
    "Rash Guards & Swim Shirts",
    "Performance Hats",
    "Canada Activewear",
    "All Activewear"
  ],
  "Women’s": [
    "Women's Short Sleeve T-shirts",
    "Women's Hoodies & Sweatshirts",
    "Women's Long Sleeve T-shirts",
    "Women's Vests & Jackets",
    "Women's Tank Tops",
    "Women's Activewear",
    "Yoga & Dance",
    "Women's Shorts & Pants",
    "Women's Business Apparel",
    "Women's Polos",
    "Bella + Canvas Women's",
    "No Minimum Women's",
    "Canada Women's",
    "View All"
  ],
  "Kids": [
    "Kids T-shirts",
    "Baby",
    "Toddlers",
    "Kids Sweats",
    "No Minimum Kids",
    "Kids Long Sleeve Shirts",
    "Kids Activewear",
    "Girls",
    "Kids Accessories",
    "Kids Hats",
    "Kids Outerwear",
    "Kids Polos",
    "Canada Kids",
    "View All"
  ],
  "Uncategorized": [
    "All Uncategorized"
  ]
};

// Map of canonical level 2 category names to their new generated properties (like id)
const stdL2Categories = new Map();

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function run() {
  console.log('🏁 Starting category hierarchy migration...');

  try {
    // 1. Create standard Level-1 and Level-2 categories
    for (const [l1Name, l2Names] of Object.entries(CATEGORY_TREE)) {
      // Find or create L1
      let l1Slug = generateSlug(l1Name);
      
      let l1Category = await prisma.category.findFirst({
        where: { name: l1Name, parentId: null }
      });

      if (!l1Category) {
        l1Category = await prisma.category.create({
          data: {
            name: l1Name,
            slug: l1Slug,
            isActive: true,
          }
        });
        console.log(`✅ Created Level 1: ${l1Name}`);
      } else {
        console.log(`⏩ Found Level 1: ${l1Name}`);
      }

      // Find or create L2
      for (let i = 0; i < l2Names.length; i++) {
        const l2Name = l2Names[i];
        const l2Slug = generateSlug(l1Name) + '-' + generateSlug(l2Name);
        
        let l2Category = await prisma.category.findFirst({
          where: { name: l2Name, parentId: l1Category.id }
        });

        if (!l2Category) {
          try {
             l2Category = await prisma.category.create({
              data: {
                name: l2Name,
                slug: l2Slug,
                parentId: l1Category.id,
                isActive: true,
                sortOrder: i * 10
              }
            });
            console.log(`  ✅ Created Level 2: ${l2Name}`);
          } catch (err) {
            if (err.code === 'P2002') {
              // slug conflict
              l2Category = await prisma.category.create({
                data: {
                  name: l2Name,
                  slug: l2Slug + '-' + Date.now(),
                  parentId: l1Category.id,
                  isActive: true,
                  sortOrder: i * 10
                }
              });
              console.log(`  ✅ Created Level 2 (with forced slug): ${l2Name}`);
            } else {
               throw err;
            }
          }
          
        } else {
           console.log(`  ⏩ Found Level 2: ${l2Name}`);
        }

        stdL2Categories.set(l2Name.toLowerCase(), l2Category);
      }
    }

    // Uncategorized catch-all
    const uncategorizedL2 = stdL2Categories.get('all uncategorized');

    // 2. Map existing Custom Categories to their proper Level-2 Parent,
    // or create custom L1/L2 structures
    const existingCategories = await prisma.category.findMany({
      where: { parentId: null } // Find top level ones that aren't the new L1s (we'll check)
    });

    for (const cat of existingCategories) {
      const lowerName = cat.name.toLowerCase();

      // Skip the standard Level-1 categories we just established
      if (Object.keys(CATEGORY_TREE).map(k => k.toLowerCase()).includes(lowerName)) {
        continue;
      }

      // If its name matches exactly to a Level-2 standard category name
      if (stdL2Categories.has(lowerName)) {
        const stdL2 = stdL2Categories.get(lowerName);
        // If it's the exact SAME record, omit
        if (stdL2.id === cat.id) continue;

        console.log(`🔄 Mapping Legacy Category "${cat.name}" -> Standard L2 "${stdL2.name}"`);
        
        // Migrate products
        await prisma.productCategory.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: stdL2.id }
        });
        await prisma.product.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: stdL2.id }
        });
        await prisma.offline_order_products.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: stdL2.id }
        });

        // Deprecate legacy category
        await prisma.category.update({
          where: { id: cat.id },
          data: { isActive: false, name: `[ARCHIVED] ${cat.name}` }
        });
      } else {
        // Did not match standard L1 or L2... Let's maintain it as its own L1,
        // and create an "All {name}" L2 for it.
        const legacyL2Name = `All ${cat.name}`;
        
        let customL2 = await prisma.category.findFirst({
          where: { parentId: cat.id, name: legacyL2Name }
        });

        if (!customL2) {
           console.log(`🔨 Converting Custom Category "${cat.name}" into L1 > L2 structure`);
           customL2 = await prisma.category.create({
             data: {
                name: legacyL2Name,
                slug: generateSlug(legacyL2Name) + '-' + Date.now(),
                parentId: cat.id,
                isActive: true
             }
           });
        }

        // Migrate products from legacy L1 to custom L2
        await prisma.productCategory.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: customL2.id }
        });
        await prisma.product.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: customL2.id }
        });
        await prisma.offline_order_products.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: customL2.id }
        });
      }
    }

    // 3. Any orphaned products without category?
    // Note: product categories are usually required, but `offline_order_products` hasn't always been strict or could be nullable in other versions.
    // In our DB, product.categoryId is String, so it shouldn't be null, but let's just make sure.
    // Actually Prisma guarantees it's not null if it's String and not String?
    
    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error rendering categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
