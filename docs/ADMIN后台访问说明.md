# Admin 后台访问说明

## ⚠️ 重要：不要直接访问后端 URL

你看到的 404 错误是因为直接访问了后端 API 的根路径。

**❌ 错误访问方式：**
```
https://print-main-backend-234065158862.us-central1.run.app/api
```
这会返回 404，因为后端 API 不是网页界面。

---

## ✅ 正确的访问方式

### Admin 后台是前端应用的一部分

**当前访问地址：**
```
https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin
```

**登录页面：**
```
https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin/login
```

---

## 🔐 登录凭据

根据数据库 seed 数据：

- **Email**: `admin@suvernireplus.com`
- **Password**: `admin123`

---

## 📋 Admin 后台功能

登录后，你可以使用以下管理功能：

1. **商品管理** (`/admin/products`)
   - 商品列表、添加、编辑、删除

2. **分类管理** (`/admin/categories`)
   - 分类列表、创建、编辑

3. **订单管理** (`/admin/orders`)
   - 查看所有订单、订单详情

4. **生产管理** (`/admin/settings`)
   - 生产模板配置、站点设置

5. **内容管理** (`/admin/content-manager`)
   - 导航菜单、页面内容

6. **用户管理** (`/admin/users`)

7. **优惠券管理** (`/admin/coupons`)

8. **促销管理** (`/admin/promotions`)

9. **艺术素材管理** (`/admin/art-assets`)

10. **设计审核** (`/admin/designs`)

11. **成本管理** (`/admin/cost-management`)

12. **离线订单管理** (`/admin/offline-orders`)

---

## 🌐 配置二级域名后

配置了 `app.souvenirplusinc.com` 后，访问：

- **Admin 后台**: `https://app.souvenirplusinc.com/admin`
- **Admin 登录**: `https://app.souvenirplusinc.com/admin/login`

更方便、更专业！

---

## 💡 关于后端 API

**后端 API 的作用：**
- 为前端提供数据接口
- 处理业务逻辑
- 不是用来直接访问的网页界面

**前端如何连接后端：**
- 前端通过环境变量 `NEXT_PUBLIC_API_URL` 知道后端地址
- 当前后端 API: `https://print-main-backend-234065158862.us-central1.run.app/api`
- 前端会自动调用这个地址获取数据

**如果你配置了后端二级域名：**
- 后端 API 地址会变成：`https://api.souvenirplusinc.com/api`
- 前端会自动使用新的地址
- 不需要手动访问后端 URL

---

## 🚀 下一步

1. **现在就可以访问 Admin 后台**:
   ```
   https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin/login
   ```

2. **配置二级域名**（可选，但推荐）:
   - 配置后访问更方便：`https://app.souvenirplusinc.com/admin`
   - 参考 `docs/二级域名配置说明.md`

---

**最后更新**: 2025-11-28
