/**
 * Admin Setting Controller
 * [2025-11-15 15:30:00] Site configuration and content manager APIs
 */
const { Setting } = require('../models');

const DEFAULT_SITE_SETTINGS = {
  siteName: 'suvernire plus',
  contactEmail: 'support@souvenirplus.com',
  contactPhone: '800-293-4232',
  currency: 'USD',
  shippingProvider: 'UPS',
  paymentGateway: 'Stripe',
  testMode: true,
  autoApproveDesigns: false,
  copyrightCheck: true,
  reviewEmail: 'review@souvenirplus.com',
};

const DEFAULT_CONTENT_CONFIG = {
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
};

const getSettingValue = async (key, defaultValue) => {
  const setting = await Setting.findOne({ where: { key } });
  if (!setting) {
    return defaultValue;
  }
  return {
    ...defaultValue,
    ...(setting.value || {}),
  };
};

const upsertSetting = async (key, value, userId) => {
  const payload = {
    key,
    value,
    updated_by: userId || null,
    updated_at: new Date(),
  };

  const [record] = await Setting.upsert(payload, { returning: true });
  return record;
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
    const data = await getSettingValue('site.content', DEFAULT_CONTENT_CONFIG);
    res.json({ data });
  } catch (error) {
    console.error('[adminSettingController] getContentConfig error:', error);
    res.status(500).json({ error: 'Failed to load content configuration' });
  }
};

exports.updateContentConfig = async (req, res) => {
  try {
    const payload = {
      ...DEFAULT_CONTENT_CONFIG,
      ...(req.body || {}),
    };
    await upsertSetting('site.content', payload, req.user?.id);
    res.json({ data: payload });
  } catch (error) {
    console.error('[adminSettingController] updateContentConfig error:', error);
    res.status(500).json({ error: 'Failed to update content configuration' });
  }
};

