// ProductColorImage model for Design Lab color-image mapping
module.exports = (sequelize, DataTypes) => {
  const ProductColorImage = sequelize.define('ProductColorImage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'product_id',
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    customInkProductId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'customink_product_id',
      comment: 'Custom Ink 产品 ID（如 6a62c76ef0978853a20391b6c32da4fe）'
    },
    customInkColorId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'customink_color_id',
      comment: 'Custom Ink 颜色 ID（如 176100）'
    },
    colorName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'color_name',
      comment: '颜色名称（如 White, Black）'
    },
    colorHex: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: 'color_hex',
      comment: '颜色 hex 值（可选）'
    },
    imageUrls: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'image_urls',
      comment: '图片 URL（front, back, sleeve）',
      defaultValue: {
        front: null,
        back: null,
        sleeve: null
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified',
      comment: '是否已验证（图片 URL 是否存在）'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '是否启用'
    }
  }, {
    tableName: 'product_color_images',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ProductColorImage.associate = function(models) {
    ProductColorImage.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return ProductColorImage;
};

