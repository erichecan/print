// [2025-11-02 21:00:00] Seed system settings
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // [2025-01-28 05:40:00] 清空默认阶段配置，由管理员通过设置页面配置
    const stageConfig = {
      stages: []
    };

    const settings = [
      {
        id: uuidv4(),
        key: 'site_name',
        value: JSON.stringify('suvernire plus'),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'site_description',
        value: JSON.stringify('Custom merchandise e-commerce platform'),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'contact_email',
        value: JSON.stringify('support@suvernireplus.com'),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'contact_phone',
        value: JSON.stringify('800-293-4232'),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'shipping_base_cost',
        value: JSON.stringify(5.99),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'free_shipping_threshold',
        value: JSON.stringify(75.00),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'tax_rate',
        value: JSON.stringify(0.08),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'payment_methods',
        value: JSON.stringify(['stripe', 'paypal']),
        updated_at: now
      },
      {
        id: uuidv4(),
        key: 'offline_workflow_stages',
        value: JSON.stringify(stageConfig),
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('settings', settings, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('settings', null, {});
  }
};

