// [2025-11-02 20:56:00] ProductVariant model
module.exports = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define('ProductVariant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    color: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    color_hex: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    size: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    price_adjustment: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'product_variants',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['product_id'], name: 'idx_product_variants_product_id' },
      { fields: ['sku'], name: 'idx_product_variants_sku' }
    ]
  });

  return ProductVariant;
};

