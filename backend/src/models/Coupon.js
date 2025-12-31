// Coupon model
module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define('Coupon', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    min_order_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    max_discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    user_usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'coupons',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['code'], name: 'idx_coupons_code' },
      { fields: ['is_active'], name: 'idx_coupons_is_active' }
    ]
  });

  return Coupon;
};

