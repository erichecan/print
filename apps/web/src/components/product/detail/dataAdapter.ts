import { ApiProduct, ProductData } from './types';

function shopifyThumbUrl(url: string, width = 160): string {
    if (!url || !url.includes('cdn.shopify.com')) return url;
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('width', String(width));
        parsed.searchParams.set('quality', '75');
        return parsed.toString();
    } catch {
        return url;
    }
}

// 预定义颜色映射 (可以扩展)
const PREDEFINED_COLORS: Record<string, string> = {
    'Black': '#000000',
    'White': '#FFFFFF',
    'Gray': '#808080',
    'Dark Heather': '#555555',
    'Navy': '#000080',
    'Blue': '#0000FF',
    'Royal': '#4169E1',
    'Light Blue': '#ADD8E6',
    'Red': '#FF0000',
    'Maroon': '#800000',
    'Green': '#008000',
    'Forest Green': '#228B22',
    'Kelly Green': '#4CBB17',
    'Yellow': '#FFFF00',
    'Gold': '#FFD700',
    'Orange': '#FFA500',
    'Purple': '#800080',
    'Pink': '#FFC0CB',
    'Hot Pink': '#FF69B4',
    'Brown': '#A52A2A',
    'Beige': '#F5F5DC',
    'Cream': '#FFFDD0',
    // Keep lowercase keys just in case, or handle case-insensitivity in logic
};

/**
* 将 API 产品数据转换为 Redbubble 格式
 */
export function adaptProductData(apiProduct: ApiProduct, relatedProducts?: ApiProduct[]): ProductData {
    const basePriceVal = typeof apiProduct.basePrice === 'string' ? Number(apiProduct.basePrice) : apiProduct.basePrice;
    const basePriceInDollars = apiProduct.price?.base ?? (basePriceVal / 100);
    const salePriceInDollars = (apiProduct.price?.sale != null && apiProduct.price.sale > 0)
        ? apiProduct.price.sale
        : basePriceInDollars;
    const discountPercent = apiProduct.price?.onSale && (apiProduct.price.base > apiProduct.price.sale)
        ? Math.round(((apiProduct.price.base - apiProduct.price.sale) / apiProduct.price.base) * 100)
        : 0;

    // 提取唯一颜色
    const colorMap = new Map<string, { hex: string; available: boolean; imageUrl?: string }>();
    apiProduct.variants.forEach(v => {
        if (v.color) {
            const colorName = v.color;
            if (!colorMap.has(colorName)) {
                // Try to find hex in predefined map (case-insensitive) if not provided
                let hex = v.colorHex;
                if (!hex) {
                    // Case insensitive lookup
                    const key = Object.keys(PREDEFINED_COLORS).find(k => k.toLowerCase() === colorName.toLowerCase());
                    if (key) {
                        hex = PREDEFINED_COLORS[key];
                    }
                }

                colorMap.set(colorName, {
                    hex: hex || '#CCCCCC', // Default to gray only if truly unknown
                    available: v.stockQuantity > 0,
                    imageUrl: v.imageUrl || undefined,
                });
            } else {
                // 如果已有该颜色，更新可用性（任一变体有库存即可）
                const existing = colorMap.get(colorName)!;
                if (v.stockQuantity > 0) {
                    existing.available = true;
                }
                if (v.imageUrl && !existing.imageUrl) {
                    existing.imageUrl = v.imageUrl;
                }
            }
        }
    });

    const colors = Array.from(colorMap.entries()).map(([name, data]) => ({
        name,
        hex: data.hex,
        available: data.available,
        imageUrl: data.imageUrl,
    }));

    // 提取唯一尺码
    const sizeMap = new Map<string, { stock: number; available: boolean }>();
    apiProduct.variants.forEach(v => {
        if (v.size) {
            const sizeValue = v.size;
            const currentStock = sizeMap.get(sizeValue)?.stock || 0;
            sizeMap.set(sizeValue, {
                stock: currentStock + v.stockQuantity,
                available: (currentStock + v.stockQuantity) > 0,
            });
        }
    });

    const sizes = Array.from(sizeMap.entries())
        .map(([value, data]) => ({
            value,
            label: value,
            stock: data.stock,
            available: data.available,
        }))
        .sort((a, b) => {
            // 排序：S, M, L, XL, 2XL, 3XL
            const order = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
            const indexA = order.indexOf(a.value);
            const indexB = order.indexOf(b.value);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.value.localeCompare(b.value);
        });

    // 提取 apiProduct.colorImages 中的映射 (如果有)
    const colorImageMap = new Map<string, string>();
    if (apiProduct.colorImages) {
        apiProduct.colorImages.forEach(ci => {
            if (ci.imageUrls && ci.imageUrls.length > 0) {
                ci.imageUrls.forEach(url => {
                    // Normalize URL by removing query params for matching
                    const normalizedUrl = url.split('?')[0];
                    if (!colorImageMap.has(normalizedUrl)) {
                        colorImageMap.set(normalizedUrl, ci.color);
                    }
                });
            }
        });
    }

    // 转换图片数据
    const existingImages = apiProduct.images.map(img => {
        // Strategy 1: Check colorImages mapping from DB (ProductColorImage)
        const normalizedImgUrl = img.url.split('?')[0];
        let linkedColor = colorImageMap.get(normalizedImgUrl);

        // Strategy 2: URL match from variants
        if (!linkedColor) {
            linkedColor = Array.from(colorMap.entries()).find(([_, data]) => {
                return data.imageUrl && data.imageUrl.split('?')[0] === normalizedImgUrl;
            })?.[0];
        }

        // Strategy 3: Fallback to Alt text matching (Robust)
        if (!linkedColor && img.alt) {
            const altText = img.alt.toLowerCase();
            const sortedColorNames = Array.from(colorMap.keys()).sort((a, b) => b.length - a.length);

            const matchedName = sortedColorNames.find(c => {
                const cLower = c.toLowerCase();
                // 匹配模式（支持 hyphen 和 em-dash 两种分隔符）
                return altText === cLower ||
                    altText.includes(` - ${cLower} - `) ||
                    altText.endsWith(` - ${cLower}`) ||
                    altText.startsWith(`${cLower} - `) ||
                    altText.includes(` — ${cLower} — `) ||
                    altText.includes(` — ${cLower}`) ||
                    altText.endsWith(`— ${cLower}`);
            });

            if (matchedName) {
                linkedColor = matchedName;
            }
        }

        // Strategy 4: single-color product — all images belong to the one color
        const singleColor = colorMap.size === 1 ? Array.from(colorMap.keys())[0] : undefined;

        return {
            id: img.id,
            url: img.url,
            alt: img.alt || apiProduct.name,
            thumbnail: shopifyThumbUrl(img.url),
            color: linkedColor || singleColor || null,
        };
    });

    // 额外合并 colorImages 中可能不在主 images 列表里的图片
    const extraImages: any[] = [];
    if (apiProduct.colorImages) {
        apiProduct.colorImages.forEach(ci => {
            if (ci.imageUrls) {
                ci.imageUrls.forEach((url, idx) => {
                    const normalizedUrl = url.split('?')[0];
                    const alreadyExists = existingImages.some(ei => ei.url.split('?')[0] === normalizedUrl);
                    if (!alreadyExists) {
                        extraImages.push({
                            id: `colorImg-${ci.color}-${idx}`,
                            url: url,
                            alt: `${apiProduct.name} - ${ci.color} - view ${idx + 1}`,
                            thumbnail: shopifyThumbUrl(url),
                            color: ci.color,
                        });
                    }
                });
            }
        });
    }

    const finalImages = [...existingImages, ...extraImages];

    // 生成产品特性 - 不再从描述生成，使用通用默认值，或者留空
    const features = [
        'Premium quality materials',
        'Comfortable fit',
        'Durable construction',
        'Easy care',
    ];

    // 转换相关产品
    const allRelated = (relatedProducts || []).map((p) => {
        const pBasePriceVal = typeof p.basePrice === 'string' ? Number(p.basePrice) : p.basePrice;
        return {
            id: p.id,
            title: p.name,
            url: p.images[0]?.url || 'https://picsum.photos/seed/' + p.id + '/300/300',
            price: p.price?.base || (pBasePriceVal / 100),
            link: `/products/${p.slug}`,
        };
    });

    // 随机打乱并取 8 个作为 "You might like"
    const shuffled = [...allRelated].sort(() => 0.5 - Math.random());
    const youMightLike = shuffled.slice(0, 8);

    const moreByArtist = allRelated.slice(0, 6);

    // 生成标签（基于分类和品牌）
    const tags: string[] = [];
    if (apiProduct.category) {
        tags.push(`${apiProduct.category.name.toLowerCase()} t-shirts`);
    }
    if (apiProduct.brand) {
        tags.push(apiProduct.brand.name.toLowerCase());
    }
    tags.push('custom t-shirts', 'promotional products');

    return {
        id: apiProduct.id,
        title: apiProduct.name,
        slug: apiProduct.slug,
        description: apiProduct.description,
        longDescription: apiProduct.longDescription,
        artist: {
            name: apiProduct.brand?.name || 'Placeholder Artist Name',
            slug: apiProduct.brand?.slug || 'placeholder-artist',
            avatar: 'https://picsum.photos/seed/artist/64/64',
            designCount: 100,
            shopUrl: `/products?brand=${apiProduct.brand?.slug || 'placeholder'}`,
        },
        price: {
            original: basePriceInDollars,
            sale: salePriceInDollars,
            currency: apiProduct.price?.currency || 'CAD',
            discountPercent,
            endsSoon: discountPercent > 0,
            endsSoonText: discountPercent > 0 ? `${discountPercent}% off ends soon` : undefined,
        },
        style: {
            name: 'Oversized T-Shirt',
            description: 'Heavyweight tee, unisex fit',
            options: [
                {
                    value: 'oversized-tee',
                    label: 'Oversized T-Shirt',
                    description: 'Heavyweight tee, unisex fit',
                },
            ],
        },
        colors: colors,
        sizes: sizes,
        printLocations: [
            { value: 'front', label: 'Front' },
            { value: 'back', label: 'Back' },
            { value: 'both', label: 'Front & Back' },
        ],
        images: finalImages,
        rating: {
            average: apiProduct.rating?.average || 4.5,
            count: apiProduct.rating?.count || 0,
        },
        delivery: {
            estimatedDate: 'by 25 November',
            country: 'CA',
            countryFlag: '🇨🇦',
            shippingOptions: [
                {
                    name: 'Standard',
                    days: '7-14',
                    price: 0,
                    free: true,
                },
            ],
        },
        returns: {
            policy: 'Super-easy returns',
            url: '/returns',
        },
        features,
        alsoAvailableOn: [
            {
                id: 'alt-001',
                type: 'Hoodie',
                url: 'https://picsum.photos/seed/hoodie/300/300',
                price: basePriceInDollars + 10,
                salePrice: salePriceInDollars + 8,
                discountPercent,
                link: `/products/${apiProduct.slug}-hoodie`,
            },
            {
                id: 'alt-002',
                type: 'Long Sleeve',
                url: 'https://picsum.photos/seed/longsleeve/300/300',
                price: basePriceInDollars + 8,
                salePrice: salePriceInDollars + 6,
                discountPercent,
                link: `/products/${apiProduct.slug}-longsleeve`,
            },
            {
                id: 'alt-003',
                type: 'Tank Top',
                url: 'https://picsum.photos/seed/tank/300/300',
                price: basePriceInDollars - 5,
                salePrice: salePriceInDollars - 4,
                discountPercent,
                link: `/products/${apiProduct.slug}-tank`,
            },
            {
                id: 'alt-004',
                type: 'Sweatshirt',
                url: 'https://picsum.photos/seed/sweatshirt/300/300',
                price: basePriceInDollars + 12,
                salePrice: salePriceInDollars + 10,
                discountPercent,
                link: `/products/${apiProduct.slug}-sweatshirt`,
            },
        ],
        moreByArtist,
        youMightLike,
        tags,
        trending: ['retro designs', 'vintage aesthetic'],
    };
}
