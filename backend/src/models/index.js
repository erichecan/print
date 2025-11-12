// [2025-11-02 20:55:00] Sequelize models initialization
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import all models
const User = require('./User')(sequelize, DataTypes);
const Address = require('./Address')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const Brand = require('./Brand')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const ProductVariant = require('./ProductVariant')(sequelize, DataTypes);
const ProductImage = require('./ProductImage')(sequelize, DataTypes);
const ProductReview = require('./ProductReview')(sequelize, DataTypes);
const CartItem = require('./CartItem')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const OrderItem = require('./OrderItem')(sequelize, DataTypes);
const Design = require('./Design')(sequelize, DataTypes);
const DesignAsset = require('./DesignAsset')(sequelize, DataTypes);
const Coupon = require('./Coupon')(sequelize, DataTypes);
const Promotion = require('./Promotion')(sequelize, DataTypes);
const Upload = require('./Upload')(sequelize, DataTypes);
const Setting = require('./Setting')(sequelize, DataTypes);
const Session = require('./Session')(sequelize, DataTypes);
const OrderAddressSnapshot = require('./OrderAddressSnapshot')(sequelize, DataTypes);

// Define associations
const models = {
  User,
  Address,
  Category,
  Brand,
  Product,
  ProductVariant,
  ProductImage,
  ProductReview,
  CartItem,
  Order,
  OrderItem,
  Design,
  DesignAsset,
  Coupon,
  Promotion,
  Upload,
  Setting,
  Session,
  OrderAddressSnapshot
};

// User associations
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses', onDelete: 'CASCADE' });
User.hasMany(CartItem, { foreignKey: 'user_id', as: 'cartItems', onDelete: 'CASCADE' });
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
User.hasMany(Design, { foreignKey: 'user_id', as: 'designs', onDelete: 'SET NULL' });
User.hasMany(ProductReview, { foreignKey: 'user_id', as: 'reviews', onDelete: 'SET NULL' });
User.hasMany(Upload, { foreignKey: 'user_id', as: 'uploads', onDelete: 'SET NULL' });
User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions', onDelete: 'CASCADE' });

Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CartItem.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// [2025-11-10 15:45:30] Deduplicated Order -> User association to avoid alias conflicts
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Design.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ProductReview.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Upload.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Session.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category associations
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });

// Brand associations
Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });
Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });

// Product associations
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants', onDelete: 'CASCADE' });
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images', onDelete: 'CASCADE' });
Product.hasMany(ProductReview, { foreignKey: 'product_id', as: 'reviews', onDelete: 'CASCADE' });
Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems', onDelete: 'CASCADE' });
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
Product.hasMany(Design, { foreignKey: 'product_id', as: 'designs' });

ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductReview.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Design.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// ProductVariant associations
ProductVariant.hasMany(ProductImage, { foreignKey: 'variant_id', as: 'images' });
ProductVariant.hasMany(CartItem, { foreignKey: 'variant_id', as: 'cartItems' });
ProductVariant.hasMany(OrderItem, { foreignKey: 'variant_id', as: 'orderItems' });

ProductImage.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
CartItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

// Design associations
Design.hasMany(DesignAsset, { foreignKey: 'design_id', as: 'assets', onDelete: 'CASCADE' });
Design.hasMany(CartItem, { foreignKey: 'design_id', as: 'cartItems', onDelete: 'SET NULL' });
Design.hasMany(OrderItem, { foreignKey: 'design_id', as: 'orderItems' });

DesignAsset.belongsTo(Design, { foreignKey: 'design_id', as: 'design' });
CartItem.belongsTo(Design, { foreignKey: 'design_id', as: 'design' });
OrderItem.belongsTo(Design, { foreignKey: 'design_id', as: 'design' });

// Order associations
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
Order.hasMany(OrderAddressSnapshot, { foreignKey: 'order_id', as: 'addressSnapshots', onDelete: 'CASCADE' });
Order.belongsTo(Address, { foreignKey: 'shipping_address_id', as: 'shippingAddress' });
Order.belongsTo(Address, { foreignKey: 'billing_address_id', as: 'billingAddress' });

OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
OrderItem.belongsTo(Design, { foreignKey: 'design_id', as: 'design' });

OrderAddressSnapshot.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Review associations
ProductReview.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Order.hasMany(ProductReview, { foreignKey: 'order_id', as: 'reviews' });

module.exports = {
  sequelize,
  ...models
};

