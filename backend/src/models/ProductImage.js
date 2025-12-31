// ProductImage model
module.exports = (sequelize, DataTypes) => {
  const ProductImage = sequelize.define('ProductImage', {
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
    variant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'SET NULL'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    alt_text: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'product_images',
    underscored: true,
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['product_id'], name: 'idx_product_images_product_id' },
      { fields: ['variant_id'], name: 'idx_product_images_variant_id' }
    ]
  });

  return ProductImage;
};

