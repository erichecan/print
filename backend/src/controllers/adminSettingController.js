/**
 * Admin Setting Controller
 * [2025-11-15 15:30:00] Site configuration and content manager APIs
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

const DEFAULT_SITE_SETTINGS = {
  siteName: 'suvernire plus',
  contactEmail: 'support@souvenirplus.com',
  contactPhone: '416 916 6352',
  currency: 'USD',
  shippingProvider: 'UPS',
  paymentGateway: 'Stripe',
  testMode: true,
  autoApproveDesigns: false,
  copyrightCheck: true,
  reviewEmail: 'review@souvenirplus.com',
};

// [2025-01-28 05:55:00] 扩展内容配置，包含导航、首页、关于页、帮助页和静态文字
const DEFAULT_CONTENT_CONFIG = {
  // [2025-01-28 05:55:00] 保留原有字段以向后兼容
  heroCards: [
    {
      id: 'hero-1',
      title: 'Heritage Tee Collection',
      subtitle: 'Premium cotton tees, ready in 5 days',
      imageUrl: '/images/admin/content/hero-1.jpg',
      linkUrl: '/collections/t-shirts',
    },
    {
      id: 'hero-2',
      title: 'Conference Welcome Kits',
      subtitle: 'Custom onboarding experiences',
      imageUrl: '/images/admin/content/hero-2.jpg',
      linkUrl: '/collections/collections',
    },
  ],
  brandLogos: [
    { id: 'logo-1', name: 'Northwind', imageUrl: '/images/brands/northwind.svg' },
    { id: 'logo-2', name: 'Globex', imageUrl: '/images/brands/globex.svg' },
    { id: 'logo-3', name: 'Initech', imageUrl: '/images/brands/initech.svg' },
    { id: 'logo-4', name: 'Acme Corp', imageUrl: '/images/brands/acme.svg' },
  ],
  featuredCollections: [
    { id: 'collection-1', title: 'Work From Anywhere', linkUrl: '/collections/work-from-anywhere' },
    { id: 'collection-2', title: 'Sustainable Essentials', linkUrl: '/collections/sustainable' },
  ],
  // [2025-01-28 05:55:00] 导航菜单配置
  navigation: [
    {
      id: 'nav-1',
      label: 'Custom T-shirts',
      href: '/products',
      order: 1,
      type: 'mega',
      megaPanel: {
        columns: [
          {
            id: 'col-1',
            links: [
              { id: 'link-1', label: 'Short Sleeve T-shirts', href: '/products?category=short-sleeve' },
              { id: 'link-2', label: 'Long Sleeve T-shirts', href: '/products?category=long-sleeve' },
              { id: 'link-3', label: 'Tank Tops & Sleeveless', href: '/products?category=tank-tops' },
            ],
          },
          {
            id: 'col-2',
            links: [
              { id: 'link-4', label: 'Performance Shirts', href: '/products?category=performance' },
              { id: 'link-5', label: 'Soft Tri-Blend T-shirts', href: '/products?category=tri-blend' },
              { id: 'link-6', label: 'Sustainable T-shirts', href: '/products?category=sustainable' },
            ],
          },
          {
            id: 'col-3',
            links: [
              { id: 'link-7', label: "Women's T-shirts", href: '/products?category=women' },
              { id: 'link-8', label: "Kids T-shirts", href: '/products?category=kids' },
            ],
          },
          {
            id: 'col-4',
            links: [
              { id: 'link-9', label: 'No Minimum T-shirts', href: '/products?tag=no-minimum' },
              { id: 'link-10', label: 'View All Custom T-shirts', href: '/products' },
            ],
          },
        ],
      },
    },
    {
      id: 'nav-2',
      label: 'Custom Apparel',
      href: '/collections/apparel',
      order: 2,
      type: 'mega',
      megaPanel: {
        columns: [
          {
            id: 'col-1',
            links: [
              { id: 'link-1', label: 'Hoodies', href: '/products?category=hoodies' },
              { id: 'link-2', label: 'Crewneck Sweatshirts', href: '/products?category=crewneck-sweatshirts' },
              { id: 'link-3', label: 'Quarter Zip Sweatshirts', href: '/products?category=quarter-zip' },
              { id: 'link-4', label: 'View All Sweatshirts', href: '/products?category=sweatshirts' },
            ],
          },
          {
            id: 'col-2',
            links: [
              { id: 'link-5', label: 'Baseball Hats', href: '/products?category=baseball-hats' },
              { id: 'link-6', label: 'Trucker Hats', href: '/products?category=trucker-hats' },
              { id: 'link-7', label: 'Beanies', href: '/products?category=beanies' },
              { id: 'link-8', label: 'View All Hats', href: '/products?category=all-hats' },
            ],
          },
          {
            id: 'col-3',
            links: [
              { id: 'link-9', label: 'Jackets', href: '/products?category=jackets' },
              { id: 'link-10', label: 'Polo Shirts', href: '/products?category=polo-shirts' },
              { id: 'link-11', label: 'Business Apparel', href: '/products?category=business-apparel' },
              { id: 'link-12', label: 'Workwear & Uniforms', href: '/products?category=workwear' },
            ],
          },
          {
            id: 'col-4',
            links: [
              { id: 'link-13', label: 'Activewear', href: '/products?category=activewear' },
              { id: 'link-14', label: 'Team Jerseys', href: '/products?category=team-jerseys' },
              { id: 'link-15', label: 'Pants & Shorts', href: '/products?category=pants-shorts' },
              { id: 'link-16', label: 'Accessories', href: '/products?category=accessories' },
            ],
          },
        ],
      },
    },
    {
      id: 'nav-3',
      label: 'Promotional Products',
      href: '/promotional-products',
      order: 3,
      type: 'mega',
      megaPanel: {
        columns: [
          {
            id: 'col-1',
            links: [
              { id: 'link-1', label: 'Water Bottles', href: '/products?category=water-bottles' },
              { id: 'link-2', label: 'Mugs', href: '/products?category=mugs' },
              { id: 'link-3', label: 'Tumblers', href: '/products?category=tumblers' },
              { id: 'link-4', label: 'Koozie®', href: '/products?category=koozies' },
              { id: 'link-5', label: 'View All Drinkware', href: '/products?category=drinkware' },
            ],
          },
          {
            id: 'col-2',
            links: [
              { id: 'link-6', label: 'Backpacks', href: '/products?category=backpacks' },
              { id: 'link-7', label: 'Tote Bags', href: '/products?category=tote-bags' },
              { id: 'link-8', label: 'Drawstring Bags', href: '/products?category=drawstring-bags' },
              { id: 'link-9', label: 'Pouches', href: '/products?category=pouches' },
              { id: 'link-10', label: 'View All Bags', href: '/products?category=bags' },
            ],
          },
          {
            id: 'col-3',
            links: [
              { id: 'link-11', label: 'Pens & Writing', href: '/products?category=pens' },
              { id: 'link-12', label: 'Stationery', href: '/products?category=stationery' },
              { id: 'link-13', label: 'Stickers & Magnets', href: '/products?category=stickers' },
              { id: 'link-14', label: 'Office Supplies', href: '/products?category=office-supplies' },
              { id: 'link-15', label: 'Technology', href: '/products?category=technology' },
            ],
          },
          {
            id: 'col-4',
            links: [
              { id: 'link-16', label: 'Gifts', href: '/products?category=gifts' },
              { id: 'link-17', label: 'Trade Show & Signage', href: '/products?category=trade-show' },
              { id: 'link-18', label: 'Outdoor & Leisure', href: '/products?category=outdoor' },
              { id: 'link-19', label: 'Home, Auto, & Tools', href: '/products?category=home-auto-tools' },
              { id: 'link-20', label: 'Health & Personal Care', href: '/products?category=health' },
            ],
          },
        ],
      },
    },
    {
      id: 'nav-4',
      label: 'Design Lab',
      href: '/design-lab',
      order: 4,
      type: 'simple',
      simplePanel: {
        title: 'The Design Lab Makes It Fun & Easy to Design',
        description: 'Create custom t-shirts and promotional products your group will love. Simply upload your own logo or create a design using our collection of fonts & artwork.',
        actions: [
          { label: 'Start Designing', href: '/design-lab', variant: 'primary' },
          { label: 'Explore Templates', href: '/design-lab?templates=1', variant: 'outline' },
        ],
      },
    },
    {
      id: 'nav-5',
      label: 'Groups & Events',
      href: '/group-orders',
      order: 5,
      type: 'mega',
      megaPanel: {
        columns: [
          {
            id: 'col-1',
            links: [
              { id: 'link-1', label: 'Group Ordering', href: '/help#group-ordering' },
              { id: 'link-2', label: 'Fundraising', href: '/help#fundraising' },
              { id: 'link-3', label: 'Online Stores', href: '/help#online-stores' },
              { id: 'link-4', label: 'Pro Services', href: '/help#pro-services' },
              { id: 'link-5', label: 'Tips & Advice', href: '/help#tips' },
              { id: 'link-6', label: 'T-shirt Maker', href: '/design-lab' },
            ],
          },
          {
            id: 'col-2',
            links: [
              { id: 'link-7', label: 'Corporate Swag', href: '/help#corporate-swag' },
              { id: 'link-8', label: 'For Businesses', href: '/help#businesses' },
              { id: 'link-9', label: 'For Trade Shows', href: '/help#trade-shows' },
            ],
          },
          {
            id: 'col-3',
            links: [
              { id: 'link-10', label: 'For Schools K-12', href: '/help#schools' },
              { id: 'link-11', label: 'For Teachers & Colleges', href: '/help#colleges' },
              { id: 'link-12', label: 'For Sports Teams', href: '/help#sports' },
              { id: 'link-13', label: 'For Activities & Celebrations', href: '/help#celebrations' },
            ],
          },
        ],
      },
    },
  ],
  // [2025-01-28 05:55:00] 首页内容配置
  homePage: {
    heroTitle: 'Custom T-shirts & Promo Gear for Your Group',
    heroSubtitle: 'From tees to tech, create premium swag with expert help, fast delivery, and a 100% satisfaction guarantee.',
    heroCards: [
      { id: 'hero-card-1', src: '/assets/hero/hero-card-tee.jpg', alt: 'Featured Tee' },
      { id: 'hero-card-2', src: '/assets/hero/hero-card-bottle.jpg', alt: 'Featured Bottle' },
      { id: 'hero-card-3', src: '/assets/hero/hero-card-hat.jpg', alt: 'Featured Hat' },
      { id: 'hero-card-4', src: '/assets/hero/hero-card-bag.jpg', alt: 'Featured Bag' },
    ],
    servicePromises: [
      { id: 'promise-1', title: 'Free Shipping', detail: '2-week delivery' },
      { id: 'promise-2', title: '100% Satisfaction', detail: "We'll make it right" },
      { id: 'promise-3', title: 'Design Help', detail: '7 days a week' },
      { id: 'promise-4', title: 'Rush Options', detail: 'As fast as 3 days' },
    ],
    testimonials: [
      { id: 'testimonial-1', quote: 'Ordered with ease and delivered on time.', author: 'Mary B., NY', stars: 5 },
      { id: 'testimonial-2', quote: 'Top quality, fast delivery, stellar support. Highly recommend!', author: 'Ingrid D., MD', stars: 5 },
      { id: 'testimonial-3', quote: 'Great experience and responsive service. The site is easy to use.', author: 'Jenna F., WI', stars: 4 },
    ],
    enterprisePanels: [
      {
        id: 'enterprise-1',
        title: 'Enterprise-Level Swag Management',
        description: 'Get custom kits, white-glove service, address collection, and global shipping with our enterprise solution.',
        ctaLabel: 'Get a Demo',
        ctaHref: '/contact',
      },
      {
        id: 'enterprise-2',
        title: "We'll Do the Work",
        description: 'Ship to one place or every place. Choose your design and we handle the rest—from packing to delivery tracking.',
        ctaLabel: 'Start Designing',
        ctaHref: '/design-lab', // [2025-12-08 14:40:00] 使用新的 Design Lab 页面
        ctaVariant: 'outline',
      },
    ],
    brandLogos: [
      { id: 'brand-1', name: 'Nike', src: '/assets/brands/nike.svg' },
      { id: 'brand-2', name: 'Carhartt', src: '/assets/brands/carhartt.svg' },
      { id: 'brand-3', name: 'New Era', src: '/assets/brands/new-era.png' },
      { id: 'brand-4', name: 'The North Face', src: '/assets/brands/northface.svg' },
      { id: 'brand-5', name: 'Stanley', src: '/assets/brands/stanley.svg' },
      { id: 'brand-6', name: 'Patagonia', src: '/assets/brands/patagonia.svg' },
      { id: 'brand-7', name: 'Champion', src: '/assets/brands/champion.png' },
      { id: 'brand-8', name: 'Adidas', src: '/assets/brands/adidas.png' },
      { id: 'brand-9', name: 'Columbia', src: '/assets/brands/columbia.png' },
      { id: 'brand-10', name: 'Hydro Flask', src: '/assets/brands/hydro-flask.png' },
    ],
  },
  // [2025-01-28 05:55:00] 关于页内容配置
  aboutPage: {
    headerTitle: 'Built by merch makers who care',
    headerDescription: 'Suvernire Plus is a team of designers, production experts, and logistics pros helping brands create meaningful merch. From the first sketch to the final unboxing moment, we obsess over every detail so you do not have to.',
    milestones: [
      { id: 'milestone-1', year: '2015', detail: 'Launched Suvernire Plus with a single screen-print press in Toronto.' },
      { id: 'milestone-2', year: '2018', detail: 'Introduced full-service Design Lab with remote creative consultations.' },
      { id: 'milestone-3', year: '2021', detail: 'Expanded to fulfill North American orders with sustainable materials.' },
      { id: 'milestone-4', year: '2024', detail: 'Rolled out enterprise swag programs for distributed teams.' },
    ],
    values: [
      {
        id: 'value-1',
        title: 'People-first support',
        description: 'Our in-house specialists partner with you from mockups to delivery.',
      },
      {
        id: 'value-2',
        title: 'Quality without compromise',
        description: 'We source garments and promo products from trusted, ethical suppliers.',
      },
      {
        id: 'value-3',
        title: 'On-time, every time',
        description: 'Free standard shipping and rush options keep your events on schedule.',
      },
    ],
    teamTitle: 'Meet the team',
    teamDescription: 'Designers, project managers, and production leads collaborate under one roof to keep quality high and timelines short. Want to work with us? Reach out at hello@suvernireplus.com.',
  },
  // [2025-01-28 05:55:00] 帮助页内容配置
  helpPage: {
    quickLinks: [
      { id: 'quick-1', label: 'Check order status', href: '/order-tracking', icon: '📦' },
      { id: 'quick-2', label: 'Update shipping address', href: '/contact', icon: '📍' },
      { id: 'quick-3', label: 'Launch Design Lab', href: '/design-lab', icon: '🎨' },
      { id: 'quick-4', label: 'Review return policy', href: '/returns', icon: '↩️' },
      { id: 'quick-5', label: 'Shipping information', href: '/shipping-info', icon: '🚚' },
      { id: 'quick-6', label: 'Size guide', href: '/size-guide', icon: '📏' },
    ],
    faqCategories: [
      {
        id: 'faq-cat-1',
        category: 'Orders',
        icon: '📦',
        items: [
          {
            id: 'faq-1',
            question: 'How long does production take?',
            answer: 'Most apparel ships in 5–7 business days after proof approval. Rush options are available for faster delivery (3–5 business days).',
          },
          {
            id: 'faq-2',
            question: 'Can I cancel or modify my order?',
            answer: 'Orders can be cancelled within 24 hours of placement. After that, orders may already be in production. Contact us immediately if you need to cancel or modify an order.',
          },
          {
            id: 'faq-3',
            question: 'How do I track my order?',
            answer: "Once your order ships, you'll receive an email with a tracking number. You can also track your order on our order tracking page using your order number.",
          },
          {
            id: 'faq-4',
            question: 'What if my order is incorrect or damaged?',
            answer: "Contact us within 14 days of delivery. We'll replace or refund your order to make things right. Custom products can only be returned if they differ from the approved proof.",
          },
        ],
      },
      {
        id: 'faq-cat-2',
        category: 'Design & Artwork',
        icon: '🎨',
        items: [
          {
            id: 'faq-5',
            question: 'Can you help with logo cleanup?',
            answer: 'Yes! Upload what you have and our design team will polish it for print at no extra cost. We can help with resolution improvements, color adjustments, and formatting.',
          },
          {
            id: 'faq-6',
            question: 'What file formats do you accept?',
            answer: 'We accept PNG, JPG, PDF, SVG, and AI files. For best results, use vector formats (PDF, SVG, AI) or high-resolution images (300 DPI or higher).',
          },
          {
            id: 'faq-7',
            question: 'How do I use the Design Lab?',
            answer: 'Simply click "Start Designing" on any product page. Upload your artwork, add text, and customize your design in real-time. Your design saves automatically.',
          },
          {
            id: 'faq-8',
            question: 'Can I save my designs?',
            answer: 'Yes! All designs are automatically saved to your account. You can access them anytime from "My Designs" in your account dashboard.',
          },
        ],
      },
      {
        id: 'faq-cat-3',
        category: 'Shipping & Delivery',
        icon: '🚚',
        items: [
          {
            id: 'faq-9',
            question: 'Do you ship internationally?',
            answer: 'We currently ship to Canada and the United States. International shipping may be available for large orders—contact us to discuss.',
          },
          {
            id: 'faq-10',
            question: 'What are your shipping rates?',
            answer: 'Standard shipping is free for orders over $50. Otherwise, rates start at $9.99 CAD within Canada and $12.99 CAD to the United States. Rush shipping options are available.',
          },
          {
            id: 'faq-11',
            question: 'How long does shipping take?',
            answer: 'Standard shipping: 7–10 business days (Canada) or 8–12 business days (United States). Rush shipping: 3–5 business days (Canada) or 5–7 business days (United States).',
          },
          {
            id: 'faq-12',
            question: 'Do you track shipments?',
            answer: 'Every order includes tracking numbers and proactive email notifications once your package is in transit. You can track your package using the tracking number provided.',
          },
        ],
      },
      {
        id: 'faq-cat-4',
        category: 'Payment & Pricing',
        icon: '💳',
        items: [
          {
            id: 'faq-13',
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and purchase orders for qualified businesses.',
          },
          {
            id: 'faq-14',
            question: 'Do you offer bulk pricing?',
            answer: 'Yes! Bulk pricing is automatically applied at checkout based on quantity. Contact us for custom pricing on orders over 500 units.',
          },
          {
            id: 'faq-15',
            question: 'Are there any hidden fees?',
            answer: 'No hidden fees. The price you see is the price you pay, including all setup and artwork fees. Shipping costs are clearly displayed at checkout.',
          },
        ],
      },
    ],
  },
  // [2025-01-28 05:55:00] 通用静态文字配置
  staticTexts: {
    topMessageBar: 'Custom T-shirts & Promotional Products • Fast & Free Shipping • All-inclusive Pricing',
    footerColumns: [
      {
        id: 'footer-col-1',
        title: 'About Us',
        links: [
          { id: 'footer-link-1', label: 'About Us', href: '/about' },
          { id: 'footer-link-2', label: 'Contact Us', href: '/contact' },
          { id: 'footer-link-3', label: 'Promotions', href: '/promotions' },
          { id: 'footer-link-4', label: 'Design Gallery', href: '/design-gallery' },
        ],
      },
      {
        id: 'footer-col-2',
        title: 'Your Account',
        links: [
          { id: 'footer-link-5', label: 'My Account', href: '/account' },
          { id: 'footer-link-6', label: 'My Designs', href: '/account/designs' },
          { id: 'footer-link-7', label: 'Track Your Order', href: '/order-tracking' },
          { id: 'footer-link-8', label: 'View Cart', href: '/cart' },
        ],
      },
      {
        id: 'footer-col-3',
        title: 'Shop',
        links: [
          { id: 'footer-link-9', label: 'All Products', href: '/products' },
          { id: 'footer-link-10', label: 'Design Lab', href: '/design-lab' },
          { id: 'footer-link-11', label: 'Promotions', href: '/promotions' },
          { id: 'footer-link-12', label: 'Help Center', href: '/help' },
        ],
      },
      {
        id: 'footer-col-4',
        title: 'Support',
        links: [
          { id: 'footer-link-13', label: 'Help Center', href: '/help' },
          { id: 'footer-link-14', label: 'Contact Us', href: '/contact' },
          { id: 'footer-link-15', label: 'Shipping Info', href: '/shipping-info' },
          { id: 'footer-link-16', label: 'Returns', href: '/returns' },
        ],
      },
      {
        id: 'footer-col-5',
        title: 'Legal',
        links: [
          { id: 'footer-link-17', label: 'Privacy Policy', href: '/privacy-policy' },
          { id: 'footer-link-18', label: 'Terms of Service', href: '/terms-of-service' },
          { id: 'footer-link-19', label: 'Size Guide', href: '/size-guide' },
          { id: 'footer-link-20', label: 'Sitemap', href: '/sitemap.xml' },
        ],
      },
    ],
    footerCopyright: '© 2025 Inkify LLC. All rights reserved.',
  },
};

// [2025-11-16 16:05:00] Production workflow stage templates per product line
const DEFAULT_PRODUCTION_TEMPLATES = [
  {
    id: 'tshirt',
    name: 'T-Shirt',
    stages: [
      { key: 'pending-design', label: '待确认设计' },
      { key: 'layout-proof', label: '设计排版/校样' },
      { key: 'printing', label: '印刷生产' },
      { key: 'transfer', label: '转印生产' },
      { key: 'qc', label: '出货审核' },
      { key: 'ready', label: '待取货/发货' },
    ],
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    stages: [
      { key: 'pending-design', label: '待确认设计' },
      { key: 'layout-proof', label: '设计排版/校样' },
      { key: 'printing', label: '印刷生产' },
      { key: 'transfer', label: '转印生产' },
      { key: 'qc', label: '出货审核' },
      { key: 'ready', label: '待取货/发货' },
    ],
  },
];

// [2025-01-28 07:15:00] 使用 Prisma 原始查询访问 settings 表（因为 settings 不在 Prisma schema 中）
const getSettingValue = async (key, defaultValue) => {
  try {
    const setting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${key} LIMIT 1
    `.then((results) => results[0] || null);

    if (!setting) {
      return defaultValue;
    }

    // 解析 JSON 值（可能是字符串或对象）
    let parsedValue = defaultValue;
    if (setting.value) {
      try {
        parsedValue = typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value;
      } catch (e) {
        logger.warn('Failed to parse setting value', { key, error: e.message });
        parsedValue = defaultValue;
      }
    }

    // 合并默认值和数据库值
    return {
      ...defaultValue,
      ...parsedValue,
    };
  } catch (error) {
    logger.error('Error getting setting value', { key, error: error.message });
    return defaultValue;
  }
};

const upsertSetting = async (key, value, userId) => {
  try {
    const now = new Date();

    // [2025-12-31] 修复：分步处理，避免 PostgreSQL gen_random_uuid() 兼容性问题
    // 1. 先检查记录是否存在
    const existing = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${key} LIMIT 1
    `.then((results) => results[0] || null);

    const valueJson = JSON.stringify(value);

    if (existing) {
      // 2a. 更新现有记录
      await prisma.$executeRaw`
        UPDATE settings 
        SET value = ${valueJson}::jsonb,
            updated_by = ${userId || null},
            updated_at = ${now}
        WHERE key = ${key}
      `;
      logger.info('[adminSettingController] Setting updated', { key, userId: userId || 'system' });
    } else {
      // 2b. 插入新记录 - 使用 Node.js UUID 生成
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();

      // [2025-12-31] 修复：将字符串 UUID 转换为 PostgreSQL uuid 类型
      await prisma.$executeRaw`
       INSERT INTO settings (id, key, value, updated_by, updated_at)
        VALUES (${id}::uuid, ${key}, ${valueJson}::jsonb, ${userId || null}, ${now})
      `;
      logger.info('[adminSettingController] Setting created', { key, userId: userId || 'system' });
    }

    // 3. 获取更新后的值
    const setting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${key} LIMIT 1
    `.then((results) => results[0]);

    return setting;
  } catch (error) {
    logger.error('[adminSettingController] Error upserting setting', {
      key,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

exports.getSiteSettings = async (req, res) => {
  try {
    const data = await getSettingValue('site.settings', DEFAULT_SITE_SETTINGS);
    res.json({ data });
  } catch (error) {
    console.error('[adminSettingController] getSiteSettings error:', error);
    res.status(500).json({ error: 'Failed to load site settings' });
  }
};

exports.updateSiteSettings = async (req, res) => {
  try {
    const payload = { ...DEFAULT_SITE_SETTINGS, ...(req.body || {}) };
    await upsertSetting('site.settings', payload, req.user?.id);
    res.json({ data: payload });
  } catch (error) {
    console.error('[adminSettingController] updateSiteSettings error:', error);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
};

exports.getContentConfig = async (req, res) => {
  try {
    logger.info('[admin SettingController] getContentConfig called', {
      userId: req.user?.id,
      userRole: req.user?.role
    });
    const data = await getSettingValue('site.content', DEFAULT_CONTENT_CONFIG);
    res.json({ data });
  } catch (error) {
    logger.error('[adminSettingController] getContentConfig error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to load content configuration',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// [2025-01-28 06:15:00] 公共内容 API（不需要管理员权限，供前端展示使用）
exports.getPublicContentConfig = async (req, res) => {
  try {
    const data = await getSettingValue('site.content', DEFAULT_CONTENT_CONFIG);
    res.json({ data });
  } catch (error) {
    console.error('[adminSettingController] getPublicContentConfig error:', error);
    res.status(500).json({ error: 'Failed to load content configuration' });
  }
};

exports.updateContentConfig = async (req, res) => {
  try {
    logger.info('[adminSettingController] updateContentConfig called', {
      userId: req.user?.id,
      userRole: req.user?.role,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });
    const payload = {
      ...DEFAULT_CONTENT_CONFIG,
      ...(req.body || {}),
    };
    await upsertSetting('site.content', payload, req.user?.id);
    logger.info('[adminSettingController] Content config updated successfully', { userId: req.user?.id });
    res.json({ data: payload });
  } catch (error) {
    logger.error('[adminSettingController] updateContentConfig error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to update content configuration',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// [2025-11-16 16:05:00] Production templates (stage definitions) APIs
exports.getProductionTemplates = async (req, res) => {
  try {
    const data = await getSettingValue('production.templates', DEFAULT_PRODUCTION_TEMPLATES);
    res.json({ data });
  } catch (error) {
    console.error('[adminSettingController] getProductionTemplates error:', error);
    res.status(500).json({ error: 'Failed to load production templates' });
  }
};

exports.updateProductionTemplates = async (req, res) => {
  try {
    const incoming = Array.isArray(req.body) ? req.body : DEFAULT_PRODUCTION_TEMPLATES;
    // Basic validation and normalization
    const sanitize = (arr) =>
      (arr || []).map((tpl) => ({
        id: String(tpl.id || '').trim() || 'template',
        name: String(tpl.name || '').trim() || 'Template',
        stages: Array.isArray(tpl.stages)
          ? tpl.stages
            .filter((s) => s && (s.key || s.label))
            .map((s) => ({
              key: String(s.key || '')
                .toLowerCase()
                .replace(/[^a-z0-9-]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 60),
              label: String(s.label || s.key || '').trim().substring(0, 60),
            }))
          : [],
      }));

    const payload = sanitize(incoming);
    await upsertSetting('production.templates', payload, req.user?.id);
    res.json({ data: payload });
  } catch (error) {
    console.error('[adminSettingController] updateProductionTemplates error:', error);
    res.status(500).json({ error: 'Failed to update production templates' });
  }
};

