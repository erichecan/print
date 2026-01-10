const { getSettingValue, upsertSetting } = require('../services/settingService');

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

const DEFAULT_SHIPPING_SETTINGS = {
  standard: {
    enabled: true,
    cost: 9.99,
    costUS: 12.99,
    costIntl: 15.99,
    estimatedDaysCA: 7,
    estimatedDaysUS: 10,
  },
  express: {
    enabled: true,
    cost: 19.99,
    costUS: 24.99,
    costIntl: 29.99,
    estimatedDaysCA: 3,
    estimatedDaysUS: 5,
  },
  express: {
    enabled: true,
    cost: 19.99,
    costUS: 24.99,
    costIntl: 29.99,
    estimatedDaysCA: 3,
    estimatedDaysUS: 5,
  },
};

const DEFAULT_COLOR_MAPPINGS = [
  //  { id: 'color-white', productColor: 'White', values: ['#FFFFFF'], images: [] },
  //  { id: 'color-black', productColor: 'Black', values: ['#000000'], images: [] },
  //  { id: 'color-grey', productColor: 'Grey', values: ['#808080'], images: [] },
  //  { id: 'color-navy', productColor: 'Navy', values: ['#000080'], images: [] },
  //  { id: 'color-red', productColor: 'Red', values: ['#FF0000'], images: [] },
  //  { id: 'color-blue', productColor: 'Royal', values: ['#4169E1'], images: [] },
];

// ... (DEFAULT_CONTENT_CONFIG and DEFAULT_PRODUCTION_TEMPLATES remain same)
// 扩展内容配置，包含首页、关于页、帮助页和静态文字
const DEFAULT_CONTENT_CONFIG = {
  // 保留原有字段以向后兼容
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
  // 首页内容配置
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
  },
  // 关于页内容配置
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
  // 帮助页内容配置
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
  // 通用静态文字配置
  staticTexts: {
    topMessageBar: 'Custom T-shirts & Promotional Products • Fast & Free Shipping • All-inclusive Pricing',
  },
  // Footer 配置
  footer: {
    socialLinks: [
      { id: 'social-1', platform: 'Facebook', url: 'https://facebook.com', icon: 'facebook' },
      { id: 'social-2', platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'linkedin' },
      { id: 'social-3', platform: 'Pinterest', url: 'https://pinterest.com', icon: 'pinterest' },
      { id: 'social-4', platform: 'Instagram', url: 'https://instagram.com', icon: 'instagram' },
      { id: 'social-5', platform: 'RSS', url: '/rss', icon: 'rss' },
    ],
    contactInfo: {
      phone: '855-256-1652',
      email: 'support@souvenirplus.com',
      hours: {
        weekday: 'Monday-Friday: 8am - Midnight ET',
        saturday: 'Saturday: 10am - 6pm ET',
        sunday: 'Sunday: 10am - 6pm ET',
      },
      holidayNotice: 'Jan. 1st - Closed',
    },
    columns: [
      {
        id: 'footer-col-1',
        title: 'About Us',
        links: [
          { id: 'footer-link-1', label: 'Get to Know Custom Ink', href: '/about' },
          { id: 'footer-link-2', label: 'Careers', href: '/careers' },
          { id: 'footer-link-3', label: 'Press', href: '/press' },
          { id: 'footer-link-4', label: 'Partnerships', href: '/partnerships' },
          { id: 'footer-link-5', label: 'Diversity & Belonging', href: '/diversity' },
          { id: 'footer-link-6', label: 'Customer Reviews', href: '/reviews' },
          { id: 'footer-link-7', label: 'Customer Photos', href: '/photos' },
          { id: 'footer-link-8', label: 'Custom Ink Blog', href: '/blog' },
          { id: 'footer-link-9', label: 'Store Locations', href: '/locations' },
        ],
      },
      {
        id: 'footer-col-2',
        title: 'Your Account',
        links: [
          { id: 'footer-link-10', label: 'Retrieve a Saved Design', href: '/designs' },
          { id: 'footer-link-11', label: 'Retrieve a Printed Proof', href: '/proofs' },
          { id: 'footer-link-12', label: 'Track Your Order', href: '/order-tracking' },
          { id: 'footer-link-13', label: 'Place a Reorder', href: '/reorder' },
        ],
      },
      {
        id: 'footer-col-3',
        title: 'Service Center',
        links: [
          { id: 'footer-link-14', label: 'Help Center', href: '/help' },
          { id: 'footer-link-15', label: 'Get a Quick Quote', href: '/quote' },
          { id: 'footer-link-16', label: 'Content Guidelines', href: '/content-guidelines' },
          { id: 'footer-link-17', label: 'Our Commitment to Accessibility', href: '/accessibility' },
        ],
      },
    ],
    copyrightText: '© 2025 Inkify LLC. All rights reserved.',
    bottomLinks: [
      { id: 'bottom-link-1', label: 'Privacy Policy', href: '/privacy-policy' },
      { id: 'bottom-link-2', label: 'Terms of Service', href: '/terms-of-service' },
      { id: 'bottom-link-3', label: 'Sitemap', href: '/sitemap.xml' },
    ],
  },
};

// Production workflow stage templates per product line
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

// 公共内容 API（不需要管理员权限，供前端展示使用）
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

// Production templates (stage definitions) APIs
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

// Shipping Settings
exports.getShippingSettings = async (req, res) => {
  try {
    const data = await getSettingValue('site.shipping', DEFAULT_SHIPPING_SETTINGS);
    res.json({ data });
  } catch (error) {
    console.error('[adminSettingController] getShippingSettings error:', error);
    res.status(500).json({ error: 'Failed to load shipping settings' });
  }
};

exports.updateShippingSettings = async (req, res) => {
  try {
    const payload = { ...DEFAULT_SHIPPING_SETTINGS, ...(req.body || {}) };
    await upsertSetting('site.shipping', payload, req.user?.id);
    res.json({ data: payload });
  } catch (error) {
    console.error('[adminSettingController] updateShippingSettings error:', error);
    res.status(500).json({ error: 'Failed to update shipping settings' });
  }
};

// Color Mappings
exports.getColorMappings = async (req, res) => {
  try {
    const data = await getSettingValue('site.colorMappings', DEFAULT_COLOR_MAPPINGS);
    console.log('[Debug] getColorMappings result count:', data ? data.length : 0);
    // console.log('[Debug] Data sample:', data ? JSON.stringify(data[0]) : 'null');
    res.json({ data });
  } catch (error) {
    console.error('[adminSettingController] getColorMappings error:', error);
    res.status(500).json({ error: 'Failed to load color mappings' });
  }
};

exports.updateColorMappings = async (req, res) => {
  try {
    const { mappings } = req.body;
    await upsertSetting('site.colorMappings', mappings, req.user?.id);
    res.json({ success: true, data: mappings });
  } catch (error) {
    console.error('[adminSettingController] updateColorMappings error:', error);
    res.status(500).json({ error: 'Failed to update color mappings' });
  }
};

exports.deleteColorMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const currentMappings = await getSettingValue('site.colorMappings', DEFAULT_COLOR_MAPPINGS);
    const newMappings = currentMappings.filter(m => m.id !== id);
    await upsertSetting('site.colorMappings', newMappings, req.user?.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[adminSettingController] deleteColorMapping error:', error);
    res.status(500).json({ error: 'Failed to delete color mapping' });
  }
};

