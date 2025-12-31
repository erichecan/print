
const fs = require('fs');
const path = require('path');

// 1. Read existing product-data.ts to scrape Hex codes
const productDataPath = path.join(__dirname, '../apps/web/src/lib/product-data.ts');
const productDataContent = fs.readFileSync(productDataPath, 'utf8');

// Map Name -> Hex
const hexMap = {};
const entryRegex = /\{ name: '([^']+)', hex: '([^']+)'/g;
let match;
while ((match = entryRegex.exec(productDataContent)) !== null) {
    hexMap[match[1]] = match[2];
}

// Manually add some known mappings if names differ slightly or are new
hexMap['Royal Blue'] = hexMap['Royal'] || '#395389';
hexMap['Navy Blue'] = hexMap['Navy'] || '#1c203b';
hexMap['Safety Orange'] = '#ff6600'; // Approx
hexMap['Safety Green'] = '#ccff33';
hexMap['Safety Pink'] = '#ff33cc';
hexMap['Charcoal Heather'] = '#4a4a4a';
hexMap['Sport Grey'] = '#afafaf'; // Ensure this exists (mapped from Heather Grey)
hexMap['Graphite Heather'] = '#7f7f7f';

// 2. Read uploaded colors (Source of Truth)
const uploadMapPath = path.join(__dirname, '../docs/customink-analysis/all-colors-with-names.json');
const uploadData = JSON.parse(fs.readFileSync(uploadMapPath, 'utf8'));
const uploadedColors = uploadData.colors || [];

// 3. Generate New List
const newColors = uploadedColors.map(c => {
    // Try exact match
    let hex = hexMap[c.colorName];

    // Fallback?
    if (!hex) {
        // Try removing "Heather"
        const coreName = c.colorName.replace('Heather ', '');
        if (hexMap[coreName]) hex = hexMap[coreName];
    }

    // Default fallback
    if (!hex) hex = '#cccccc';

    return {
        name: c.colorName,
        hex: hex,
        availableSizes: ["S", "M", "L", "XL", "2XL"],
        isAvailable: true
    };
});

// 4. Output TS format
console.log(`export const PRODUCT_COLORS: ProductColor[] = [`);
newColors.forEach(c => {
    console.log(`    { name: '${c.name}', hex: '${c.hex}', availableSizes: ${JSON.stringify(c.availableSizes)}, isAvailable: ${c.isAvailable} },`);
});
console.log(`];`);
