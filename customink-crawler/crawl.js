const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');
const fs = require('fs');

// Database Category IDs Mapping
const CATEGORY_MAP = {
    't-shirt': 'e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a',
    'tee': 'e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a',
    'shirt': 'e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a',
    'sweatshirt': '627eb588-d69a-4d7b-b280-8c0e16ee6526',
    'hoodie': '627eb588-d69a-4d7b-b280-8c0e16ee6526',
    'hat': 'aba58bdc-fa9f-49e5-a183-c9495ce4e61e',
    'cap': '3c966f7d-df54-42f6-9d63-aa7c6989106f',
    'mug': '0d71823c-6384-49a8-9473-47997b2ff81b',
};

const DEFAULT_CATEGORY_ID = 'e2dbb0c4-8cf8-4b03-b8a1-3a0d6b64490a'; // Default to T-Shirts if unknown

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport to a reasonable desktop size
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating to CustomInk Apparel page...');
    const START_URL = 'https://www.customink.com/products/apparel/857';
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(START_URL, { waitUntil: 'networkidle2' });

    // Step 1: Get Subcategory Links (Simplified for this task: just grab the main ones or crawl the main list if it shows everything)
    const subCategories = await page.evaluate(() => {
        // Find links that look like /products/... inside the main content area.
        const links = Array.from(document.querySelectorAll('a[href*="/products/"]'));
        return links
            .filter(a => !a.href.includes('?'))
            .map(a => ({ href: a.href, text: a.innerText }))
            .filter(l => l.text.length > 2 && l.text.length < 50);
    });

    // Deduplicate
    const uniqueLinks = [...new Set(subCategories.map(s => s.href))];
    console.log(`Found ${uniqueLinks.length} potential subcategory links.`);

    let allProducts = [];

    // Check if current page has products
    // Wait for content to stabilize
    await new Promise(r => setTimeout(r, 3000));

    // Check if this page itself has products
    const hasArticle = await page.$('article');
    const hasPcCard = await page.$('.pc-ProductCard');

    if (hasArticle || hasPcCard) {
        console.log('Page seems to list products directly. Crawling this page...');
        const products = await crawlPageForProducts(page, START_URL);
        allProducts = [...allProducts, ...products];
    } else {
        console.log('Page seems to be a category hub. visiting subcategories...');
        // Heuristic: leaf categories (product lists) usually have longer URLs (more segments)
        // e.g. /products/t-shirts/short-sleeve-t-shirts/16 vs /products/t-shirts/4
        const relevantLinks = uniqueLinks
            .filter(l => l.includes('/products/') && !l.includes('apparel'))
            .filter(l => {
                try {
                    const path = new URL(l).pathname;
                    const segments = path.split('/').filter(s => s.length > 0);
                    // products, category, subcategory, id = 4 segments
                    return segments.length >= 4;
                } catch (e) { return false; }
            })
            // Sort by length desc to get most specific first
            .sort((a, b) => b.length - a.length);

        // Crawl ALL deep subcategories
        console.log(`Found ${relevantLinks.length} deep links. Starting full crawl...`);
        // console.log('Targets:', relevantLinks);

        for (const link of relevantLinks) {
            if (link === START_URL) continue;
            console.log(`Navigating to subcategory: ${link}`);
            try {
                const products = await crawlPageForProducts(page, link);
                allProducts = [...allProducts, ...products];
            } catch (e) {
                console.error(`Failed to crawl ${link}: ${e.message}`);
            }
        }
    }

    // Deduplicate products by URL or Name
    const uniqueProducts = [];
    const seenUrls = new Set();
    for (const p of allProducts) {
        if (!seenUrls.has(p.productUrl)) {
            seenUrls.add(p.productUrl);
            uniqueProducts.push(p);
        }
    }

    console.log(`Total unique products found: ${uniqueProducts.length}`);

    // Generate CSVs
    await generateCsvs(uniqueProducts);

    await browser.close();
}

async function crawlPageForProducts(page, url) {
    if (page.url() !== url) {
        await page.goto(url, { waitUntil: 'networkidle2' });
    }

    // Handle "Load More"
    try {
        let loadMoreVisible = true;
        while (loadMoreVisible) {
            const loadMoreBtn = await page.$('button[data-testid="load-more-products-button"], button');
            // We need to be specific or check text content if ID is missing.
            // Analysis said: `button[data-testid="load-more-products-button"]`

            const btn = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(b => b.innerText.toLowerCase().includes('load more')) || null;
            });

            if (btn && btn.asElement()) {
                console.log('Clicking "Load More"...');
                await btn.asElement().click();
                // Wait for new items. Best way is wait for network idle or a pause
                await new Promise(r => setTimeout(r, 2000)); // Simple wait
            } else {
                loadMoreVisible = false;
            }

            // Safety break for testing (remove for full production or set high limit)
            // if (allProducts.length > 200) break; 
        }
    } catch (e) {
        console.warn('Error handling pagination:', e.message);
    }

    // Extract products
    const products = await page.evaluate(() => {
        const items = [];

        // Strategy A: article tags (Agent observed)
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
            articles.forEach(art => {
                const link = art.querySelector('a.css-1v19gvo') || art.querySelector('a');
                const img = art.querySelector('img');
                const priceSpan = art.querySelector('span[class*="css-"] > span');

                if (link && img) {
                    let imageUrl = img.src;
                    if (imageUrl.includes('?')) imageUrl = imageUrl.split('?')[0];
                    let priceText = priceSpan ? priceSpan.innerText : '0';
                    items.push({
                        name: link.innerText,
                        productUrl: link.href,
                        imageUrl: imageUrl,
                        priceText: priceText
                    });
                }
            });
            return items;
        }

        // Strategy B: .pc-ProductCard (Observed in dump)
        const cards = document.querySelectorAll('.pc-ProductCard');
        cards.forEach(card => {
            // Skip skeletons
            if (card.querySelector('.MuiSkeleton-root')) return;

            const link = card.querySelector('a.pc-ProductCard-link') || card.querySelector('a');
            const img = card.querySelector('img');

            // Name/Price often in a sibling div or inside the link
            // Let's grab full text and parse
            const text = card.innerText;
            const priceMatch = text.match(/\$\d+\.\d+/);
            const priceText = priceMatch ? priceMatch[0] : '0';

            // Name is usually the first non-empty line or the alt text of image
            let name = 'Unknown';
            if (img && img.alt && img.alt !== 'Product') name = img.alt;
            else if (link) name = link.innerText.replace(priceText, '').trim();

            // Fallback for name: split text
            if (!name || name === 'Unknown') {
                const lines = text.split('\n').filter(l => l.trim().length > 0);
                if (lines.length > 0) name = lines[0];
            }

            if (link && img) {
                let imageUrl = img.src;
                if (imageUrl.includes('?')) imageUrl = imageUrl.split('?')[0];

                items.push({
                    name: name,
                    productUrl: link.href,
                    imageUrl: imageUrl,
                    priceText: priceText
                });
            }
        });

        return items;
    });

    console.log(`Found ${products.length} products on ${url}`);
    return products;
}

async function generateCsvs(products) {
    const productsWriter = createCsvWriter({
        path: 'products.csv',
        header: [
            { id: 'id', title: 'id' },
            { id: 'name', title: 'name' },
            { id: 'slug', title: 'slug' },
            { id: 'description', title: 'description' },
            { id: 'base_price_cents', title: 'base_price_cents' },
            { id: 'category_id', title: 'category_id' },
            { id: 'sku', title: 'sku' },
            { id: 'is_active', title: 'is_active' },
        ]
    });

    const imagesWriter = createCsvWriter({
        path: 'product_images.csv',
        header: [
            { id: 'id', title: 'id' },
            { id: 'product_id', title: 'product_id' },
            { id: 'url', title: 'url' },
            { id: 'sort_order', title: 'sort_order' },
        ]
    });

    // We are not writing variants csv for now as per minimal viable plan, 
    // but the plan mentioned it. Let's stick to products and images first as requested to "import into database"
    // The user really wants connection, so let's format data correctly.

    const productRecords = [];
    const imageRecords = [];

    for (const p of products) {
        const pid = uuidv4();
        const slug = slugify(p.name, { lower: true, strict: true }) + '-' + pid.substring(0, 4);

        // Price parsing
        // $7.90 -> 790
        const priceClean = p.priceText.replace(/[^0-9.]/g, '');
        const cents = Math.round(parseFloat(priceClean || '0') * 100);

        // Category Matching
        let catId = DEFAULT_CATEGORY_ID;
        const lowerName = p.name.toLowerCase();
        for (const [key, val] of Object.entries(CATEGORY_MAP)) {
            if (lowerName.includes(key)) {
                catId = val;
                break;
            }
        }

        productRecords.push({
            id: pid,
            name: p.name,
            slug: slug,
            description: `Imported product: ${p.name}`,
            base_price_cents: cents,
            category_id: catId,
            sku: `CINK-${uuidv4().substring(0, 8).toUpperCase()}`,
            is_active: 'true'
        });

        imageRecords.push({
            id: uuidv4(),
            product_id: pid, // Using the same ID
            url: p.imageUrl,
            sort_order: 0
        });
    }

    await productsWriter.writeRecords(productRecords);
    await imagesWriter.writeRecords(imageRecords);

    console.log('CSV files generated successfully.');
}

run().catch(console.error);
