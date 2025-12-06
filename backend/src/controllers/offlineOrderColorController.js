/**
 * Offline Order Color Controller
 * [2025-12-06 17:50:00] PRD v2.0: 线下订单颜色管理 API
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GET /api/admin/offline-order-colors
 * 获取颜色列表
 */
exports.listColors = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const colors = await prisma.offlineOrderColor.findMany({
      orderBy: { createdAt: 'desc' },
    });

    logger.info('[OfflineOrderColor] List colors', { timestamp, count: colors.length });
    res.json({ data: colors });
  } catch (error) {
    logger.error('[OfflineOrderColor] List colors error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to list colors' });
  }
};

/**
 * POST /api/admin/offline-order-colors
 * 创建颜色
 */
exports.createColor = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { name, hexCode } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Color name is required' });
    }

    const color = await prisma.offlineOrderColor.create({
      data: {
        name: name.trim(),
        hexCode: hexCode?.trim() || null,
      },
    });

    logger.info('[OfflineOrderColor] Create color', { timestamp, colorId: color.id });
    res.status(201).json({ data: color });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Color name already exists' });
    }
    logger.error('[OfflineOrderColor] Create color error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to create color' });
  }
};

/**
 * PATCH /api/admin/offline-order-colors/:id
 * 更新颜色
 */
exports.updateColor = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { name, hexCode } = req.body;

    const updateData = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Color name cannot be empty' });
      }
      updateData.name = name.trim();
    }
    if (hexCode !== undefined) {
      updateData.hexCode = hexCode?.trim() || null;
    }

    const color = await prisma.offlineOrderColor.update({
      where: { id },
      data: updateData,
    });

    logger.info('[OfflineOrderColor] Update color', { timestamp, colorId: id });
    res.json({ data: color });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Color not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Color name already exists' });
    }
    logger.error('[OfflineOrderColor] Update color error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to update color' });
  }
};

/**
 * DELETE /api/admin/offline-order-colors/:id
 * 删除颜色
 */
exports.deleteColor = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;

    await prisma.offlineOrderColor.delete({
      where: { id },
    });

    logger.info('[OfflineOrderColor] Delete color', { timestamp, colorId: id });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Color not found' });
    }
    logger.error('[OfflineOrderColor] Delete color error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to delete color' });
  }
};

