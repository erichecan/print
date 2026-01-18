const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const PRODUCT_URL = 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/gildan-softstyle-jersey-t-shirt/176100';
    console.log(`Navigating to: ${PRODUCT_URL}`);

    try {
        await page.goto(PRODUCT_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    } catch (e) {
        console.log("Navigation timeout, proceeding...");
    }

    // Wait for manual hydration if needed
    await new Promise(r => setTimeout(r, 10000));

    // Interact to trigger potential lazy loading? Scroll down.
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 2000));

    // Extract ProductCatalog
    const catalog = await page.evaluate(() => {
        try {
            return window.ProductCatalog || 'ProductCatalog not found';
        } catch (e) {
            return e.toString();
        }
    });
    fs.writeFileSync('window_product_catalog.json', JSON.stringify(catalog, null, 2));

    // Extract ANY large window object
    const windowKeys = await page.evaluate(() => {
        return Object.keys(window).filter(k => !k.startsWith('webkit') && !k.startsWith('on'));
    });
    fs.writeFileSync('window_keys.json', JSON.stringify(windowKeys, null, 2));

    // Dump Body HTML again specifically looking for swatches
    const bodyHtml = await page.content();
    fs.writeFileSync('body_dump_hydrated.html', bodyHtml);

    console.log('Saved window_product_catalog.json and body_dump_hydrated.html');

    await browser.close();
})();
