// 2026-03-06: 使用共享 prisma 实例（与 lib/prisma 一致，确保 Cloud SQL 连接串修复生效）
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

const testimonialController = {
    // Get all active testimonials (for public view)
    getActiveTestimonials: async (req, res) => {
        try {
            const testimonials = await prisma.testimonial.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
            });
            res.json(testimonials);
        } catch (error) {
            logger.error('[Testimonial] getActiveTestimonials error:', { message: error.message, code: error.code, meta: error.meta });
            res.status(500).json({ error: 'Failed to fetch testimonials' });
        }
    },

    // Get all testimonials (for admin)
    getAllTestimonials: async (req, res) => {
        try {
            const testimonials = await prisma.testimonial.findMany({
                orderBy: { sortOrder: 'asc' },
            });
            res.json(testimonials);
        } catch (error) {
            logger.error('[Testimonial] getAllTestimonials error:', { message: error.message, code: error.code, meta: error.meta });
            res.status(500).json({ error: 'Failed to fetch testimonials' });
        }
    },

    // Create a new testimonial
    createTestimonial: async (req, res) => {
        try {
            const { author, content, rating, source, isActive, sortOrder, avatarUrl } = req.body;
            const testimonial = await prisma.testimonial.create({
                data: {
                    author,
                    content,
                    rating: rating || 5,
                    source,
                    isActive: isActive !== undefined ? isActive : true,
                    sortOrder: sortOrder || 0,
                    avatarUrl,
                },
            });
            res.status(201).json(testimonial);
        } catch (error) {
            logger.error('[Testimonial] createTestimonial error:', { message: error.message, code: error.code });
            res.status(500).json({ error: 'Failed to create testimonial' });
        }
    },

    // Update a testimonial
    updateTestimonial: async (req, res) => {
        try {
            const { id } = req.params;
            const { author, content, rating, source, isActive, sortOrder, avatarUrl } = req.body;
            const testimonial = await prisma.testimonial.update({
                where: { id },
                data: {
                    author,
                    content,
                    rating,
                    source,
                    isActive,
                    sortOrder,
                    avatarUrl,
                },
            });
            res.json(testimonial);
        } catch (error) {
            logger.error('[Testimonial] updateTestimonial error:', { message: error.message, code: error.code });
            res.status(500).json({ error: 'Failed to update testimonial' });
        }
    },

    // Delete a testimonial
    deleteTestimonial: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.testimonial.delete({
                where: { id },
            });
            res.json({ message: 'Testimonial deleted successfully' });
        } catch (error) {
            logger.error('[Testimonial] deleteTestimonial error:', { message: error.message, code: error.code });
            res.status(500).json({ error: 'Failed to delete testimonial' });
        }
    },
};

module.exports = testimonialController;
