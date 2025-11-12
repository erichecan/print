// [2025-11-02 20:57:00] OrderItem model
module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' }
    },
    variant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' }
    },
    design_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'designs', key: 'id' }
    },
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    variant_description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    product_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'order_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['order_id'], name: 'idx_order_items_order_id' },
      { fields: ['product_id'], name: 'idx_order_items_product_id' }
    ]
  });

  return OrderItem;
};

