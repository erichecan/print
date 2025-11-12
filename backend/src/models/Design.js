// [2025-11-02 20:58:00] Design model
module.exports = (sequelize, DataTypes) => {
  const Design = sequelize.define('Design', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    design_data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'saved', 'approved', 'rejected', 'published'),
      defaultValue: 'saved'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'designs',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'], name: 'idx_designs_user_id' },
      { fields: ['product_id'], name: 'idx_designs_product_id' },
      { fields: ['status'], name: 'idx_designs_status' },
      { fields: ['created_at'], name: 'idx_designs_created_at' }
    ]
  });

  return Design;
};

