// [2025-11-02 20:57:00] OrderAddressSnapshot model
module.exports = (sequelize, DataTypes) => {
  const OrderAddressSnapshot = sequelize.define('OrderAddressSnapshot', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.ENUM('shipping', 'billing'),
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    zip_code: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    tableName: 'order_address_snapshots',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['order_id'], name: 'idx_order_address_snapshots_order_id' }
    ]
  });

  return OrderAddressSnapshot;
};

