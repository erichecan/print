/**
 * User Preference Controller
 * [2025-01-27 14:45:00] User notification preferences and account settings
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GET /api/user/preferences - Get user preferences
 * [2025-01-27 14:45:00]
 */
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user preferences (stored as JSON in a setting record)
    // Using raw query since Setting model is not in Prisma schema
    const preferenceKey = `user_preferences_${userId}`;
    const setting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${preferenceKey} LIMIT 1
    `.then((results) => results[0] || null);

    // Default preferences
    const defaultPreferences = {
      emailNotifications: {
        orderUpdates: true,
        promotions: true,
        newsletters: true,
        productUpdates: false,
      },
      smsNotifications: {
        orderUpdates: false,
        promotions: false,
      },
      privacy: {
        profileVisible: true,
        showEmail: false,
        showPhone: false,
      },
    };

    // Parse JSON value if it's a string
    let preferences = defaultPreferences;
    if (setting?.value) {
      try {
        preferences = typeof setting.value === 'string' 
          ? JSON.parse(setting.value) 
          : setting.value;
      } catch (e) {
        logger.warn('Failed to parse preference value', { userId, error: e.message });
      }
    }

    res.json({
      preferences,
      updatedAt: setting?.updated_at || null,
    });
  } catch (error) {
    logger.error('Error fetching user preferences:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

/**
 * PUT /api/user/preferences - Update user preferences
 * [2025-01-27 14:45:00]
 */
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { emailNotifications, smsNotifications, privacy } = req.body;

    // Get current preferences
    const preferenceKey = `user_preferences_${userId}`;
    const existingSetting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${preferenceKey} LIMIT 1
    `.then((results) => results[0] || null);

    // Default preferences
    const defaultPreferences = {
      emailNotifications: {
        orderUpdates: true,
        promotions: true,
        newsletters: true,
        productUpdates: false,
      },
      smsNotifications: {
        orderUpdates: false,
        promotions: false,
      },
      privacy: {
        profileVisible: true,
        showEmail: false,
        showPhone: false,
      },
    };

    // Parse existing preferences
    let currentPreferences = defaultPreferences;
    if (existingSetting?.value) {
      try {
        currentPreferences = typeof existingSetting.value === 'string'
          ? JSON.parse(existingSetting.value)
          : existingSetting.value;
      } catch (e) {
        logger.warn('Failed to parse existing preference value', { userId, error: e.message });
      }
    }
    const updatedPreferences = {
      emailNotifications: {
        ...currentPreferences.emailNotifications,
        ...emailNotifications,
      },
      smsNotifications: {
        ...currentPreferences.smsNotifications,
        ...smsNotifications,
      },
      privacy: {
        ...currentPreferences.privacy,
        ...privacy,
      },
    };

    // Update or create setting using raw query
    const valueJson = JSON.stringify(updatedPreferences);
    const now = new Date();
    
    await prisma.$executeRaw`
      INSERT INTO settings (id, key, value, updated_by, updated_at)
      VALUES (gen_random_uuid(), ${preferenceKey}, ${valueJson}::jsonb, ${userId}, ${now})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${valueJson}::jsonb,
        updated_by = ${userId},
        updated_at = ${now}
    `;

    const setting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${preferenceKey} LIMIT 1
    `.then((results) => results[0]);

    logger.info('User preferences updated', {
      userId,
      preferenceKey,
    });

    // Parse setting value
    let preferencesValue = updatedPreferences;
    if (setting?.value) {
      try {
        preferencesValue = typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value;
      } catch (e) {
        preferencesValue = updatedPreferences;
      }
    }

    res.json({
      message: 'Preferences updated successfully',
      preferences: preferencesValue,
      updatedAt: setting?.updated_at || now,
    });
  } catch (error) {
    logger.error('Error updating user preferences:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

