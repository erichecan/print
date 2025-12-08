# 线下订单数据初始化总结
[2025-12-07 17:58:00] 执行 seed 脚本初始化产品和颜色数据

## ✅ 执行结果

### 数据库迁移
- **状态**: ✅ 成功
- **操作**: 使用 `prisma db push` 创建数据库表
- **创建的表**:
  - `offline_order_products` - 产品表
  - `offline_order_colors` - 颜色表
  - `offline_order_size_fees` - 尺码费用表
  - `offline_order_product_color_sizes` - 可用性配置表

### 数据初始化

#### 产品数据 (offline_order_products)
- **总数**: 26 个产品
- **激活状态**: 26 个全部激活 ✅
- **产品列表**:
  1. Short Sleeve T-shirts
  2. Long Sleeve T-shirts
  3. Soft Tri-Blend T-shirts
  4. Performance Shirts
  5. Women's T-shirts
  6. Kids T-shirts
  7. Tie-Dye T-shirts
  8. Tank Tops & Sleeveless
  9. No Minimum T-shirts
  10. Made in the USA T-shirts
  11. Tall T-shirts
  12. Canada T-shirts
  13. NEW T-shirts
  14. All T-shirts
  15. Hoodies
  16. Crewneck Sweatshirts
  17. Full Zip Sweatshirts
  18. Quarter Zip Sweatshirts
  19. Heavyweight Sweatshirts
  20. Lightweight Sweatshirts
  21. Champion Sweatshirts
  22. Carhartt Sweatshirts
  23. Nike Sweatshirts
  24. Performance Sweatshirts
  25. 自带服装 (客户自带)
  26. 其他

#### 颜色数据 (offline_order_colors)
- **总数**: 14 个颜色
- **颜色列表**:
  1. Black (#000000)
  2. Bright Blue (#0066FF)
  3. White (#FFFFFF)
  4. Medium Grey (#808080)
  5. Bright Green (#00FF00)
  6. Bright Red (#FF0000)
  7. Light Pink (#FFB6C1)
  8. Dark Purple (#800080)
  9. Bright Yellow (#FFFF00)
  10. Bright Orange (#FFA500)
  11. Medium Brown (#A0522D)
  12. Grey Speckled Pattern (图案)
  13. Green Camouflage Pattern (图案)
  14. Rainbow Tie-Dye Pattern (图案)

#### 尺码费用配置 (offline_order_size_fees)
- **状态**: ✅ 有默认值
- **配置**:
  - 2XL: $2.50
  - 3XL: $3.50
  - 4XL: $4.50
  - 5XL: $5.50

## 📊 验证结果

### 本地数据库
- ✅ **产品下拉菜单**: 有数据 (26 个激活产品)
- ✅ **颜色下拉菜单**: 有数据 (14 个颜色)

### 生产环境
- ⚠️ **需要同步**: 生产环境数据库可能还没有这些数据
- **建议**: 在生产环境运行相同的 seed 脚本

## 🔄 下一步操作

### 1. 同步到生产环境

需要在生产环境执行相同的操作：

```bash
# 1. 运行数据库迁移（如果需要）
cd backend
export DATABASE_URL="生产环境数据库URL"
npx prisma db push --schema=../prisma/schema.prisma

# 2. 运行 seed 脚本
node scripts/seed-offline-defaults.js
```

### 2. 验证生产环境

访问生产环境 API 验证数据：
```bash
curl https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api/offline-orders/config
```

### 3. 测试下拉菜单

访问线下订单创建页面，验证：
- ✅ 产品下拉菜单有选项
- ✅ 颜色下拉菜单有选项
- ✅ 可以正常选择和使用

## 📝 相关文件

- **Seed 脚本**: `backend/scripts/seed-offline-defaults.js`
- **API 端点**: `backend/src/controllers/offlineOrderController.js` → `getOrderConfig()`
- **数据库 Schema**: `prisma/schema.prisma`

## ✅ 完成状态

- ✅ 数据库表已创建
- ✅ 产品数据已初始化 (26 个)
- ✅ 颜色数据已初始化 (14 个)
- ✅ 尺码费用配置已设置
- ⏳ 生产环境需要同步（如果使用不同的数据库）

