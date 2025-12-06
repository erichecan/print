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
/**
 * Generate order confirmation email HTML
 * [2025-01-27 10:00:00] Original implementation
 * [2025-12-06 10:45:00] Enhanced with better address handling, discount display, and support information
 */
/**
 * Generate order confirmation email HTML
 * [2025-01-27 10:00:00] Original implementation
 * [2025-12-06 10:45:00] Enhanced with better address handling, discount display, and support information
 */
function generateOrderConfirmationEmail(order) {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // [2025-12-06 10:45:00] Generate items HTML with better error handling
  const itemsHtml = order.items && order.items.length > 0
    ? order.items
        .map(
          (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.variant?.product?.name || 'Product'} 
        ${item.variant?.color || item.variant?.size ? `(${item.variant.color || ''}${item.variant.color && item.variant.size ? ', ' : ''}${item.variant.size || ''})` : ''}
        ${item.variant?.sku ? `<br><small style="color: #666;">SKU: ${item.variant.sku}</small>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.priceSnapshot).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}</td>
    </tr>
  `
        )
        .join('')
    : '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #666;">No items found</td></tr>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${order.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
    <h1 style="color: #166534; margin-top: 0;">✅ Order Confirmation</h1>
    <p style="margin: 0; color: #166534; font-size: 1.1em;">Thank you for your order! We've received your payment and your order is being processed.</p>
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
      ${Number(order.discount) > 0 ? `
      <tr>
        <td style="padding: 5px 0; color: #16a34a;">Discount:</td>
        <td style="text-align: right; padding: 5px 0; color: #16a34a;">-$${Number(order.discount).toFixed(2)}</td>
      </tr>
      ` : ''}
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
        <td style="text-align: right; padding: 10px 0;">$${Number(order.total).toFixed(2)} ${order.currency || 'CAD'}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Shipping Address</h2>
    <p style="margin: 0;">
      ${order.shippingAddress?.fullName || (order.shippingAddress?.firstName && order.shippingAddress?.lastName ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}` : '')}<br>
      ${order.shippingAddress?.addressLine1 || order.shippingAddress?.address1 || ''}<br>
      ${order.shippingAddress?.addressLine2 || order.shippingAddress?.address2 ? (order.shippingAddress.addressLine2 || order.shippingAddress.address2) + '<br>' : ''}
      ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.province || order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || order.shippingAddress?.zipCode || ''}<br>
      ${order.shippingAddress?.country || 'Canada'}
    </p>
  </div>

  ${order.billingAddress && (order.billingAddress.addressLine1 || order.billingAddress.address1) && (order.billingAddress.addressLine1 !== order.shippingAddress?.addressLine1 && order.billingAddress.address1 !== order.shippingAddress?.address1) ? `
  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Billing Address</h2>
    <p style="margin: 0;">
      ${order.billingAddress?.fullName || (order.billingAddress?.firstName && order.billingAddress?.lastName ? `${order.billingAddress.firstName} ${order.billingAddress.lastName}` : '')}<br>
      ${order.billingAddress?.addressLine1 || order.billingAddress?.address1 || ''}<br>
      ${order.billingAddress?.addressLine2 || order.billingAddress?.address2 ? (order.billingAddress.addressLine2 || order.billingAddress.address2) + '<br>' : ''}
      ${order.billingAddress?.city || ''}, ${order.billingAddress?.province || order.billingAddress?.state || ''} ${order.billingAddress?.postalCode || order.billingAddress?.zipCode || ''}<br>
      ${order.billingAddress?.country || 'Canada'}
    </p>
  </div>
  ` : ''}

  <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px;">
    <p style="margin: 0; color: #2e7d32;">
      <strong>What's next?</strong><br>
      We'll send you an email when your order ships. You can track your order status anytime using your order number.
    </p>
  </div>

  <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin-top: 20px;">
    <p style="margin: 0; font-size: 0.9em; color: #64748b;">
      <strong>Need help?</strong> If you have any questions about your order, please contact our support team at 
      <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@print.dev'}" style="color: #2563eb; text-decoration: none;">
        ${process.env.SUPPORT_EMAIL || 'support@print.dev'}
      </a>
      <br>
      Please include your order number: <strong>${order.orderNumber}</strong>
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'Suvernire Plus'}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate shipping notification email HTML
 * [2025-01-27 19:00:00] 添加发货通知邮件模板
 */
function generateShippingNotificationEmail(order, trackingNumber, carrier) {
  const shipDate = new Date().toLocaleDateString('en-CA', {
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
  <title>Your Order Has Shipped - ${order.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
    <h1 style="color: #1565c0; margin-top: 0;">🎉 Your Order Has Shipped!</h1>
    <p style="margin: 0; color: #1565c0;">We're excited to let you know your order is on its way.</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Shipping Information</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Shipped Date:</strong> ${shipDate}</p>
    <p><strong>Tracking Number:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px; font-family: monospace;">${trackingNumber}</code></p>
    ${carrier ? `<p><strong>Carrier:</strong> ${carrier}</p>` : ''}
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Track Your Package</h2>
    <p>You can track your order using the tracking number above. Most carriers provide real-time tracking updates.</p>
    ${trackingNumber ? `<p style="text-align: center; margin-top: 20px;">
      <a href="https://suvernireplus.com/order-tracking?order=${order.orderNumber}" 
         style="background-color: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Track Your Order
      </a>
    </p>` : ''}
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
      <strong>Expected Delivery:</strong><br>
      Your package should arrive within 5-10 business days. You'll receive another email when it's delivered.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
    <p>If you have any questions about your shipment, please contact our support team.</p>
    <p style="margin: 0;">© ${new Date().getFullYear()} Suvernire Plus. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate contact form submission email HTML
 * [2025-01-27 19:05:00] 联系表单提交邮件模板
 */
function generateContactFormEmail(formData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0;">New Contact Form Submission</h1>
    <p style="margin: 0;">A customer has submitted a contact form.</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Contact Information</h2>
    <p><strong>Name:</strong> ${formData.name || 'N/A'}</p>
    <p><strong>Email:</strong> <a href="mailto:${formData.email}">${formData.email}</a></p>
    ${formData.phone ? `<p><strong>Phone:</strong> <a href="tel:${formData.phone}">${formData.phone}</a></p>` : ''}
    ${formData.subject ? `<p><strong>Subject:</strong> ${formData.subject}</p>` : ''}
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Message</h2>
    <p style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${formData.message || 'No message provided.'}</p>
  </div>

  ${formData.orderNumber ? `
  <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
    <p style="margin: 0; color: #856404;">
      <strong>Related Order:</strong> ${formData.orderNumber}
    </p>
  </div>
  ` : ''}

  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
    <p>Submitted at: ${new Date().toLocaleString('en-CA')}</p>
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

    // [2025-12-06 10:45:00] Generate plain text version for better email client compatibility
    const orderDateText = new Date(order.createdAt).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const itemsText = orderWithItems.items && orderWithItems.items.length > 0
      ? orderWithItems.items.map(item => 
          `- ${item.variant?.product?.name || 'Product'}${item.variant?.color || item.variant?.size ? ` (${item.variant.color || ''}${item.variant.color && item.variant.size ? ', ' : ''}${item.variant.size || ''})` : ''} x${item.quantity} - $${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}`
        ).join('\n')
      : 'No items found';
    
    const shippingAddressText = orderWithItems.shippingAddress
      ? `${orderWithItems.shippingAddress.fullName || (orderWithItems.shippingAddress.firstName && orderWithItems.shippingAddress.lastName ? `${orderWithItems.shippingAddress.firstName} ${orderWithItems.shippingAddress.lastName}` : '')}\n${orderWithItems.shippingAddress.addressLine1 || orderWithItems.shippingAddress.address1 || ''}\n${orderWithItems.shippingAddress.addressLine2 || orderWithItems.shippingAddress.address2 || ''}\n${orderWithItems.shippingAddress.city || ''}, ${orderWithItems.shippingAddress.province || orderWithItems.shippingAddress.state || ''} ${orderWithItems.shippingAddress.postalCode || orderWithItems.shippingAddress.zipCode || ''}\n${orderWithItems.shippingAddress.country || 'Canada'}`
      : 'Not provided';
    
    const textVersion = `Order Confirmation\n\nOrder Number: ${order.orderNumber}\nOrder Date: ${orderDateText}\nStatus: ${order.status}\nPayment Status: ${order.paymentStatus}\n\nItems Ordered:\n${itemsText}\n\nOrder Summary:\nSubtotal: $${Number(order.subtotal).toFixed(2)}\n${Number(order.discount) > 0 ? `Discount: -$${Number(order.discount).toFixed(2)}\n` : ''}Shipping: $${Number(order.shippingCost).toFixed(2)}\nTax: $${Number(order.tax).toFixed(2)}\nTotal: $${Number(order.total).toFixed(2)} ${order.currency || 'CAD'}\n\nShipping Address:\n${shippingAddressText}\n\nThank you for your order! We'll send you an email when your order ships.\n\nIf you have any questions, please contact our support team at ${process.env.SUPPORT_EMAIL || 'support@print.dev'}\nPlease include your order number: ${order.orderNumber}`;

    const mailOptions = {
      from: `"${appName}" <${emailFrom}>`,
      to: order.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
      text: textVersion,
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
 * Generate order cancellation email HTML
 * [2025-12-06 11:00:00] 订单取消确认邮件模板
 */
function generateOrderCancellationEmail(order, reason, cancelledBy = 'customer') {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsHtml = order.items && order.items.length > 0
    ? order.items
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
        .join('')
    : '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #666;">No items found</td></tr>';

  const refundInfo = order.paymentStatus === 'COMPLETED' 
    ? `
    <div style="background-color: #fff7ed; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #ea580c;">
      <p style="margin: 0; color: #9a3412;">
        <strong>Refund Information:</strong><br>
        ${order.paymentStatus === 'REFUNDED' 
          ? `Your refund of $${Number(order.total).toFixed(2)} has been processed and will appear in your account within 5-10 business days.`
          : `A refund of $${Number(order.total).toFixed(2)} will be processed to your original payment method. This may take 5-10 business days to appear in your account.`
        }
      </p>
    </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancelled - ${order.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef2f2; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
    <h1 style="color: #991b1b; margin-top: 0;">❌ Order Cancelled</h1>
    <p style="margin: 0; color: #991b1b; font-size: 1.1em;">Your order has been cancelled${cancelledBy === 'admin' ? ' by our team' : ''}.</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Order Details</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Order Date:</strong> ${orderDate}</p>
    <p><strong>Status:</strong> <strong style="color: #dc2626;">CANCELLED</strong></p>
    <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
    ${reason ? `<p><strong>Cancellation Reason:</strong> ${reason}</p>` : ''}
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Items Cancelled</h2>
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
      ${Number(order.discount) > 0 ? `
      <tr>
        <td style="padding: 5px 0;">Discount:</td>
        <td style="text-align: right; padding: 5px 0;">-$${Number(order.discount).toFixed(2)}</td>
      </tr>
      ` : ''}
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
        <td style="text-align: right; padding: 10px 0;">$${Number(order.total).toFixed(2)} ${order.currency || 'CAD'}</td>
      </tr>
    </table>
  </div>

  ${refundInfo}

  <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin-top: 20px;">
    <p style="margin: 0; font-size: 0.9em; color: #64748b;">
      <strong>What happens next?</strong><br>
      ${order.paymentStatus === 'COMPLETED' 
        ? 'If you paid for this order, a refund will be processed to your original payment method. This typically takes 5-10 business days.'
        : 'No payment was processed for this order.'
      }
      <br><br>
      <strong>Need help?</strong> If you have any questions about this cancellation, please contact our support team at 
      <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@print.dev'}" style="color: #2563eb; text-decoration: none;">
        ${process.env.SUPPORT_EMAIL || 'support@print.dev'}
      </a>
      <br>
      Please include your order number: <strong>${order.orderNumber}</strong>
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'Suvernire Plus'}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Send order cancellation confirmation email
 * [2025-12-06 11:00:00] 发送订单取消确认邮件
 */
async function sendOrderCancellationConfirmation(order, reason, cancelledBy = 'customer') {
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

    const html = generateOrderCancellationEmail(orderWithItems, reason, cancelledBy);

    // Generate plain text version
    const orderDateText = new Date(order.createdAt).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const itemsText = orderWithItems.items && orderWithItems.items.length > 0
      ? orderWithItems.items.map(item => 
          `- ${item.variant?.product?.name || 'Product'}${item.variant?.color || item.variant?.size ? ` (${item.variant.color || ''}${item.variant.color && item.variant.size ? ', ' : ''}${item.variant.size || ''})` : ''} x${item.quantity} - $${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}`
        ).join('\n')
      : 'No items found';
    
    const refundText = order.paymentStatus === 'COMPLETED' 
      ? `\n\nRefund Information:\n${order.paymentStatus === 'REFUNDED' 
          ? `Your refund of $${Number(order.total).toFixed(2)} has been processed and will appear in your account within 5-10 business days.`
          : `A refund of $${Number(order.total).toFixed(2)} will be processed to your original payment method. This may take 5-10 business days to appear in your account.`
        }`
      : '';

    const textVersion = `Order Cancelled\n\nOrder Number: ${order.orderNumber}\nOrder Date: ${orderDateText}\nStatus: CANCELLED\nPayment Status: ${order.paymentStatus}\n${reason ? `Cancellation Reason: ${reason}\n` : ''}\nItems Cancelled:\n${itemsText}\n\nOrder Summary:\nSubtotal: $${Number(order.subtotal).toFixed(2)}\n${Number(order.discount) > 0 ? `Discount: -$${Number(order.discount).toFixed(2)}\n` : ''}Shipping: $${Number(order.shippingCost).toFixed(2)}\nTax: $${Number(order.tax).toFixed(2)}\nTotal: $${Number(order.total).toFixed(2)} ${order.currency || 'CAD'}${refundText}\n\nIf you have any questions about this cancellation, please contact our support team at ${process.env.SUPPORT_EMAIL || 'support@print.dev'}\nPlease include your order number: ${order.orderNumber}`;

    const mailOptions = {
      from: `"${appName}" <${emailFrom}>`,
      to: order.email,
      subject: `Order Cancelled - ${order.orderNumber}`,
      html,
      text: textVersion,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Order cancellation confirmation email sent', {
      orderNumber: order.orderNumber,
      email: order.email,
      cancelledBy,
      reason: reason || null,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send order cancellation confirmation email', {
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

/**
 * Send shipping notification email
 * [2025-01-27 19:00:00] 发送发货通知邮件
 */
async function sendShippingNotification(order, trackingNumber, carrier) {
  try {
    const transporter = getTransporter();
    const emailFrom = process.env.EMAIL_FROM || 'noreply@suvernireplus.com';
    const appName = process.env.APP_NAME || 'Suvernire Plus';

    const html = generateShippingNotificationEmail(order, trackingNumber, carrier);

    const mailOptions = {
      from: `"${appName}" <${emailFrom}>`,
      to: order.email,
      subject: `Your Order Has Shipped - ${order.orderNumber}`,
      html,
      text: `Your Order Has Shipped\n\nOrder Number: ${order.orderNumber}\nTracking Number: ${trackingNumber}\n\nYour package is on its way!`,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Shipping notification email sent', {
      orderNumber: order.orderNumber,
      email: order.email,
      trackingNumber,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send shipping notification email', {
      orderNumber: order.orderNumber,
      email: order.email,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get order status description
 * [2025-12-06 10:30:00] 获取订单状态说明
 */
function getStatusDescription(status) {
  const descriptions = {
    'PENDING': 'Your order is pending and awaiting payment confirmation.',
    'PROCESSING': 'Your order is being processed and prepared for shipment.',
    'SHIPPED': 'Your order has been shipped and is on its way to you!',
    'DELIVERED': 'Your order has been delivered. We hope you enjoy your purchase!',
    'CANCELLED': 'Your order has been cancelled.',
    'REFUNDED': 'Your order has been refunded.',
  };
  return descriptions[status] || 'Your order status has been updated.';
}

/**
 * Generate order status update notification email HTML
 * [2025-12-06 10:30:00] 生成订单状态更新通知邮件模板
 */
function generateOrderStatusUpdateEmail(order, fromStatus, toStatus, actorName = null) {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 状态图标和颜色
  const getStatusStyle = (status) => {
    const styles = {
      'PROCESSING': { color: '#0284c7', bg: '#e0f2fe', icon: '⚙️' },
      'SHIPPED': { color: '#2563eb', bg: '#dbeafe', icon: '📦' },
      'DELIVERED': { color: '#16a34a', bg: '#dcfce7', icon: '✅' },
      'CANCELLED': { color: '#dc2626', bg: '#fef2f2', icon: '❌' },
      'REFUNDED': { color: '#ea580c', bg: '#fff7ed', icon: '↩️' },
    };
    return styles[status] || { color: '#475569', bg: '#f1f5f9', icon: '📋' };
  };

  const statusStyle = getStatusStyle(toStatus);
  const statusDescription = getStatusDescription(toStatus);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Status Update - ${order.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: ${statusStyle.bg}; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid ${statusStyle.color};">
    <h1 style="color: ${statusStyle.color}; margin-top: 0;">
      ${statusStyle.icon} Order Status Updated
    </h1>
    <p style="margin: 0; color: ${statusStyle.color}; font-size: 1.1em;">
      <strong>Status: ${toStatus}</strong>
    </p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Order Information</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Order Date:</strong> ${orderDate}</p>
    <p><strong>Previous Status:</strong> ${fromStatus || 'N/A'}</p>
    <p><strong>Current Status:</strong> <strong style="color: ${statusStyle.color};">${toStatus}</strong></p>
    ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px; font-family: monospace;">${order.trackingNumber}</code></p>` : ''}
    ${order.carrier ? `<p><strong>Carrier:</strong> ${order.carrier}</p>` : ''}
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">What This Means</h2>
    <p style="margin: 0; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid ${statusStyle.color};">
      ${statusDescription}
    </p>
  </div>

  ${toStatus === 'SHIPPED' && order.trackingNumber ? `
  <div style="background-color: #e0f2fe; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #0284c7;">
    <h2 style="color: #0c4a6e; margin-top: 0;">Track Your Package</h2>
    <p style="color: #0c4a6e;">You can track your order using the tracking number above.</p>
    <p style="text-align: center; margin-top: 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://printm.netlify.app'}/order-tracking?order=${order.orderNumber}" 
         style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600;">
        Track Your Order
      </a>
    </p>
  </div>
  ` : ''}

  ${toStatus === 'DELIVERED' ? `
  <div style="background-color: #dcfce7; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
    <h2 style="color: #166534; margin-top: 0;">🎉 Your Order Has Arrived!</h2>
    <p style="color: #166534;">We hope you're happy with your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
  </div>
  ` : ''}

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
      ${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}<br>
      ${order.shippingAddress?.address1 || ''}<br>
      ${order.shippingAddress?.address2 ? order.shippingAddress.address2 + '<br>' : ''}
      ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.province || ''} ${order.shippingAddress?.postalCode || ''}<br>
      ${order.shippingAddress?.country || ''}
    </p>
  </div>

  <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin-top: 20px;">
    <p style="margin: 0; font-size: 0.9em; color: #64748b;">
      <strong>Need help?</strong> If you have any questions about your order, please contact our support team at 
      <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@print.dev'}" style="color: #2563eb; text-decoration: none;">
        ${process.env.SUPPORT_EMAIL || 'support@print.dev'}
      </a>
      <br>
      Please include your order number: <strong>${order.orderNumber}</strong>
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'Print'}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Send order status update notification email
 * [2025-12-06 10:30:00] 发送订单状态更新通知邮件
 */
async function sendOrderStatusUpdateNotification(order, fromStatus, toStatus, actorName = null) {
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

    const html = generateOrderStatusUpdateEmail(orderWithItems, fromStatus, toStatus, actorName);

    // 根据状态生成主题
    const getSubject = (status) => {
      const subjects = {
        'PROCESSING': `Your Order is Being Processed - ${order.orderNumber}`,
        'SHIPPED': `Your Order Has Shipped - ${order.orderNumber}`,
        'DELIVERED': `Your Order Has Been Delivered - ${order.orderNumber}`,
        'CANCELLED': `Order Cancelled - ${order.orderNumber}`,
        'REFUNDED': `Order Refunded - ${order.orderNumber}`,
      };
      return subjects[status] || `Order Status Updated - ${order.orderNumber}`;
    };

    const mailOptions = {
      from: `"${appName}" <${emailFrom}>`,
      to: order.email,
      subject: getSubject(toStatus),
      html,
      text: `Order Status Update\n\nOrder Number: ${order.orderNumber}\nStatus: ${toStatus}\n\n${getStatusDescription(toStatus)}\n\nThank you for your order!`,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Order status update notification email sent', {
      orderNumber: order.orderNumber,
      email: order.email,
      fromStatus,
      toStatus,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send order status update notification email', {
      orderNumber: order.orderNumber,
      email: order.email,
      fromStatus,
      toStatus,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Send contact form submission notification
 * [2025-01-27 19:05:00] 发送联系表单提交通知
 */
async function sendContactFormNotification(formData) {
  try {
    const transporter = getTransporter();
    const emailFrom = process.env.EMAIL_FROM || 'noreply@suvernireplus.com';
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@suvernireplus.com';
    const appName = process.env.APP_NAME || 'Suvernire Plus';

    const html = generateContactFormEmail(formData);

    const mailOptions = {
      from: `"${appName}" <${emailFrom}>`,
      to: supportEmail,
      replyTo: formData.email,
      subject: `New Contact Form: ${formData.subject || 'General Inquiry'}`,
      html,
      text: `New Contact Form Submission\n\nFrom: ${formData.name} <${formData.email}>\nSubject: ${formData.subject || 'General Inquiry'}\n\nMessage:\n${formData.message || 'No message provided.'}`,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Contact form notification email sent', {
      from: formData.email,
      subject: formData.subject,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send contact form notification email', {
      email: formData.email,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  sendOrderConfirmation,
  sendOrderCancellationConfirmation,
  sendRefundConfirmation,
  sendShippingNotification,
  sendContactFormNotification,
  sendOrderStatusUpdateNotification,
  getTransporter,
};

