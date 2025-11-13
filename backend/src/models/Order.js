// [2025-11-02 20:57:00] Order model
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    shipping_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    shipping_address_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'addresses', key: 'id' }
    },
    billing_address_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'addresses', key: 'id' }
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    payment_transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tracking_number: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    carrier: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    estimated_delivery: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'orders',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['order_number'], name: 'idx_orders_order_number' },
      { fields: ['user_id'], name: 'idx_orders_user_id' },
      { fields: ['status'], name: 'idx_orders_status' },
      { fields: ['created_at'], name: 'idx_orders_created_at' }
    ]
  });

  return Order;
};

