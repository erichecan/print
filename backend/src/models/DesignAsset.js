// [2025-11-02 20:58:00] DesignAsset model
module.exports = (sequelize, DataTypes) => {
  const DesignAsset = sequelize.define('DesignAsset', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    design_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'designs', key: 'id' },
      onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.ENUM('upload', 'text', 'clipart'),
      allowNull: false
    },
    asset_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    asset_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'design_assets',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['design_id'], name: 'idx_design_assets_design_id' }
    ]
  });

  return DesignAsset;
};

