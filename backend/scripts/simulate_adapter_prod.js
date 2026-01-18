
const apiProduct = {
    name: "AllPro Blended Pique Polo",
    variants: [
        { color: "Black", stockQuantity: 10, colorHex: "#000000", imageUrl: null },
        { color: "Charcoal", stockQuantity: 10, colorHex: "#333333", imageUrl: "https://storage.googleapis.com/print-482914-images/products/allpro-blended-pique-polo/1786804_right_sleeve.png" },
        { color: "Navy", stockQuantity: 10, colorHex: "#000080", imageUrl: null }
    ],
    images: [
        { id: "1", url: "https://storage.googleapis.com/print-482914-images/products/allpro-blended-pique-polo/1786804_right_sleeve.png", alt: "AllPro Blended Pique Polo - Charcoal - right_sleeve" },
        { id: "2", url: "https://storage.googleapis.com/print-482914-images/products/allpro-blended-pique-polo/1786804_front.png", alt: "AllPro Blended Pique Polo - Charcoal - front" },
        { id: "3", url: "https://storage.googleapis.com/print-482914-images/products/allpro-blended-pique-polo/1786801_front.png", alt: "AllPro Blended Pique Polo - Navy - front" }
    ],
    colorImages: []
};

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

    const colorImageMap = new Map();
    if (apiProduct.colorImages) {
        apiProduct.colorImages.forEach(ci => {
            if (ci.imageUrls && ci.imageUrls.length > 0) {
                ci.imageUrls.forEach(url => {
                    const normalizedUrl = url.split('?')[0];
                    if (!colorImageMap.has(normalizedUrl)) {
                        colorImageMap.set(normalizedUrl, ci.color);
                    }
                });
            }
        });
    }

    const existingImages = apiProduct.images.map(img => {
        let linkedColor = colorImageMap.get(img.url.split('?')[0]);

        if (!linkedColor && img.alt) {
            const altText = img.alt.toLowerCase();
            const sortedColorNames = Array.from(colorMap.keys()).sort((a, b) => b.length - a.length);

            const matchedName = sortedColorNames.find(c => {
                const cLower = c.toLowerCase();
                return altText === cLower ||
                    altText.includes(` - ${cLower} - `) ||
                    altText.endsWith(` - ${cLower}`) ||
                    altText.startsWith(`${cLower} - `);
            });

            if (matchedName) {
                linkedColor = matchedName;
            }
        }

        return {
            id: img.id,
            url: img.url,
            alt: img.alt || apiProduct.name,
            thumbnail: img.url,
            color: linkedColor || null,
        };
    });

    return { images: existingImages };
}

const adapted = adaptProductData(apiProduct);
console.log("Adapted Image Colors:", adapted.images.map(i => `${i.alt} -> ${i.color}`));

const selectedColor = "Charcoal";
const colorImages = adapted.images.filter(img => (img.color || '').toLowerCase().trim() === selectedColor.toLowerCase().trim());
console.log(`Filtering for ${selectedColor}, found: ${colorImages.length} images`);
