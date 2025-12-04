/**
 * 促销产品类别数据
 * [2025-01-29 12:00:00] 定义促销产品页面的类别数据结构
 * [2025-01-30 12:30:00] 更新图片路径，使用 GCS 中爬取的 Custom Ink 图片，避免重复显示
 * 参考 Custom Ink 促销产品页面的类别列表
 */

export interface PromotionalCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imagePath: string; // 本地图片路径，从爬取的图片中映射
  order: number; // 显示顺序
}

/**
 * 促销产品类别列表
 * [2025-01-29 12:00:00] 基于 Custom Ink 页面的类别，稍后会根据爬取的图片更新
 */
export const promotionalCategories: PromotionalCategory[] = [
  {
    id: 'drinkware',
    name: 'Drinkware',
    slug: 'drinkware',
    description: 'Custom water bottles, mugs, and tumblers',
    imagePath: '/assets/categories/cat-drinkware.png',
    order: 1
  },
  {
    id: 'bags',
    name: 'Bags',
    slug: 'bags',
    description: 'Tote bags, backpacks, and duffels',
    imagePath: '/assets/categories/cat-bag.png',
    order: 2
  },
  {
    id: 'pens-office',
    name: 'Pens & Office Supplies',
    slug: 'pens-office',
    description: 'Custom pens, notebooks, and office essentials',
    imagePath: '/assets/categories/cat-office.png',
    order: 3
  },
  {
    id: 'technology',
    name: 'Technology',
    slug: 'technology',
    description: 'Phone cases, power banks, and tech accessories',
    imagePath: '/assets/categories/cat-tech.png',
    order: 4
  },
  {
    id: 'blankets',
    name: 'Blankets',
    slug: 'blankets',
    description: 'Custom blankets and throws',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/208.jpg',
    order: 5
  },
  {
    id: 'gifts',
    name: 'Gifts',
    slug: 'gifts',
    description: 'Promotional gift items',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/220.jpg',
    order: 6
  },
  {
    id: 'keychains',
    name: 'Keychains',
    slug: 'keychains',
    description: 'Custom keychains and accessories',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/387.jpg',
    order: 7
  },
  {
    id: 'stickers-magnets',
    name: 'Stickers & Magnets',
    slug: 'stickers-magnets',
    description: 'Custom stickers and magnets',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/388.jpg',
    order: 8
  },
  {
    id: 'ornaments',
    name: 'Ornaments',
    slug: 'ornaments',
    description: 'Holiday ornaments and decorations',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/404.jpg',
    order: 9
  },
  {
    id: 'can-coolers',
    name: 'Can Coolers',
    slug: 'can-coolers',
    description: 'Custom can coolers and koozies',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/441.jpg',
    order: 10
  },
  {
    id: 'towels',
    name: 'Towels',
    slug: 'towels',
    description: 'Custom towels and beach accessories',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/442.jpg',
    order: 11
  },
  {
    id: 'signs-banners',
    name: 'Signs, Banners, & Flags',
    slug: 'signs-banners',
    description: 'Custom signage and banners',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/443.jpg',
    order: 12
  },
  {
    id: 'tablecloths',
    name: 'Tablecloths',
    slug: 'tablecloths',
    description: 'Custom tablecloths and linens',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/444.jpg',
    order: 13
  },
  {
    id: 'games-novelties',
    name: 'Games & Novelties',
    slug: 'games-novelties',
    description: 'Custom games and novelty items',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/445.jpg',
    order: 14
  },
  {
    id: 'socks',
    name: 'Socks',
    slug: 'socks',
    description: 'Custom socks and hosiery',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/512.jpg',
    order: 15
  },
  {
    id: 'lanyards',
    name: 'Lanyards & Badge Holders',
    slug: 'lanyards',
    description: 'Custom lanyards and ID badge holders',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/567.jpg',
    order: 16
  },
  {
    id: 'buttons-pins',
    name: 'Buttons & Pins',
    slug: 'buttons-pins',
    description: 'Custom buttons and pins',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/699.jpg',
    order: 17
  },
  {
    id: 'awards',
    name: 'Awards & Recognition',
    slug: 'awards',
    description: 'Custom awards and recognition items',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/896.jpg',
    order: 18
  },
  {
    id: 'calendars',
    name: 'Calendars & Planners',
    slug: 'calendars',
    description: 'Custom calendars and planners',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/932.jpg',
    order: 19
  },
  {
    id: 'sunglasses',
    name: 'Sunglasses',
    slug: 'sunglasses',
    description: 'Custom sunglasses and eyewear',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/998.jpg',
    order: 20
  },
  {
    id: 'umbrellas',
    name: 'Umbrellas',
    slug: 'umbrellas',
    description: 'Custom umbrellas and rain gear',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/catalog_detail_image.jpg',
    order: 21
  },
  {
    id: 'tools',
    name: 'Tools',
    slug: 'tools',
    description: 'Custom tools and hardware',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/misc-1.png',
    order: 22
  },
  {
    id: 'pet-supplies',
    name: 'Pet Supplies',
    slug: 'pet-supplies',
    description: 'Custom pet products and accessories',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/208.jpg',
    order: 23
  },
  {
    id: 'golf',
    name: 'Golf Balls & Accessories',
    slug: 'golf',
    description: 'Custom golf products',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/220.jpg',
    order: 24
  },
  {
    id: 'travel',
    name: 'Travel',
    slug: 'travel',
    description: 'Custom travel accessories',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/387.jpg',
    order: 25
  },
  {
    id: 'chairs',
    name: 'Chairs & Stadium Seats',
    slug: 'chairs',
    description: 'Custom chairs and seating',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/388.jpg',
    order: 26
  },
  {
    id: 'coasters',
    name: 'Coasters',
    slug: 'coasters',
    description: 'Custom coasters and drink accessories',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/404.jpg',
    order: 27
  },
  {
    id: 'bottle-openers',
    name: 'Bottle Openers',
    slug: 'bottle-openers',
    description: 'Custom bottle openers',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/441.jpg',
    order: 28
  },
  {
    id: 'health-care',
    name: 'Health & Personal Care',
    slug: 'health-care',
    description: 'Custom health and personal care items',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/442.jpg',
    order: 29
  },
  {
    id: 'frisbees',
    name: 'Frisbees',
    slug: 'frisbees',
    description: 'Custom frisbees and flying discs',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/443.jpg',
    order: 30
  },
  {
    id: 'memo-clips',
    name: 'Memo Clips',
    slug: 'memo-clips',
    description: 'Custom memo clips and holders',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/444.jpg',
    order: 31
  },
  {
    id: 'bandanas',
    name: 'Bandanas',
    slug: 'bandanas',
    description: 'Custom bandanas and headwear',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/445.jpg',
    order: 32
  },
  {
    id: 'flip-flops',
    name: 'Flip Flops',
    slug: 'flip-flops',
    description: 'Custom flip flops and sandals',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/512.jpg',
    order: 33
  },
  {
    id: 'scarves',
    name: 'Scarves',
    slug: 'scarves',
    description: 'Custom scarves and wraps',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/567.jpg',
    order: 34
  },
  {
    id: 'sustainable',
    name: 'Sustainable',
    slug: 'sustainable',
    description: 'Eco-friendly promotional products',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/699.jpg',
    order: 35
  },
  {
    id: 'made-in-usa',
    name: 'Made in USA',
    slug: 'made-in-usa',
    description: 'USA-made promotional products',
    imagePath: 'https://storage.googleapis.com/print-main-product-images/promotional-products/misc/896.jpg',
    order: 36
  }
];

/**
 * 根据slug获取类别
 * [2025-01-29 12:00:00] 辅助函数，用于查找类别
 */
export function getCategoryBySlug(slug: string): PromotionalCategory | undefined {
  return promotionalCategories.find(cat => cat.slug === slug);
}

/**
 * 获取排序后的类别列表
 * [2025-01-29 12:00:00] 返回按order字段排序的类别列表
 */
export function getSortedCategories(): PromotionalCategory[] {
  return [...promotionalCategories].sort((a, b) => a.order - b.order);
}

