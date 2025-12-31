
const fs = require('fs');
const path = require('path');

// 1. Read product-data.ts (manual extraction since it's TS)
const productDataPath = path.join(__dirname, '../apps/web/src/lib/product-data.ts');
const productDataContent = fs.readFileSync(productDataPath, 'utf8');

// Regex to extract name: '...'
const nameRegex = /name:\s*'([^']+)'/g;
const frontendNames = [];
let match;
while ((match = nameRegex.exec(productDataContent)) !== null) {
    frontendNames.push(match[1]);
}

console.log(`Frontend Colors (product-data.ts): ${frontendNames.length}`);

// 2. Read uploaded colors
const uploadMapPath = path.join(__dirname, '../docs/customink-analysis/all-colors-with-names.json');
const uploadData = JSON.parse(fs.readFileSync(uploadMapPath, 'utf8'));
const uploadedColors = uploadData.colors || [];
const uploadedNames = uploadedColors.map(c => c.colorName);
const uploadedNamesSet = new Set(uploadedNames);

// 3. Compare
const missingInUpload = [];
const mismatched = [];

frontendNames.forEach(name => {
    // Check exact match
    if (!uploadedNamesSet.has(name)) {
        // Check case insensitive
        const lower = name.toLowerCase();
        const stored = uploadedNames.find(n => n.toLowerCase() === lower);
        if (stored) {
            console.log(`⚠️  Case mismatch: Frontend "${name}" vs Uploaded "${stored}"`);
        } else {
            // Check if I aliased it?
            // Graphite -> Graphite Heather (Frontend has Graphite Heather, Upload has Graphite Heather (aliased))
            // Wait, the JSON file 'all-colors-with-names.json' was OVERWRITTEN by me with the overrides?
            // Yes.
            missingInUpload.push(name);
        }
    }
});

console.log(`\nMissing in Upload (Frontend has it, Upload doesn't):`);
missingInUpload.forEach(name => console.log(` - ${name}`));

console.log(`\nCheck "Blue" colors:`);
frontendNames.filter(n => n.includes('Blue') || n.includes('Royal') || n.includes('Navy') || n.includes('Indigo')).forEach(n => {
    const slug = n.toLowerCase().trim().replace(/\s+/g, '-');
    console.log(`Frontend: "${n}" -> Slug: "${slug}"`);
});

