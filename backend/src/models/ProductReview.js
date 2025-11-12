// [2025-11-02 20:56:00] ProductReview model
module.exports = (sequelize, DataTypes) => {
  const ProductReview = sequelize.define('ProductReview', {
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'orders', key: 'id' },
      onDelete: 'SET NULL'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_verified_purchase: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    helpful_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'product_reviews',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['product_id'], name: 'idx_product_reviews_product_id' },
      { fields: ['user_id'], name: 'idx_product_reviews_user_id' },
      { fields: ['created_at'], name: 'idx_product_reviews_created_at' }
    ]
  });

  return ProductReview;
};

