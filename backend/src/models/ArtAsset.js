// ArtAsset model for Design Lab CMS
module.exports = (sequelize, DataTypes) => {
  const ArtAsset = sequelize.define('ArtAsset', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '素材分类，如 Emojis, Shapes, Animals 等'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '素材名称'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '素材图片 URL'
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '缩略图 URL（可选）'
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '文件大小（字节）'
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '图片宽度（像素）'
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '图片高度（像素）'
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'MIME 类型，如 image/png, image/jpeg'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序顺序'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      comment: '创建者用户 ID'
    }
  }, {
    tableName: 'art_assets',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['category'], name: 'idx_art_assets_category' },
      { fields: ['is_active'], name: 'idx_art_assets_is_active' },
      { fields: ['sort_order'], name: 'idx_art_assets_sort_order' },
      { fields: ['created_at'], name: 'idx_art_assets_created_at' }
    ]
  });

  return ArtAsset;
};

