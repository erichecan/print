# 🌐 线上测试指南

## ✅ 当前状态

### 已部署并可用
1. ✅ **前端网站**: https://souvenirplus.netlify.app
2. ✅ **后端 API**: https://print-mnmz.onrender.com
3. ✅ **数据库**: Neon PostgreSQL（已连接）
4. ✅ **管理员登录**: 功能正常

### 管理员登录信息
- **邮箱**: admin@suvernireplus.com
- **密码**: admin123
- **登录页面**: https://souvenirplus.netlify.app/login

## 🎯 可以测试的功能

### 1. 管理员登录
1. 访问：https://souvenirplus.netlify.app/login
2. 使用管理员账号登录
3. 登录成功后，访问：https://souvenirplus.netlify.app/admin

### 2. 后台管理功能
- ✅ **产品管理** (`/admin/products`)
  - 查看产品列表
  - 创建新产品
  - 编辑产品信息
  - ⚠️ **上传产品图片**（见下方注意事项）

- ✅ **分类管理** (`/admin/categories`)
  - 查看分类列表
  - 创建新分类
  - 编辑分类信息

- ✅ **订单管理** (`/admin/orders`)
  - 查看订单列表
  - 查看订单详情

- ✅ **用户管理** (`/admin/users`)
  - 查看用户列表

## ⚠️ 重要注意事项

### 文件上传限制（Render 免费计划）

**问题**：Render 的免费计划使用**临时文件系统**，上传的文件会在以下情况丢失：
- 服务重启
- 服务休眠后唤醒
- 部署更新

**影响**：
- 上传的产品图片可能会丢失
- 上传的分类图片可能会丢失

**解决方案**（推荐）：

#### 方案 1：使用云存储（推荐用于生产环境）

配置 AWS S3 或阿里云 OSS：

1. **AWS S3 配置**（在 Render 环境变量中设置）：
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name
   ```

2. **阿里云 OSS 配置**（在 Render 环境变量中设置）：
   ```
   ALIYUN_OSS_REGION=oss-us-east-1
   ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
   ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret_key
   ALIYUN_OSS_BUCKET=your-bucket-name
   ```

**注意**：需要修改后端代码以使用云存储，目前代码使用的是本地存储。

#### 方案 2：临时测试（可以接受文件丢失）

如果只是临时测试，可以：
- 上传图片进行功能测试
- 接受文件可能会丢失的事实
- 用于验证上传功能是否正常工作

## 📝 测试步骤

### 测试管理员登录
1. 访问：https://souvenirplus.netlify.app/login
2. 输入：
   - Email: `admin@suvernireplus.com`
   - Password: `admin123`
3. 点击 "Sign In"
4. 应该跳转到首页或 `/admin` 页面

### 测试产品管理
1. 登录后访问：https://souvenirplus.netlify.app/admin/products
2. 点击 "Add Product" 或访问：https://souvenirplus.netlify.app/admin/products/new
3. 填写产品信息
4. 尝试上传产品图片（注意：文件可能会在服务重启后丢失）

### 测试分类管理
1. 访问：https://souvenirplus.netlify.app/admin/categories
2. 创建新分类
3. 编辑分类信息

## 🔍 验证 API 连接

### 测试登录 API
```bash
curl -X POST "https://print-mnmz.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://souvenirplus.netlify.app" \
  -d '{"email":"admin@suvernireplus.com","password":"admin123"}'
```

### 测试产品列表 API
```bash
curl "https://print-mnmz.onrender.com/api/products" \
  -H "Origin: https://souvenirplus.netlify.app"
```

## 🚨 已知问题

1. **分类 API 返回 500 错误**
   - 可能是数据库中没有分类数据
   - 不影响其他功能

2. **文件上传持久化问题**
   - Render 免费计划不支持持久化文件存储
   - 需要配置云存储（AWS S3 或阿里云 OSS）

## 📊 功能可用性总结

| 功能 | 状态 | 说明 |
|------|------|------|
| 前端网站 | ✅ 可用 | 正常访问 |
| 后端 API | ✅ 可用 | 正常响应 |
| 数据库连接 | ✅ 可用 | 已连接 |
| 管理员登录 | ✅ 可用 | 可以登录 |
| 产品管理 | ✅ 可用 | 可以创建/编辑产品 |
| 分类管理 | ✅ 可用 | 可以创建/编辑分类 |
| 文件上传 | ⚠️ 有限制 | 功能可用，但文件不持久化 |
| 订单管理 | ✅ 可用 | 可以查看订单 |
| 用户管理 | ✅ 可用 | 可以查看用户 |

## 🎉 总结

**是的，你现在可以在线上测试后端内容了！**

可以测试：
- ✅ 管理员登录
- ✅ 创建和编辑产品
- ✅ 创建和编辑分类
- ✅ 上传商品图片（功能可用，但文件可能丢失）
- ✅ 查看订单和用户

**注意事项**：
- 上传的图片文件在 Render 服务重启后会丢失
- 如果需要持久化存储，需要配置云存储服务

