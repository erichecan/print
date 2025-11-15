/**
 * Contact Form Routes
 * [2025-01-27 19:10:00] 联系表单提交路由
 */
const express = require('express');
const router = express.Router();
const { sendContactFormNotification } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * POST /api/contact
 * Submit contact form
 * [2025-01-27 19:10:00] 处理联系表单提交
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, orderNumber } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          name: !name ? 'Name is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          message: !message ? 'Message is required' : undefined,
        },
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email address',
      });
    }

    // Send notification email to support team
    try {
      await sendContactFormNotification({
        name,
        email,
        phone,
        subject: subject || 'General Inquiry',
        message,
        orderNumber,
      });

      logger.info('Contact form submitted', {
        email,
        subject: subject || 'General Inquiry',
        hasOrderNumber: !!orderNumber,
      });

      res.status(200).json({
        success: true,
        message: 'Thank you for contacting us. We will get back to you within 24 hours.',
      });
    } catch (emailError) {
      // Log error but don't fail the request
      logger.error('Failed to send contact form notification', {
        email,
        error: emailError.message,
      });

      res.status(200).json({
        success: true,
        message: 'Your message has been received. We will respond as soon as possible.',
        warning: 'Email notification failed, but your message was logged.',
      });
    }
  } catch (error) {
    logger.error('Error processing contact form', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to submit contact form',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;

