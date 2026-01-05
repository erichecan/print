/**
 * Setting Service
 * Centralized configuration management using 'settings' table (raw SQL)
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Get setting value with default fallback
 * @param {string} key - Setting key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} Setting value
 */
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

        // 合并默认值和数据库值 (如果是对象)
        if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
            return {
                ...defaultValue,
                ...parsedValue,
            };
        }

        return parsedValue;
    } catch (error) {
        logger.error('Error getting setting value', { key, error: error.message });
        return defaultValue;
    }
};

/**
 * Update or create setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @param {string} userId - User ID who updated
 * @returns {Promise<any>} Updated setting
 */
const upsertSetting = async (key, value, userId) => {
    try {
        const now = new Date();

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
            updated_by = ${userId || null}::uuid,
            updated_at = ${now}
        WHERE key = ${key}
      `;
            logger.info('Setting updated', { key, userId: userId || 'system' });
        } else {
            // 2b. 插入新记录
            const id = uuidv4();

            await prisma.$executeRaw`
       INSERT INTO settings (id, key, value, updated_by, updated_at)
        VALUES (${id}::uuid, ${key}, ${valueJson}::jsonb, ${userId || null}::uuid, ${now})
      `;
            logger.info('Setting created', { key, userId: userId || 'system' });
        }

        // 3. 获取更新后的值
        const setting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = ${key} LIMIT 1
    `.then((results) => results[0]);

        return setting;
    } catch (error) {
        logger.error('Error upserting setting', {
            key,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

module.exports = {
    getSettingValue,
    upsertSetting,
};
