const { onOrderPaid } = require('./referralService');

// Plugin entry point — wire this into checkoutController after order payment confirmed.
// Only 2 touch points with main system:
//   1. checkoutController calls referralPlugin.onOrderPaid(orderId, referralCode, userId)
//   2. GET /api/referral/me endpoint registered in app.js
const referralPlugin = { onOrderPaid };

module.exports = referralPlugin;
