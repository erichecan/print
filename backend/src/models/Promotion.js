// [2025-11-02 20:58:00] Promotion model
module.exports = (sequelize, DataTypes) => {
  const Promotion = sequelize.define('Promotion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    banner_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    link_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'promotions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['is_active'], name: 'idx_promotions_is_active' },
      { fields: ['sort_order'], name: 'idx_promotions_sort_order' }
    ]
  });

  return Promotion;
};

