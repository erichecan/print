// [2025-01-27 19:35:00] Coupon Usage model
module.exports = (sequelize, DataTypes) => {
  const CouponUsage = sequelize.define('CouponUsage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    coupon_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'coupons',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    tableName: 'coupon_usage',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['coupon_id'], name: 'idx_coupon_usage_coupon_id' },
      { fields: ['user_id'], name: 'idx_coupon_usage_user_id' },
      { fields: ['order_id'], name: 'idx_coupon_usage_order_id' }
    ]
  });

  return CouponUsage;
};

