/**
 * Admin Promotion Controller
 * [2025-11-15 15:20:00] Manage promotional campaigns
 */
const { Op } = require('sequelize');
const { Promotion } = require('../models');

const mapPromotion = (promotion) => ({
  id: promotion.id,
  title: promotion.title,
  description: promotion.description,
  bannerImageUrl: promotion.banner_image_url,
  linkUrl: promotion.link_url,
  startDate: promotion.start_date,
  endDate: promotion.end_date,
  isActive: promotion.is_active,
  sortOrder: promotion.sort_order,
  createdAt: promotion.createdAt,
  updatedAt: promotion.updatedAt,
});

exports.listPromotions = async (req, res) => {
  try {
    const { search, status = 'all' } = req.query;
    const where = {};

    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    const promotions = await Promotion.findAll({
      where,
      order: [
        ['is_active', 'DESC'],
        ['sort_order', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    res.json({ data: promotions.map(mapPromotion) });
  } catch (error) {
    console.error('[adminPromotionController] listPromotions error:', error);
    res.status(500).json({ error: 'Failed to load promotions' });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const promotion = await Promotion.create({
      title: payload.title,
      description: payload.description || null,
      banner_image_url: payload.bannerImageUrl || null,
      link_url: payload.linkUrl || null,
      start_date: payload.startDate || null,
      end_date: payload.endDate || null,
      is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      sort_order: payload.sortOrder ?? 0,
    });

    res.status(201).json({ data: mapPromotion(promotion) });
  } catch (error) {
    console.error('[adminPromotionController] createPromotion error:', error);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    await promotion.update({
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.bannerImageUrl !== undefined ? { banner_image_url: payload.bannerImageUrl } : {}),
      ...(payload.linkUrl !== undefined ? { link_url: payload.linkUrl } : {}),
      ...(payload.startDate !== undefined ? { start_date: payload.startDate } : {}),
      ...(payload.endDate !== undefined ? { end_date: payload.endDate } : {}),
      ...(payload.isActive !== undefined ? { is_active: Boolean(payload.isActive) } : {}),
      ...(payload.sortOrder !== undefined ? { sort_order: payload.sortOrder } : {}),
    });

    res.json({ data: mapPromotion(promotion) });
  } catch (error) {
    console.error('[adminPromotionController] updatePromotion error:', error);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Promotion.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.status(204).end();
  } catch (error) {
    console.error('[adminPromotionController] deletePromotion error:', error);
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
};

