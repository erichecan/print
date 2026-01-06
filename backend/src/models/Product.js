// Product model
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'categories', key: 'id' }
    },
    brand_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'brands', key: 'id' },
      onDelete: 'SET NULL'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    long_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    base_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    printable_area: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Added cost management numeric fields
    unit_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    sale_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    gross_profit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    is_customizable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    dimensions: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'products',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['slug'], name: 'idx_products_slug' },
      { fields: ['category_id'], name: 'idx_products_category_id' },
      { fields: ['brand_id'], name: 'idx_products_brand_id' },
      { fields: ['is_active'], name: 'idx_products_is_active' }
    ]
  });

  return Product;
};

