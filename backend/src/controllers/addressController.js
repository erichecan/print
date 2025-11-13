/**
 * Address Controller
 * [2025-01-27 14:00:00] User address management API endpoints
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/errors');

/**
 * GET /api/addresses - List user's addresses
 * [2025-01-27 14:00:00]
 */
exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      addresses: addresses.map((addr) => ({
        id: addr.id,
        firstName: addr.firstName,
        lastName: addr.lastName,
        company: addr.company,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        province: addr.province,
        postalCode: addr.postalCode,
        country: addr.country,
        phone: addr.phone,
        isDefault: addr.isDefault,
        createdAt: addr.createdAt,
        updatedAt: addr.updatedAt,
      })),
      count: addresses.length,
    });
  } catch (error) {
    logger.error('Error fetching addresses:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
};

/**
 * GET /api/addresses/:id - Get address by ID
 * [2025-01-27 14:00:00]
 */
exports.getAddressById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const address = await prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Verify ownership
    if (address.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    });
  } catch (error) {
    logger.error('Error fetching address:', {
      error: error.message,
      stack: error.stack,
      addressId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to fetch address' });
  }
};

/**
 * POST /api/addresses - Create new address
 * [2025-01-27 14:00:00]
 */
exports.createAddress = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      province,
      postalCode,
      country = 'CA',
      phone,
      isDefault = false,
    } = req.body;

    // Validation
    if (!address1 || !city || !province || !postalCode) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['address1', 'city', 'province', 'postalCode'],
      });
    }

    // If setting as default, unset other default addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        address1,
        address2: address2 || null,
        city,
        province,
        postalCode,
        country: country.toUpperCase(),
        phone: phone || null,
        isDefault,
      },
    });

    logger.info('Address created', {
      addressId: address.id,
      userId,
      isDefault,
    });

    res.status(201).json({
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    });
  } catch (error) {
    logger.error('Error creating address:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to create address' });
  }
};

/**
 * PUT /api/addresses/:id - Update address
 * [2025-01-27 14:00:00]
 */
exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      province,
      postalCode,
      country,
      phone,
      isDefault,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch existing address
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Verify ownership
    if (existingAddress.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If setting as default, unset other default addresses
    if (isDefault === true && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    // Build update data
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;
    if (company !== undefined) updateData.company = company || null;
    if (address1 !== undefined) updateData.address1 = address1;
    if (address2 !== undefined) updateData.address2 = address2 || null;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (country !== undefined) updateData.country = country.toUpperCase();
    if (phone !== undefined) updateData.phone = phone || null;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const address = await prisma.address.update({
      where: { id },
      data: updateData,
    });

    logger.info('Address updated', {
      addressId: address.id,
      userId,
    });

    res.json({
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    });
  } catch (error) {
    logger.error('Error updating address:', {
      error: error.message,
      stack: error.stack,
      addressId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to update address' });
  }
};

/**
 * DELETE /api/addresses/:id - Delete address
 * [2025-01-27 14:00:00]
 */
exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch existing address
    const address = await prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Verify ownership
    if (address.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.address.delete({
      where: { id },
    });

    logger.info('Address deleted', {
      addressId: id,
      userId,
    });

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    logger.error('Error deleting address:', {
      error: error.message,
      stack: error.stack,
      addressId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to delete address' });
  }
};

/**
 * PATCH /api/addresses/:id/set-default - Set address as default
 * [2025-01-27 14:00:00]
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch existing address
    const address = await prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Verify ownership
    if (address.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Unset other default addresses
    await prisma.address.updateMany({
      where: {
        userId,
        id: { not: id },
      },
      data: { isDefault: false },
    });

    // Set this address as default
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    logger.info('Default address set', {
      addressId: id,
      userId,
    });

    res.json({
      id: updatedAddress.id,
      isDefault: updatedAddress.isDefault,
      message: 'Default address updated',
    });
  } catch (error) {
    logger.error('Error setting default address:', {
      error: error.message,
      stack: error.stack,
      addressId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to set default address' });
  }
};

