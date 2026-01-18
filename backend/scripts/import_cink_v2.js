require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const CSV_DIR = path.join(__dirname, '../../customink-crawler/output_v2');

async function parseCsv(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

async function main() {
    console.log('🚀 Starting V2 Data Import...');

    // 1. Read CSVs
    console.log('Reading CSV files...');
    const products = await parseCsv(path.join(CSV_DIR, 'products.csv'));
    const variants = await parseCsv(path.join(CSV_DIR, 'product_variants.csv'));
    const images = await parseCsv(path.join(CSV_DIR, 'product_images.csv'));

    console.log(`Loaded: ${products.length} Products, ${variants.length} Variants, ${images.length} Images.`);

    // Load Color Mappings from Settings for Hex lookup (Phase 3)
    let colorHexMap = new Map();
    try {
        const settings = await prisma.settings.findFirst({ // Fixed: settings (plural)
            where: { key: 'site.colorMappings' }
        });
        if (settings && settings.value) {
            const mappings = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value;
            if (Array.isArray(mappings)) {
                mappings.forEach(m => {
                    const name = m.productColor || m.name;
                    const hex = (m.values && m.values.length > 0) ? m.values[0] : m.hex;
                    if (name && hex) {
                        colorHexMap.set(name, hex);
                    }
                });
                console.log(`Loaded ${mappings.length} color mappings for Hex lookup.`);
            }
        }
    } catch (e) {
        console.warn('Failed to load color mappings from DB:', e.message);
    }

    // 2. Ensure Category Exists... (No change needed here)

    // ... Skipping to Step 6 Logic ...
    // Since I cannot skip code in replace_file_content easily without context matching failure if code changed...
    // I will replace the START (settings fix) and then use a separate call or large chunk for the end.
    // Actually, I can't do multiple disjoint replacements in one go unless I use multi_replace.
    // I used `StartLine: 36` in previous context but here I am targeting line ~36?
    // Let's use `multi_replace_file_content` for safety.


    // 2. Ensure Category Exists
    // The crawler used "e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a" for T-Shirts
    const CATEGORY_ID = 'e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a';
    await prisma.category.upsert({
        where: { id: CATEGORY_ID },
        update: {},
        create: {
            id: CATEGORY_ID,
            name: 'T-Shirts',
            slug: 't-shirts-v2',
            description: 'Imported by V2 Crawler'
        }
    });

    // 3. Import Products
    console.log('Importing Products...');
    for (const p of products) {
        // Map CSV fields to Prisma model
        try {
            await prisma.product.create({
                data: {
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    description: p.description,
                    basePrice: parseInt(p.base_price_cents || 0),
                    unitCost: parseInt(p.unit_cost || 0) || Math.round(parseInt(p.base_price_cents || 0) * 0.4),
                    salePrice: parseInt(p.sale_price || 0) || Math.round(parseInt(p.base_price_cents || 0) * 1.5),
                    grossProfit: (parseInt(p.sale_price || 0) || Math.round(parseInt(p.base_price_cents || 0) * 1.5)) - (parseInt(p.unit_cost || 0) || Math.round(parseInt(p.base_price_cents || 0) * 0.4)),
                    weight: p.weight ? parseFloat(p.weight) : 0.5,
                    dimensions: p.dimensions || "12x10x1",
                    printableAreas: p.printable_areas ? JSON.parse(p.printable_areas) : undefined,
                    categoryId: p.category_id,
                    sku: p.sku,
                    isActive: p.is_active === 'true',
                    isCustomizable: true
                }
            });
        } catch (e) {
            console.warn(`Skipping product ${p.name} (might exist): ${e.message}`);
        }
    }

    // 4. Import Variants
    console.log('Importing Variants (Batching)...');
    // Prisma createMany is efficient
    // Build Color -> Image Map
    const colorImageMap = new Map();
    products.forEach(p => {
        const productImages = images.filter(i => i.product_id === p.id);
        productImages.forEach(img => {
            const prefix = `${p.name} - `;
            if (img.alt_text && img.alt_text.startsWith(prefix)) {
                const colorName = img.alt_text.substring(prefix.length);
                const key = `${p.id}:${colorName}`;
                // Prefer primary
                if (!colorImageMap.has(key) || img.is_primary === 'true') {
                    colorImageMap.set(key, img.url);
                }
            }
        });
    });

    const variantPayloads = variants.map(v => {
        const key = `${v.product_id}:${v.color}`;
        const imgUrl = colorImageMap.get(key) || null;

        return {
            id: v.id,
            productId: v.product_id,
            // name: v.name, // Removed
            color: v.color,
            colorHex: colorHexMap.get(v.color) || null, // Lookup Hex
            colorDisplayName: v.color, // Use color name as display name
            size: v.size,
            sku: v.sku,
            priceAdjustment: 0,
            stockQuantity: 10,
            imageUrl: imgUrl
        };
    });

    // Split into chunks of 1000
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < variantPayloads.length; i += CHUNK_SIZE) {
        const chunk = variantPayloads.slice(i, i + CHUNK_SIZE);
        try {
            await prisma.variant.createMany({
                data: chunk,
                skipDuplicates: true
            });
            console.log(`  Imported variants chunk ${i} - ${i + chunk.length}`);
        } catch (e) {
            console.error(`  Error importing variants chunk ${i}:`, e.message);
        }
    }

    // 5. Import Product Images (Gallery)
    console.log('Importing Product Images...');
    // We only want unique images per product, usually the primary ones from the crawler
    // The images table has `is_primary`.
    const imagePayloads = images.map(img => ({
        id: img.id,
        productId: img.product_id,
        url: img.url,
        alt: img.alt_text,
        sortOrder: img.is_primary === 'true' ? 0 : 10
    }));

    try {
        await prisma.productImage.createMany({
            data: imagePayloads,
            skipDuplicates: true
        });
        console.log(`  Imported ${images.length} images.`);
    } catch (e) {
        console.error('  Error importing images:', e.message);
    }

    // 6. Generate ProductColorImage (Crucial for Wizard)
    console.log('Generating ProductColorImage records...');

    // Group images by productId:colorName
    const colorImagesGroup = new Map(); // Key: `${productId}:${colorName}` -> Array of URLs

    // Build the map from ALL images
    for (const img of images) {
        const prod = products.find(p => p.id === img.product_id);
        if (!prod) continue;

        let colorName = null;
        const prefix = `${prod.name} - `;

        // Try to heuristic parse color name
        if (img.alt_text) {
            let coreText = img.alt_text;
            if (img.alt_text.startsWith(prefix)) {
                coreText = img.alt_text.substring(prefix.length);
            }

            // coreText is now "ColorName - View" or "ColorName".
            // We handle potential "Color - Name - View" by checking suffix.
            // We assume View is always one of known views.
            const parts = coreText.split(' - ');
            if (parts.length > 0) {
                const lastPart = parts[parts.length - 1].trim().toLowerCase();
                // Check if last part is a view
                if (['front', 'back', 'left', 'right'].includes(lastPart)) {
                    parts.pop(); // Remove view
                }
                // Join remaining as color Name
                colorName = parts.join(' - ');
            }
        }

        if (colorName) {
            const key = `${img.product_id}:${colorName}`;
            if (!colorImagesGroup.has(key)) {
                colorImagesGroup.set(key, []);
            }
            colorImagesGroup.get(key).push(img);
        }
    }

    // Now build map for variants (prefer front)
    const colorFrontImageMap = new Map();

    // Map Color ID to Color Name
    const colorIdMap = new Map();
    variants.forEach(v => {
        const key = `${v.product_id}:${v.color}`;
        if (!colorIdMap.has(key)) {
            colorIdMap.set(key, v.color_id);
        }
    });

    const dedupedProductColorKeys = new Set();
    const colorImagesPayload = [];

    for (const [key, imgs] of colorImagesGroup) {
        const [productId, colorName] = key.split(':');
        // Find Color ID
        const colorId = colorIdMap.get(key);
        if (!colorId) continue;

        // Sort images: Front first, then others
        // Heuristic: Front is usually "Product - Color" or doesn't have "back/left/right"
        // In existing data: Front has is_primary='true' or alt starts with product name.
        const frontImg = imgs.find(i => i.is_primary === 'true') || imgs[0];

        // Save Front image for Variant mapping
        colorFrontImageMap.set(key, frontImg.url);

        const uniqueKey = `${productId}:${colorId}`;
        if (!dedupedProductColorKeys.has(uniqueKey)) {
            dedupedProductColorKeys.add(uniqueKey);

            colorImagesPayload.push({
                id: uuidv4(),
                productId: productId,
                customInkProductId: products.find(p => p.id === productId).sku.replace('CINK-', ''),
                customInkColorId: colorId,
                colorName: colorName,
                colorHex: colorHexMap.get(colorName) || null, // Lookup Hex
                imageUrls: imgs.map(i => i.url), // All views
                isVerified: true
            });
        }
    }

    // Apply front images to variants
    // (This part is inside the variants mapping block above, so we need to move the map building BEFORE variants)
    // Redefining variants mapping now that we have the map.
    // NOTE: In this replacement, I am replacing the END of the file logic (Step 6).
    // BUT Step 4 (Variants) comes BEFORE Step 6.
    // I need to update the WHOLE logic or re-order.
    // Since I cannot move code easily with replace_content in one go if they are far apart.
    // I will use `colorImageMap` logic I added in previous turn.
    // PREVIOUS TURN UPDATED STEP 4 to use `colorImageMap`.
    // I should simply UPDATE `colorImageMap` construction logic to specifically pick FRONT images.

    // ... wait, Step 4 runs before Step 6.
    // I need to update Step 4's map building logic to be smarter about Views.

    // This tool call is targeting Step 6 (Generation). I will fix Step 6 first.
    // But Step 6 logic I wrote above looks correct for creating `ProductColorImage`.

    // For `Variant` `imageUrl`, I need to update Step 4 separately?
    // Let's do Step 6 first.

    if (colorImagesPayload.length > 0) {
        await prisma.productColorImage.createMany({
            data: colorImagesPayload,
            skipDuplicates: true
        });
        console.log(`  Imported ${colorImagesPayload.length} ProductColorImage records (Wizard mappings).`);
    } else {
        console.warn('  ⚠️ No color mappings generated. Verify logic.');
    }

    console.log('✅ Import sequence complete.');
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
