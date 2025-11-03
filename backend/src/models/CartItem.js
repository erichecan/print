// [2025-11-02 20:57:00] CartItem model
module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define('CartItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    variant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'SET NULL'
    },
    design_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'designs', key: 'id' },
      onDelete: 'SET NULL'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      }
    }
  }, {
    tableName: 'cart_items',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'], name: 'idx_cart_items_user_id' },
      { fields: ['session_id'], name: 'idx_cart_items_session_id' },
      { fields: ['product_id'], name: 'idx_cart_items_product_id' },
      {
        unique: true,
        fields: ['user_id', 'product_id', 'variant_id', 'design_id'],
        name: 'unique_user_cart_item'
      },
      {
        unique: true,
        fields: ['session_id', 'product_id', 'variant_id', 'design_id'],
        name: 'unique_session_cart_item'
      }
    ]
  });

  return CartItem;
};

