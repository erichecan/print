
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Config
const PRODUCTS_DIR = path.join(__dirname, '../customink-images/products');
const INPUT_MAPPING_FILE = path.join(__dirname, '../docs/customink-analysis/all-colors-with-names.json');
const OUTPUT_MAPPING_FILE = path.join(__dirname, '../docs/customink-analysis/all-colors-with-gcs-urls.json');

// GCS Config (Env vars should be set)
const BUCKET_NAME = process.env.GCP_IMAGE_BUCKET || 'print-main-product-images';
const STORAGE_BASE_URL = process.env.GCP_IMAGE_BASE_URL || `https://storage.googleapis.com/${BUCKET_NAME}`;
const PRODUCT_SLUG_FOR_FRONTEND = 'gildan-softstyle-tshirt';

const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

// Color Name Overrides to match Frontend (product-data.ts)
const COLOR_NAME_OVERRIDES = {
    "Graphite": "Graphite Heather",
    "Heather Grey": "Sport Grey",
    // Add others if needed
};

async function uploadFile(filePath, destination) {
    // console.log(`  Uploading ${path.basename(filePath)} to ${destination}...`);
    try {
        await bucket.upload(filePath, {
            destination: destination,
            gzip: true,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
        try {
            await bucket.file(destination).makePublic();
        } catch (e) {
            // Ignore UBLA errors
            if (e.code !== 409 && !e.message.includes('uniform bucket-level access')) {
                console.warn(`    Warning: Could not make public: ${e.message}`);
            }
        }
        return `${STORAGE_BASE_URL}/${destination}`;
    } catch (error) {
        console.error(`  Error uploading ${filePath}:`, error.message);
        throw error;
    }
}

async function main() {
    if (!fs.existsSync(INPUT_MAPPING_FILE)) {
        console.error(`Input file not found: ${INPUT_MAPPING_FILE}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(INPUT_MAPPING_FILE, 'utf8'));
    const productId = data.productId;
    const colors = data.colors;

    console.log(`Processing ${colors.length} colors for product ${productId}`);

    let uploadedCount = 0;
    let failedCount = 0;

    for (const color of colors) {
        const colorId = color.colorId;
        const colorDir = path.join(PRODUCTS_DIR, productId, `color-${colorId}`);

        let colorName = color.colorName || 'Color ' + colorId;

        // Apply override
        if (COLOR_NAME_OVERRIDES[colorName]) {
            const newName = COLOR_NAME_OVERRIDES[colorName];
            console.log(`  Applying override: ${colorName} -> ${newName}`);
            colorName = newName;
            color.colorName = newName; // Update mapping too!
        }

        const colorSlug = colorName.toLowerCase().trim().replace(/\s+/g, '-');

        console.log(`Processing ${colorName} (${colorId}) -> ${colorSlug}`);

        if (!fs.existsSync(colorDir)) {
            console.log(`  Local directory not found, skipping.`);
            continue;
        }

        // Map of view to local filename (Underscore based)
        const views = {
            front: 'front_large_extended.png',
            back: 'back_large_extended.png',
            sleeve: 'sleeve_large_extended.png'
        };

        if (!color.sourceImageUrls) {
            color.sourceImageUrls = { ...color.imageUrls };
        }

        const viewKeys = Object.keys(views);
        for (const viewType of viewKeys) {
            const filename = views[viewType];
            const localPath = path.join(colorDir, filename);

            if (fs.existsSync(localPath)) {
                // 1. Upload to ID-based path (Backend/DB preferred) - UNDERSCORE
                const destinationId = `products/${productId}/${colorId}/${filename}`;

                // 2. Upload to Slug-based path (Frontend expected) - HYPHEN
                const frontendFilename = `${viewType}-large_extended.png`;
                const destinationSlug = `design-lab-products/${PRODUCT_SLUG_FOR_FRONTEND}/${colorSlug}/${frontendFilename}`;

                try {
                    // Upload ID based
                    const gcsUrlId = await uploadFile(localPath, destinationId);

                    // Upload Slug based
                    await uploadFile(localPath, destinationSlug);

                    // Update mapping with ID url (safer/stable)
                    color.imageUrls[viewType] = gcsUrlId;

                    uploadedCount++;
                } catch (err) {
                    failedCount++;
                }
            } else {
                // console.log(`  File missing: ${filename}`);
            }
        }
    }

    // Write output
    fs.writeFileSync(OUTPUT_MAPPING_FILE, JSON.stringify(data, null, 2));
    console.log(`Upload Complete. Uploaded (views): ${uploadedCount}, Failed: ${failedCount}`);
}

main().catch(console.error);
