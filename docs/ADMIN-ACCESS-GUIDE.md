# Admin 后台访问指南

## 📍 访问地址

### 当前访问地址（部署后）
- **前端服务**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app`
- **Admin 后台**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin`
- **Admin 登录**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin/login`

### 配置二级域名后
- **前端服务**: `https://app.souvenirplusinc.com`
- **Admin 后台**: `https://app.souvenirplusinc.com/admin`
- **Admin 登录**: `https://app.souvenirplusinc.com/admin/login`

---

## 🔐 登录凭据

根据 seed 数据，默认管理员账号：

- **Email**: `admin@suvernireplus.com`
- **Password**: `admin123`

---

## ⚠️ 重要说明

### 不要直接访问后端 URL

**错误做法** ❌:
```
https://print-main-backend-234065158862.us-central1.run.app/api
```

这会返回 404 错误，因为：
- 后端 API 不是用来直接访问的网页
- `/api` 是 API 路由前缀，不是完整路径
- 后端需要通过具体的 API 端点访问，如 `/api/products`、`/api/categories` 等

### 正确的访问方式 ✅

**Admin 后台是前端应用的一部分**，应该通过前端 URL 访问：

```
https://[前端URL]/admin
```

---

## 🎯 Admin 后台功能模块

访问 `/admin` 后，你可以访问以下管理功能：

### 核心管理功能

1. **仪表盘** (`/admin`)
   - 今日收入统计
   - 新订单数量
   - 待审核设计数量
   - 库存不足商品

2. **商品管理** (`/admin/products`)
   - 商品列表查看
   - 添加新商品
   - 编辑商品信息
   - 商品图片管理

3. **分类管理** (`/admin/categories`)
   - 分类列表
   - 创建新分类
   - 编辑分类
   - 分类层级管理

4. **订单管理** (`/admin/orders`)
   - 订单列表
   - 订单详情
   - 订单状态更新
   - 订单搜索

5. **离线订单管理** (`/admin/offline-orders`)
   - 看板式订单管理
   - 订单阶段跟踪
   - 生产工单管理

6. **生产管理** (`/admin/settings`)
   - 生产模板配置
   - 站点设置
   - 价格设置

7. **用户管理** (`/admin/users`)
   - 用户列表
   - 用户详情
   - 用户角色管理

8. **内容管理** (`/admin/content-manager`)
   - 导航菜单管理
   - 首页内容
   - 关于页面
   - 帮助页面
   - 静态文本

9. **优惠券管理** (`/admin/coupons`)
   - 创建优惠券
   - 优惠券列表
   - 启用/禁用

10. **促销管理** (`/admin/promotions`)
    - 创建促销活动
    - 促销规则配置

11. **艺术素材管理** (`/admin/art-assets`)
    - 上传艺术素材
    - 素材分类管理

12. **设计审核** (`/admin/designs`)
    - 待审核设计列表
    - 设计详情查看
    - 审核通过/拒绝

13. **成本管理** (`/admin/cost-management`)
    - 产品成本统计
    - 成本分析

---

## 🚨 常见问题

### Q1: 访问 `/admin` 显示 404 或错误

**可能原因**:
- 前端服务未正确部署
- 路由配置问题
- 需要先登录

**解决方法**:
1. 确认前端服务正常运行
2. 访问 `/admin/login` 先登录
3. 检查后端 API 是否可访问

---

### Q2: 登录失败

**可能原因**:
- Admin 用户不存在
- 密码错误
- 用户角色不是 ADMIN

**解决方法**:

1. **检查数据库中是否存在 admin 用户**:
   ```bash
   # 连接数据库检查
   psql $DATABASE_URL
   SELECT email, role FROM users WHERE email = 'admin@suvernireplus.com';
   ```

2. **如果用户不存在，创建 admin 用户**:
   - 运行 seed 脚本
   - 或手动创建用户并设置角色为 ADMIN

3. **重置密码**:
   - 直接更新数据库中的 `password_hash`
   - 或通过后端 API 重置

---

### Q3: 登录成功但无法访问管理页面

**可能原因**:
- 用户角色不是 ADMIN
- 认证 token 无效

**解决方法**:
1. 检查用户角色是否为 `ADMIN`（大写）
2. 清除浏览器 cookies 重新登录
3. 检查后端认证中间件配置

---

### Q4: 后端 API 返回 401 错误

**可能原因**:
- 未登录或登录过期
- Token 无效

**解决方法**:
1. 重新登录获取新 token
2. 检查浏览器 cookies 中是否有 token
3. 检查后端 Secret Manager 中的 JWT_SECRET 是否正确

---

## 📝 配置二级域名后的访问流程

1. **配置二级域名** `app.souvenirplusinc.com` → 前端服务

2. **访问 Admin 后台**:
   ```
   https://app.souvenirplusinc.com/admin/login
   ```

3. **使用管理员账号登录**:
   - Email: `admin@suvernireplus.com`
   - Password: `admin123`

4. **登录成功后自动跳转到**:
   ```
   https://app.souvenirplusinc.com/admin
   ```

5. **开始使用管理功能**:
   - 商品管理
   - 分类管理
   - 订单管理
   - 生产管理
   - 等等...

---

**最后更新**: 2025-11-28
