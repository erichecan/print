/**
 * Email Service
 * [2025-01-27 10:00:00] Email service for sending order confirmations, refunds, etc.
 */
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter based on environment variables
let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // Check if email is configured
  const emailProvider = process.env.EMAIL_PROVIDER || 'nodemailer';
  const emailFrom = process.env.EMAIL_FROM || 'noreply@suvernireplus.com';

  if (emailProvider === 'nodemailer') {
    // SMTP configuration
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    // Only create transporter if credentials are provided
    if (smtpConfig.auth.user && smtpConfig.auth.pass) {
      transporter = nodemailer.createTransport(smtpConfig);
    } else {
      logger.warn('Email service not configured: SMTP credentials missing');
      // Create a mock transporter for development
      transporter = {
        sendMail: async (options) => {
          logger.info('Email would be sent (mock):', {
            to: options.to,
            subject: options.subject,
          });
          return { messageId: 'mock-' + Date.now() };
        },
      };
    }
  } else {
    logger.warn(`Email provider ${emailProvider} not implemented, using mock`);
    transporter = {
      sendMail: async (options) => {
        logger.info('Email would be sent (mock):', {
          to: options.to,
          subject: options.subject,
        });
        return { messageId: 'mock-' + Date.now() };
      },
    };
  }

  return transporter;
}

/**
 * Generate order confirmation email HTML
 * [2025-01-27 10:00:00]
 */
function generateOrderConfirmationEmail(order) {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.variant?.product?.name || 'Product'} 
        ${item.variant?.color || item.variant?.size ? `(${item.variant.color || ''}${item.variant.color && item.variant.size ? ', ' : ''}${item.variant.size || ''})` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.priceSnapshot).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${order.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0;">Order Confirmation</h1>
    <p style="margin: 0;">Thank you for your order!</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Order Details</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Order Date:</strong> ${orderDate}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Items Ordered</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Order Summary</h2>
    <table style="width: 100%;">
      <tr>
        <td style="padding: 5px 0;">Subtotal:</td>
        <td style="text-align: right; padding: 5px 0;">$${Number(order.subtotal).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Shipping:</td>
        <td style="text-align: right; padding: 5px 0;">$${Number(order.shippingCost).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Tax:</td>
        <td style="text-align: right; padding: 5px 0;">$${Number(order.tax).toFixed(2)}</td>
      </tr>
      <tr style="font-weight: bold; font-size: 1.1em; border-top: 2px solid #ddd;">
        <td style="padding: 10px 0;">Total:</td>
        <td style="text-align: right; padding: 10px 0;">$${Number(order.total).toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Shipping Address</h2>
    <p style="margin: 0;">
      ${order.shippingAddress?.fullName || ''}<br>
      ${order.shippingAddress?.addressLine1 || ''}<br>
      ${order.shippingAddress?.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
      ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.province || ''} ${order.shippingAddress?.postalCode || ''}<br>
      ${order.shippingAddress?.country || ''}
    </p>
  </div>

  <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px;">
    <p style="margin: 0; color: #2e7d32;">
      <strong>What's next?</strong><br>
      We'll send you an email when your order ships. You can track your order status anytime using your order number.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
    <p>If you have any questions, please contact our support team.</p>
    <p style="margin: 0;">© ${new Date().getFullYear()} Suvernire Plus. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate refund confirmation email HTML
 * [2025-01-27 10:00:00]
 */
function generateRefundConfirmationEmail(order, refundAmount, reason) {
  const refundDate = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Confirmation - ${order.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
    <h1 style="color: #856404; margin-top: 0;">Refund Confirmation</h1>
    <p style="margin: 0; color: #856404;">Your refund has been processed.</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Refund Details</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Refund Date:</strong> ${refundDate}</p>
    <p><strong>Refund Amount:</strong> <span style="color: #d32f2f; font-size: 1.2em; font-weight: bold;">$${Number(refundAmount).toFixed(2)}</span></p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
  </div>

  <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px;">
    <p style="margin: 0; color: #2e7d32;">
      <strong>Processing Time:</strong><br>
      The refund will be credited back to your original payment method within 5-10 business days.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
    <p>If you have any questions about this refund, please contact our support team.</p>
    <p style="margin: 0;">© ${new Date().getFullYear()} Suvernire Plus. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Send order confirmation email
 * [2025-01-27 10:00:00]
 */
async function sendOrderConfirmation(order) {
  try {
    const transporter = getTransporter();
    const emailFrom = process.env.EMAIL_FROM || 'noreply@suvernireplus.com';
    const appName = process.env.APP_NAME || 'Suvernire Plus';

    // Fetch order with items if not already included
    let orderWithItems = order;
    if (!order.items || order.items.length === 0) {
      const prisma = require('../lib/prisma');
      orderWithItems = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    }

    const html = generateOrderConfirmationEmail(orderWithItems);

    const mailOptions = {
      from: `"${appName}" <${emailFrom}>`,
      to: order.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
      text: `Order Confirmation\n\nOrder Number: ${order.orderNumber}\nTotal: $${Number(order.total).toFixed(2)}\n\nThank you for your order!`,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Order confirmation email sent', {
      orderNumber: order.orderNumber,
      email: order.email,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send order confirmation email', {
      orderNumber: order.orderNumber,
      email: order.email,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Send refund confirmation email
 * [2025-01-27 10:00:00]
 */
async function sendRefundConfirmation(order, refundAmount, reason) {
  try {
    const transporter = getTransporter();
    const emailFrom = process.env.EMAIL_FROM || 'noreply@suvernireplus.com';
    const appName = process.env.APP_NAME || 'Suvernire Plus';

    const html = generateRefundConfirmationEmail(order, refundAmount, reason);

    const mailOptions = {
      from: `"${appName}" <${emailFrom}>`,
      to: order.email,
      subject: `Refund Confirmation - ${order.orderNumber}`,
      html,
      text: `Refund Confirmation\n\nOrder Number: ${order.orderNumber}\nRefund Amount: $${Number(refundAmount).toFixed(2)}\n\nYour refund has been processed.`,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Refund confirmation email sent', {
      orderNumber: order.orderNumber,
      email: order.email,
      refundAmount,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send refund confirmation email', {
      orderNumber: order.orderNumber,
      email: order.email,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  sendOrderConfirmation,
  sendRefundConfirmation,
  getTransporter,
};

