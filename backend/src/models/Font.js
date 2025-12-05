// [2025-01-30 19:00:00] Font model for Design Lab font management
module.exports = (sequelize, DataTypes) => {
  const Font = sequelize.define('Font', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: '字体名称（必须唯一）'
    },
    display_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '显示名称（可选，如果与 name 不同）'
    },
    preview_text: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Aa',
      comment: '预览文本'
    },
    category: {
      type: DataTypes.ENUM('latin', 'chinese', 'japanese', 'hindi', 'arabic', 'korean', 'thai'),
      allowNull: false,
      defaultValue: 'latin',
      comment: '字体分类'
    },
    source: {
      type: DataTypes.ENUM('system', 'google', 'custom'),
      allowNull: false,
      defaultValue: 'system',
      comment: '字体来源'
    },
    google_font_family: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Google Fonts 家族名称（如果 source 是 google）'
    },
    weights: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '字体粗细数组（如 ["400", "500", "700"]）'
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
    tableName: 'fonts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['name'], unique: true, name: 'idx_fonts_name' },
      { fields: ['category'], name: 'idx_fonts_category' },
      { fields: ['is_active'], name: 'idx_fonts_is_active' },
      { fields: ['sort_order'], name: 'idx_fonts_sort_order' },
      { fields: ['source'], name: 'idx_fonts_source' },
      { fields: ['created_at'], name: 'idx_fonts_created_at' }
    ]
  });

  return Font;
};

