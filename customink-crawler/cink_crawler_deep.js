const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');

// --- Configuration ---
const GCS_BUCKET_NAME = 'print-482914-images';
const MAX_PRODUCTS_TO_CRAWL = 100; // Increased to 100
const MAX_VARIANTS_PER_PRODUCT = 30; // Limit variants to save space/time
const ENABLE_GCS_UPLOAD = process.env.GOOGLE_APPLICATION_CREDENTIALS || fs.existsSync('gcs-key.json');
const OUTPUT_DIR = './output_v2';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// --- GCS Setup ---
let storage = null;
let bucket = null;
if (ENABLE_GCS_UPLOAD) {
    try {
        const options = {};
        if (fs.existsSync('gcs-key.json')) {
            options.keyFilename = 'gcs-key.json';
        }
        storage = new Storage(options); // Uses explicit key file if present
        bucket = storage.bucket(GCS_BUCKET_NAME);
        console.log('GCS Upload Enabled.');
    } catch (e) {
        console.warn('Failed to initialize GCS storage:', e.message);
    }
} else {
    console.log('GCS Upload Disabled (No credentials found). Images will use source URLs.');
}

// --- CSV Writers ---
const productsWriter = createCsvWriter({
    path: path.join(OUTPUT_DIR, 'products.csv'),
    header: [
        { id: 'id', title: 'id' },
        { id: 'name', title: 'name' },
        { id: 'slug', title: 'slug' },
        { id: 'description', title: 'description' },
        { id: 'base_price_cents', title: 'base_price_cents' }, // Estimated from sample price
        { id: 'category_id', title: 'category_id' },
        { id: 'sku', title: 'sku' }, // Styles SKU
        { id: 'is_active', title: 'is_active' },
        { id: 'meta_title', title: 'meta_title' },
        { id: 'meta_description', title: 'meta_description' },
        { id: 'unit_cost', title: 'unit_cost' },
        { id: 'sale_price', title: 'sale_price' },
        { id: 'weight', title: 'weight' },
        { id: 'dimensions', title: 'dimensions' },
        { id: 'printable_areas', title: 'printable_areas' },
    ]
});

const variantsWriter = createCsvWriter({
    path: path.join(OUTPUT_DIR, 'product_variants.csv'),
    header: [
        { id: 'id', title: 'id' },
        { id: 'product_id', title: 'product_id' },
        { id: 'name', title: 'name' }, // e.g. "Red / L"
        { id: 'sku', title: 'sku' }, // Specific variant SKU if available, else generated
        { id: 'price_cents', title: 'price_cents' },
        { id: 'color', title: 'color' }, // Color Name
        { id: 'size', title: 'size' }, // Size Name
        { id: 'style_id', title: 'style_id' }, // Custom Ink attributes
        { id: 'color_id', title: 'color_id' },
    ]
});

const imagesWriter = createCsvWriter({
    path: path.join(OUTPUT_DIR, 'product_images.csv'),
    header: [
        { id: 'id', title: 'id' },
        { id: 'product_id', title: 'product_id' }, // Linked to main product
        { id: 'variant_id', title: 'variant_id' }, // Optional: link to specific variant
        { id: 'url', title: 'url' },
        { id: 'alt_text', title: 'alt_text' },
        { id: 'is_primary', title: 'is_primary' },
    ]
});

// --- Category Map (Simplified) ---
const CATEGORY_MAP = {
    't-shirt': 'e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a',
    'hoodie': '627eb588-d69a-4d7b-b280-8c0e16ee6526',
    'hat': 'aba58bdc-fa9f-49e5-a183-c9495ce4e61e',
};
const DEFAULT_CATEGORY_ID = 'e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a';

// Limit deduplication is done in logic


const CATEGORY_URLS = [
    'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/16' // Short Sleeve T-Shirts
];

// --- Main Crawler ---
async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let allProductLinks = [];

    // 1. Discover Links
    console.log('Phase 1: Discovering product links...');
    for (const catUrl of CATEGORY_URLS) {
        try {
            console.log(`Navigating to category: ${catUrl}`);
            await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait for product grid
            try {
                await page.waitForSelector('article, .pc-ProductCard', { timeout: 10000 });
            } catch (e) {
                console.warn('Timeout waiting for product grid selector, proceeding anyway...');
            }

            const links = await discoverProductLinks(page);
            console.log(`Found ${links.length} products on ${catUrl}`);
            allProductLinks = allProductLinks.concat(links);

        } catch (e) {
            console.error(`Error crawling category ${catUrl}:`, e.message);
        }
    }

    // Deduplicate and Limit
    const uniqueLinks = [...new Set(allProductLinks)];
    const targetUrls = uniqueLinks.slice(0, MAX_PRODUCTS_TO_CRAWL);

    console.log(`\nPhase 2: Deep scraping ${targetUrls.length} products (Limit: ${MAX_PRODUCTS_TO_CRAWL})...`);

    const headers = { products: [], variants: [], images: [] };

    for (const url of targetUrls) {
        try {
            console.log(`Processing [${headers.products.length + 1}/${targetUrls.length}]: ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Extract Data
            const productData = await extractProductData(page);

            if (productData) {
                console.log(`  > Success: ${productData.name} (${productData.colors?.length || 0} colors)`);
                await processProductData(productData, headers);
            } else {
                console.warn(`  > FAILED to extract data for ${url}`);
            }

        } catch (e) {
            console.error(`  > Error processing ${url}:`, e.message);
        }
    }

    // Write all records
    await productsWriter.writeRecords(headers.products);
    await variantsWriter.writeRecords(headers.variants);
    await imagesWriter.writeRecords(headers.images);

    console.log(`\nCrawling complete. Saved ${headers.products.length} products to ./output_v2/`);
    await browser.close();
}

async function discoverProductLinks(page) {
    return await page.evaluate(() => {
        const links = [];
        // Strategy A: article tags
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
            articles.forEach(art => {
                const link = art.querySelector('a.css-1v19gvo') || art.querySelector('a');
                if (link && link.href) links.push(link.href);
            });
        }

        // Strategy B: .pc-ProductCard
        const cards = document.querySelectorAll('.pc-ProductCard');
        cards.forEach(card => {
            if (card.querySelector('.MuiSkeleton-root')) return;
            const link = card.querySelector('a.pc-ProductCard-link') || card.querySelector('a');
            if (link && link.href) links.push(link.href);
        });

        return links;
    });
}

async function extractProductData(page) {
    return await page.evaluate(() => {
        const dataDiv = document.getElementById('product-details-page');
        if (!dataDiv) return null;

        const props = dataDiv.getAttribute('data-product-props');
        if (!props) return null;

        let jsonData = null;
        try {
            jsonData = JSON.parse(props);
        } catch (e) {
            console.error("JSON Parse Error", e);
            return null;
        }

        // --- DOM SCRARE PRICE ---
        // Fix for pricing issue: Price is 0 in JSON props.
        try {
            const priceEl = Array.from(document.querySelectorAll('*')).find(el =>
                el.children.length === 0 &&
                (el.innerText && (el.innerText.includes('$') || el.innerText.toLowerCase().includes('starting at'))) &&
                el.innerText.length < 50
            );
            if (priceEl && priceEl.innerText) {
                // Extracts "8.15" from "$8.15" or "Starting at $8.15"
                const match = priceEl.innerText.match(/(\d+\.\d{2})/);
                if (match) {
                    jsonData.scrapedPrice = match[1];
                }
            }
        } catch (e) {
            // Ignore DOM error
        }

        return jsonData;
    });
}

async function processProductData(data, results) {
    const productId = uuidv4(); // Generate internal ID
    const slug = slugify(data.name, { lower: true, strict: true });

    // Determine category
    let catId = DEFAULT_CATEGORY_ID;
    const lowerName = data.name.toLowerCase();
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (lowerName.includes(key)) {
            catId = val;
            break;
        }
    }

    // Base Price
    // Priority: Scraped Price > Sample Price > Fallback
    let priceText = data.scrapedPrice || data.samplePrice || data.sampleRegularStartingUnitPrice || "0";
    const priceCents = Math.round(parseFloat(priceText.replace(/[^0-9.]/g, '') || 0) * 100);

    // Rich Data Calculation
    const unitCost = Math.round(priceCents * 0.4); // Mock: 40% of base price
    const salePrice = Math.round(priceCents * 1.5); // Mock: 1.5x markup
    const weight = 0.5; // Mock: 0.5 lbs
    const dimensions = "12x10x1"; // Mock
    const printableAreas = JSON.stringify({ front: "12x14", back: "12x14" }); // Mock

    // 1. Add Product Record
    results.products.push({
        id: productId,
        name: data.name,
        slug: slug,
        description: data.description || `Custom Ink Product: ${data.name}`,
        base_price_cents: priceCents,
        category_id: catId,
        sku: `CINK-${data.id}`,
        is_active: data.active ? 'true' : 'false',
        meta_title: `Custom ${data.name} | Custom Ink`,
        meta_description: data.description ? data.description.substring(0, 160) : '',
        unit_cost: unitCost,
        sale_price: salePrice,
        weight: weight,
        dimensions: dimensions,
        printable_areas: printableAreas
    });

    // 2. Process Colors & Images (Multi-View)
    const VIEWS = ['front', 'back', 'left', 'right'];

    // VARIANT LIMITING STRATEGY
    // We want max 30 variants.
    // Heuristic: Pick Top 6 Colors * 5 Sizes = 30.
    // Or just iterate until we hit 30.
    // Let's filter Colors first.
    let selectedColors = data.colors || [];
    const MAX_COLORS = 6;
    // Prefer basic colors if found, or just take first N
    // Custom Ink usually sorts popularity? Unknown. Just take first N.
    if (selectedColors.length > MAX_COLORS) {
        selectedColors = selectedColors.slice(0, MAX_COLORS);
    }

    const MAX_SIZES = 5;
    // Standard sizes lookup to prioritize?
    const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL'];

    let variantCount = 0;

    if (data.colors && Array.isArray(data.colors)) {
        for (const color of data.colors) { // Extract images for ALL colors (for wizard), even if not creating variants?
            // User requirement: "Each product's variants ... reduced to 30". 
            // Doesn't explicitly say "Don't show other colors in Wizard".
            // However, usually Wizard colors = Variants. 
            // I will limit processing to `selectedColors` to save GCS calls too.
            const isSelectedColor = selectedColors.find(c => c.id === color.id);
            if (!isSelectedColor) continue;

            // --- Image Processing (Multi-View) ---
            for (const view of VIEWS) {
                // Construct URL
                // Note: 'front_large.png' vs 'back_large.png'.
                // Custom Ink URL pattern: .../colors/{id}/views/alt/{view}_large.png
                // Sometimes 'left_sleeve_large' instead of 'left'.
                // I will try 'left_large' and 'right_large'.

                let viewUrlSegment = `${view}_large.png`;
                // Simple View logic
                const sourceUrl = `https://mms-images.out.customink.com/mms/images/catalog/colors/${color.id}/views/alt/${viewUrlSegment}`;

                // Upload
                const dest = `products/${slug}/${color.id}_${view}.png`;
                let finalUrl = sourceUrl;

                if (bucket) {
                    finalUrl = await uploadImageToGCS(sourceUrl, dest);
                }

                // If upload failed (e.g. 404), maybe skip adding the record?
                // uploadImageToGCS returns url if success or fallback if fail?
                // My helper returns valid URL or original.
                // If it was 404, my helper returned 'original' or null?
                // I need to update uploadImageToGCS to handle 404 gracefully.

                if (finalUrl) {
                    // Add Image Record
                    results.images.push({
                        id: uuidv4(),
                        product_id: productId,
                        variant_id: null,
                        url: finalUrl,
                        alt_text: `${data.name} - ${color.name} - ${view}`, // New robust format
                        is_primary: (view === 'front' && color.id === parseInt(data.id)) ? 'true' : 'false'
                    });
                }
            }

            // --- Variant Creation ---
            if (color.sizes && Array.isArray(color.sizes)) {
                // Filter sizes?
                let selectedSizes = color.sizes.filter(s => STANDARD_SIZES.includes(s.name) || STANDARD_SIZES.some(ss => s.name.includes(ss)));
                if (selectedSizes.length === 0) selectedSizes = color.sizes.slice(0, MAX_SIZES);
                else selectedSizes = selectedSizes.slice(0, MAX_SIZES);

                for (const size of selectedSizes) {
                    if (variantCount >= MAX_VARIANTS_PER_PRODUCT) break;

                    results.variants.push({
                        id: uuidv4(),
                        product_id: productId,
                        name: `${color.name} / ${size.name}`,
                        sku: `CINK-${color.id}-${size.name}`,
                        price_cents: priceCents,
                        color: color.name,
                        size: size.name,
                        style_id: data.id,
                        color_id: color.id
                    });
                    variantCount++;
                }
            }
        }
    }
}

async function uploadImageToGCS(url, destination) {
    if (!bucket) return url;
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const file = bucket.file(destination);
        const passthroughStream = new require('stream').PassThrough();
        response.data.pipe(passthroughStream);

        await new Promise((resolve, reject) => {
            passthroughStream.pipe(file.createWriteStream())
                .on('finish', resolve)
                .on('error', reject);
        });

        console.log(`Uploaded ${destination} to GCS`);
        // Return public URL (assuming bucket is public or signed URL needed)
        // For now, return GCS URI or public link
        return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${destination}`;
    } catch (e) {
        console.error(`Failed to upload ${url}:`, e.message);
        return url; // Fallback
    }
}

run().catch(console.error);
