const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('body_dump_hydrated.html', 'utf8');

// Regex to find data-product-props="..."
// We look for 'id="product-details-page"' then scan for properties
const idMatch = html.match(/id="product-details-page"[^>]*data-product-props="([^"]*)"/);

if (idMatch && idMatch[1]) {
    console.log("Found data-product-props!");
    let raw = idMatch[1];
    // Decode HTML entities
    raw = raw.replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    try {
        const data = JSON.parse(raw);
        fs.writeFileSync('product_full_data.json', JSON.stringify(data, null, 2));
        console.log("Successfully extracted product data to product_full_data.json");
    } catch (e) {
        console.error("Failed to parse JSON:", e);
        fs.writeFileSync('product_raw_data_debug.txt', raw);
    }
} else {
    console.log("data-product-props not found in the HTML dump.");
}

// Also extract swatches using regex on key pattern
const swatchRegex = /data-testid="ColorSwatch color-[^"]*"\s+tabindex="0"\s+value="(\d+)"\s+title="([^"]*)"/g;
let match;
const swatches = [];
while ((match = swatchRegex.exec(html)) !== null) {
    swatches.push({ id: match[1], name: match[2] });
}
console.log(`Extracted ${swatches.length} swatches from DOM analysis.`);
fs.writeFileSync('swatches_from_dom.json', JSON.stringify(swatches, null, 2));
