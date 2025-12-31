/**
 * EasyShip Service
* EasyShip API integration for shipping label generation
 */
const axios = require('axios');
const logger = require('../utils/logger');

const EASYSHIP_API_BASE_URL = process.env.EASYSHIP_API_BASE_URL || 'https://api.easyship.com/v2';
const EASYSHIP_API_TOKEN = process.env.EASYSHIP_API_TOKEN;

/**
 * Get EasyShip API client
 */
function getEasyShipClient() {
  if (!EASYSHIP_API_TOKEN) {
    throw new Error('EasyShip API token is not configured');
  }

  return axios.create({
    baseURL: EASYSHIP_API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${EASYSHIP_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout
  });
}

/**
 * Create a shipment and generate shipping label
 * @param {Object} shipmentData - Shipment data including order, addresses, items, etc.
 * @returns {Promise<Object>} Shipment with label URL and tracking number
 */
async function createShipment(shipmentData) {
  const timestamp = new Date().toISOString();
  try {
    if (!EASYSHIP_API_TOKEN) {
      logger.warn('EasyShip API token not configured, skipping label generation', {
        timestamp,
        orderId: shipmentData.orderId,
      });
      throw new Error('EasyShip API token is not configured. Please set EASYSHIP_API_TOKEN environment variable.');
    }

    const client = getEasyShipClient();

// Prepare shipment payload for EasyShip API
    const payload = {
      platform_name: 'Suvernire Plus',
      platform_order_number: shipmentData.orderNumber,
      destination_address: {
        line_1: shipmentData.shippingAddress.addressLine1,
        line_2: shipmentData.shippingAddress.addressLine2 || '',
        city: shipmentData.shippingAddress.city,
        state: shipmentData.shippingAddress.province,
        postal_code: shipmentData.shippingAddress.postalCode,
        country_alpha2: shipmentData.shippingAddress.country,
        contact_name: shipmentData.shippingAddress.fullName,
        contact_phone: shipmentData.shippingAddress.phone || '',
        contact_email: shipmentData.email,
      },
      origin_address: {
        line_1: process.env.EASYSHIP_ORIGIN_ADDRESS_LINE1 || '123 Business St',
        line_2: process.env.EASYSHIP_ORIGIN_ADDRESS_LINE2 || '',
        city: process.env.EASYSHIP_ORIGIN_CITY || 'Toronto',
        state: process.env.EASYSHIP_ORIGIN_STATE || 'ON',
        postal_code: process.env.EASYSHIP_ORIGIN_POSTAL_CODE || 'M5H 2N2',
        country_alpha2: process.env.EASYSHIP_ORIGIN_COUNTRY || 'CA',
        contact_name: process.env.EASYSHIP_ORIGIN_CONTACT_NAME || 'Suvernire Plus',
        contact_phone: process.env.EASYSHIP_ORIGIN_CONTACT_PHONE || '416 916 6352',
        contact_email: process.env.EASYSHIP_ORIGIN_CONTACT_EMAIL || 'info@suvernireplus.com',
      },
      parcels: shipmentData.items.map((item, index) => ({
        description: item.productName || `Item ${index + 1}`,
        quantity: item.quantity,
        weight: item.weight || 0.5, // Default weight in kg
        value: Number(item.priceSnapshot) * item.quantity,
        currency: shipmentData.currency || 'CAD',
        sku: item.sku || '',
      })),
      selected_rate_id: shipmentData.rateId, // Optional: if rate was pre-selected
      courier_selection: {
        allow_courier_fallback: true,
      },
    };

    logger.info('Creating EasyShip shipment', {
      timestamp,
      orderId: shipmentData.orderId,
      orderNumber: shipmentData.orderNumber,
    });

// Create shipment via EasyShip API
    const response = await client.post('/shipments', payload);

    if (!response.data || !response.data.shipment) {
      throw new Error('Invalid response from EasyShip API');
    }

    const shipment = response.data.shipment;

    logger.info('EasyShip shipment created successfully', {
      timestamp,
      orderId: shipmentData.orderId,
      orderNumber: shipmentData.orderNumber,
      easyshipShipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      labelUrl: shipment.label?.url || null,
    });

    return {
      easyshipShipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      carrier: shipment.courier?.name || shipment.courier_id || null,
      labelUrl: shipment.label?.url || null,
      labelPdfUrl: shipment.label?.pdf_url || shipment.label?.url || null,
      status: shipment.state || 'LABEL_CREATED',
      rate: shipment.rate || null,
    };
  } catch (error) {
    logger.error('Error creating EasyShip shipment', {
      timestamp,
      orderId: shipmentData.orderId,
      orderNumber: shipmentData.orderNumber,
      error: error.message,
      stack: error.stack,
      response: error.response?.data || null,
    });

    if (error.response) {
      // EasyShip API error
      throw new Error(
        `EasyShip API error: ${error.response.data?.message || error.response.statusText || 'Unknown error'}`
      );
    }

    throw error;
  }
}

/**
 * Get shipment rates from EasyShip
 * @param {Object} rateData - Rate calculation data
 * @returns {Promise<Array>} Available shipping rates
 */
async function getShippingRates(rateData) {
  const timestamp = new Date().toISOString();
  try {
    if (!EASYSHIP_API_TOKEN) {
      logger.warn('EasyShip API token not configured, returning empty rates', { timestamp });
      return [];
    }

    const client = getEasyShipClient();

    const payload = {
      destination_address: {
        line_1: rateData.shippingAddress.addressLine1,
        line_2: rateData.shippingAddress.addressLine2 || '',
        city: rateData.shippingAddress.city,
        state: rateData.shippingAddress.province,
        postal_code: rateData.shippingAddress.postalCode,
        country_alpha2: rateData.shippingAddress.country,
      },
      origin_address: {
        line_1: process.env.EASYSHIP_ORIGIN_ADDRESS_LINE1 || '123 Business St',
        line_2: process.env.EASYSHIP_ORIGIN_ADDRESS_LINE2 || '',
        city: process.env.EASYSHIP_ORIGIN_CITY || 'Toronto',
        state: process.env.EASYSHIP_ORIGIN_STATE || 'ON',
        postal_code: process.env.EASYSHIP_ORIGIN_POSTAL_CODE || 'M5H 2N2',
        country_alpha2: process.env.EASYSHIP_ORIGIN_COUNTRY || 'CA',
      },
      parcels: rateData.items.map((item, index) => ({
        description: item.productName || `Item ${index + 1}`,
        quantity: item.quantity,
        weight: item.weight || 0.5, // Default weight in kg
        value: Number(item.priceSnapshot) * item.quantity,
        currency: rateData.currency || 'CAD',
      })),
    };

    logger.debug('Getting EasyShip shipping rates', {
      timestamp,
      destination: `${rateData.shippingAddress.city}, ${rateData.shippingAddress.country}`,
    });

    const response = await client.post('/rates', payload);

    if (!response.data || !response.data.rates) {
      return [];
    }

    const rates = response.data.rates.map((rate) => ({
      id: rate.id,
      courier: rate.courier?.name || rate.courier_id || 'Unknown',
      service: rate.service?.name || rate.service_id || 'Standard',
      price: rate.total_charge || rate.price || 0,
      currency: rate.currency || 'CAD',
      estimatedDeliveryDays: rate.estimated_delivery_days || null,
      minDeliveryDays: rate.min_delivery_days || null,
      maxDeliveryDays: rate.max_delivery_days || null,
    }));

    logger.info('EasyShip rates retrieved', {
      timestamp,
      ratesCount: rates.length,
    });

    return rates;
  } catch (error) {
    logger.error('Error getting EasyShip shipping rates', {
      timestamp,
      error: error.message,
      stack: error.stack,
      response: error.response?.data || null,
    });

    // Return empty array on error (fallback to static rates)
    return [];
  }
}

/**
 * Get shipment tracking information
 * @param {string} easyshipShipmentId - EasyShip shipment ID
 * @returns {Promise<Object>} Tracking information
 */
async function getShipmentTracking(easyshipShipmentId) {
  const timestamp = new Date().toISOString();
  try {
    if (!EASYSHIP_API_TOKEN) {
      throw new Error('EasyShip API token is not configured');
    }

    const client = getEasyShipClient();

    const response = await client.get(`/shipments/${easyshipShipmentId}`);

    if (!response.data || !response.data.shipment) {
      throw new Error('Invalid response from EasyShip API');
    }

    const shipment = response.data.shipment;

    return {
      trackingNumber: shipment.tracking_number,
      carrier: shipment.courier?.name || shipment.courier_id || null,
      status: shipment.state || 'UNKNOWN',
      labelUrl: shipment.label?.url || null,
      trackingEvents: shipment.tracking_events || [],
    };
  } catch (error) {
    logger.error('Error getting EasyShip shipment tracking', {
      timestamp,
      easyshipShipmentId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  createShipment,
  getShippingRates,
  getShipmentTracking,
};

