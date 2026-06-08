const { onOrderPaid } = require('./referralService');
const { onInfluencerCodeUsed, validateInfluencerCode } = require('./influencerService');

const referralPlugin = { onOrderPaid, onInfluencerCodeUsed, validateInfluencerCode };

module.exports = referralPlugin;
