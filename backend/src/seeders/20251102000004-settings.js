// [2025-11-02 21:00:00] Seed system settings
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    const stageConfig = {
      stages: [
        { key: 'intake', label: 'Intake', description: 'New offline POD requests' },
        { key: 'collect-materials', label: 'Collect Materials', description: 'Awaiting brand assets and specs' },
        { key: 'design', label: 'Design', description: 'Design team working on mockups' },
        { key: 'production', label: 'Production', description: 'Manufacturing and finishing' },
        { key: 'logistics', label: 'Logistics', description: 'Preparing shipment and delivery' },
        { key: 'completed', label: 'Completed', description: 'Order fulfilled and delivered' }
      ]
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

