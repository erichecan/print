/**
 * Shipping Template Controller
 * Handles CRUD operations for shipping templates and rules
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GET /api/admin/shipping-templates
 * List all shipping templates
 */
exports.listTemplates = async (req, res) => {
    try {
        const { includeInactive = 'false' } = req.query;

        const where = includeInactive === 'true' ? {} : { isActive: true };

        const templates = await prisma.shippingTemplate.findMany({
            where,
            include: {
                rules: true,
                products: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        rules: true,
                        products: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        res.json({ templates });
    } catch (error) {
        logger.error('[shippingTemplateController] listTemplates error:', error);
        res.status(500).json({ error: 'Failed to load shipping templates' });
    }
};

/**
 * GET /api/admin/shipping-templates/:id
 * Get a single shipping template
 */
exports.getTemplate = async (req, res) => {
    try {
        const { id } = req.params;

        const template = await prisma.shippingTemplate.findUnique({
            where: { id },
            include: {
                rules: {
                    orderBy: { createdAt: 'asc' },
                },
                products: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                basePrice: true,
                            },
                        },
                    },
                },
            },
        });

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ template });
    } catch (error) {
        logger.error('[shippingTemplateController] getTemplate error:', error);
        res.status(500).json({ error: 'Failed to load shipping template' });
    }
};

/**
 * POST /api/admin/shipping-templates
 * Create a new shipping template
 */
exports.createTemplate = async (req, res) => {
    try {
        const {
            name,
            description,
            priority = 50,
            isActive = true,
            startDate,
            endDate,
            rules = [],
            productIds = [],
        } = req.body;

        // Validation
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Template name is required' });
        }

        if (rules.length === 0) {
            return res.status(400).json({ error: 'At least one rule is required' });
        }

        // Create template with rules and products
        const template = await prisma.shippingTemplate.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                priority: parseInt(priority, 10),
                isActive,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                createdBy: req.user?.id || null,
                rules: {
                    create: rules.map(rule => ({
                        country: rule.country || null,
                        provinces: rule.provinces || [],
                        postalCodePattern: rule.postalCodePattern || null,
                        startDate: rule.startDate ? new Date(rule.startDate) : null,
                        endDate: rule.endDate ? new Date(rule.endDate) : null,
                        seasonTag: rule.seasonTag || null,
                        minOrderAmount: rule.minOrderAmount ? parseFloat(rule.minOrderAmount) : null,
                        maxOrderAmount: rule.maxOrderAmount ? parseFloat(rule.maxOrderAmount) : null,
                        minWeight: rule.minWeight ? parseFloat(rule.minWeight) : null,
                        maxWeight: rule.maxWeight ? parseFloat(rule.maxWeight) : null,
                        shippingMethod: rule.shippingMethod,
                        estimatedDays: parseInt(rule.estimatedDays, 10),
                        cost: parseFloat(rule.cost),
                        isFreeShipping: rule.isFreeShipping || false,
                    })),
                },
                products: productIds.length > 0 ? {
                    create: productIds.map(productId => ({
                        productId,
                    })),
                } : undefined,
            },
            include: {
                rules: true,
                products: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
            },
        });

        logger.info('[shippingTemplateController] Template created:', {
            templateId: template.id,
            name: template.name,
            rulesCount: template.rules.length,
            productsCount: template.products.length,
            userId: req.user?.id,
        });

        res.status(201).json({ template });
    } catch (error) {
        logger.error('[shippingTemplateController] createTemplate error:', error);
        res.status(500).json({ error: 'Failed to create shipping template' });
    }
};

/**
 * PATCH /api/admin/shipping-templates/:id
 * Update a shipping template
 */
exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            priority,
            isActive,
            startDate,
            endDate,
            rules,
            productIds,
        } = req.body;

        // Check if template exists
        const existing = await prisma.shippingTemplate.findUnique({
            where: { id },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Build update data
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (priority !== undefined) updateData.priority = parseInt(priority, 10);
        if (isActive !== undefined) updateData.isActive = isActive;
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

        // Update template in a transaction
        const template = await prisma.$transaction(async (tx) => {
            // Update basic fields
            const updated = await tx.shippingTemplate.update({
                where: { id },
                data: updateData,
            });

            // Update rules if provided
            if (Array.isArray(rules)) {
                // Delete existing rules
                await tx.shippingRule.deleteMany({
                    where: { templateId: id },
                });

                // Create new rules
                if (rules.length > 0) {
                    await tx.shippingRule.createMany({
                        data: rules.map(rule => ({
                            templateId: id,
                            country: rule.country || null,
                            provinces: rule.provinces || [],
                            postalCodePattern: rule.postalCodePattern || null,
                            startDate: rule.startDate ? new Date(rule.startDate) : null,
                            endDate: rule.endDate ? new Date(rule.endDate) : null,
                            seasonTag: rule.seasonTag || null,
                            minOrderAmount: rule.minOrderAmount ? parseFloat(rule.minOrderAmount) : null,
                            maxOrderAmount: rule.maxOrderAmount ? parseFloat(rule.maxOrderAmount) : null,
                            minWeight: rule.minWeight ? parseFloat(rule.minWeight) : null,
                            maxWeight: rule.maxWeight ? parseFloat(rule.maxWeight) : null,
                            shippingMethod: rule.shippingMethod,
                            estimatedDays: parseInt(rule.estimatedDays, 10),
                            cost: parseFloat(rule.cost),
                            isFreeShipping: rule.isFreeShipping || false,
                        })),
                    });
                }
            }

            // Update products if provided
            if (Array.isArray(productIds)) {
                // Delete existing product associations
                await tx.shippingTemplateProduct.deleteMany({
                    where: { templateId: id },
                });

                // Create new product associations
                if (productIds.length > 0) {
                    await tx.shippingTemplateProduct.createMany({
                        data: productIds.map(productId => ({
                            templateId: id,
                            productId,
                        })),
                    });
                }
            }

            // Fetch updated template with relations
            return tx.shippingTemplate.findUnique({
                where: { id },
                include: {
                    rules: true,
                    products: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                },
                            },
                        },
                    },
                },
            });
        });

        logger.info('[shippingTemplateController] Template updated:', {
            templateId: id,
            userId: req.user?.id,
        });

        res.json({ template });
    } catch (error) {
        logger.error('[shippingTemplateController] updateTemplate error:', error);
        res.status(500).json({ error: 'Failed to update shipping template' });
    }
};

/**
 * DELETE /api/admin/shipping-templates/:id
 * Delete a shipping template
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if template exists
        const existing = await prisma.shippingTemplate.findUnique({
            where: { id },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Delete template (cascade will delete rules and product associations)
        await prisma.shippingTemplate.delete({
            where: { id },
        });

        logger.info('[shippingTemplateController] Template deleted:', {
            templateId: id,
            templateName: existing.name,
            userId: req.user?.id,
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('[shippingTemplateController] deleteTemplate error:', error);
        res.status(500).json({ error: 'Failed to delete shipping template' });
    }
};

/**
 * POST /api/admin/shipping-templates/:id/duplicate
 * Duplicate a shipping template
 */
exports.duplicateTemplate = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch original template
        const original = await prisma.shippingTemplate.findUnique({
            where: { id },
            include: {
                rules: true,
                products: true,
            },
        });

        if (!original) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Create duplicate
        const duplicate = await prisma.shippingTemplate.create({
            data: {
                name: `${original.name} (Copy)`,
                description: original.description,
                priority: original.priority,
                isActive: false, // Disable by default
                startDate: original.startDate,
                endDate: original.endDate,
                createdBy: req.user?.id || null,
                rules: {
                    create: original.rules.map(rule => ({
                        country: rule.country,
                        provinces: rule.provinces,
                        postalCodePattern: rule.postalCodePattern,
                        startDate: rule.startDate,
                        endDate: rule.endDate,
                        seasonTag: rule.seasonTag,
                        minOrderAmount: rule.minOrderAmount,
                        maxOrderAmount: rule.maxOrderAmount,
                        minWeight: rule.minWeight,
                        maxWeight: rule.maxWeight,
                        shippingMethod: rule.shippingMethod,
                        estimatedDays: rule.estimatedDays,
                        cost: rule.cost,
                        isFreeShipping: rule.isFreeShipping,
                    })),
                },
                products: {
                    create: original.products.map(tp => ({
                        productId: tp.productId,
                    })),
                },
            },
            include: {
                rules: true,
                products: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
            },
        });

        logger.info('[shippingTemplateController] Template duplicated:', {
            originalId: id,
            duplicateId: duplicate.id,
            userId: req.user?.id,
        });

        res.status(201).json({ template: duplicate });
    } catch (error) {
        logger.error('[shippingTemplateController] duplicateTemplate error:', error);
        res.status(500).json({ error: 'Failed to duplicate shipping template' });
    }
};
