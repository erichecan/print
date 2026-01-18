const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Port of dataAdapter.ts logic
function adaptProductData(apiProduct) {
    const colorMap = new Map();
    apiProduct.variants.forEach(v => {
        if (v.color) {
            const colorName = v.color;
            if (!colorMap.has(colorName)) {
                colorMap.set(colorName, {
                    hex: v.colorHex || '#CCCCCC',
                    available: v.stockQuantity > 0,
                    imageUrl: v.imageUrl || undefined,
                });
            }
        }
    });

    const existingImages = apiProduct.images.map(img => {
        let linkedColor = null;
        // Simplified Strategy 2 from original
        if (img.alt) {
            const sortedColorNames = Array.from(colorMap.keys()).sort((a, b) => b.length - a.length);
            const matchedName = sortedColorNames.find(c => img.alt.startsWith(c));
            if (matchedName) linkedColor = matchedName;
        }

        return {
            id: img.id,
            url: img.url,
            alt: img.alt || apiProduct.name,
            color: linkedColor || null,
        };
    });

    const extraImages = [];
    if (apiProduct.colorImages && apiProduct.colorImages.length > 0) {
        apiProduct.colorImages.forEach((ci) => {
            if (ci.imageUrls && Array.isArray(ci.imageUrls)) {
                ci.imageUrls.forEach((url, idx) => {
                    const existing = existingImages.find(ex => ex.url === url);
                    if (existing) {
                        if (!existing.color) {
                            existing.color = ci.colorName;
                        }
                    } else {
                        extraImages.push({
                            id: `ci-${ci.colorName}-${idx}`,
                            url: url,
                            alt: `${apiProduct.name} - ${ci.colorName} - View ${idx + 1}`,
                            color: ci.colorName
                        });
                    }
                });
            }
        });
    }

    return {
        title: apiProduct.name,
        images: [...existingImages, ...extraImages]
    };
}

async function main() {
    const slug = 'allpro-blended-pique-polo';
    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            images: true,
            colorImages: true,
            variants: true
        }
    });

    const adaptive = adaptProductData(product);

    console.log(`Product: ${adaptive.title}`);
    console.log(`Total Images: ${adaptive.images.length}`);

    const colors = [...new Set(product.variants.map(v => v.color))];
    colors.forEach(color => {
        const filtered = adaptive.images.filter(img =>
            (img.color || '').toLowerCase().trim() === color.toLowerCase().trim()
        );
        console.log(`Color: '${color}' | Filtered Images: ${filtered.length}`);
    });
}

main().finally(() => prisma.$disconnect());
