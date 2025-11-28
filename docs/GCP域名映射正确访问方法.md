# GCP 域名映射正确访问方法

## 🎯 正确的访问步骤

### 方法 1: 通过左侧导航栏（最简单）

1. **访问 Cloud Run 主页**：
   ```
   https://console.cloud.google.com/run?project=moonlit-gamma-479502-r6
   ```

2. **点击左侧导航栏的 "网域映射"** (Domain Mappings)
   - 在左侧菜单中找到 "网域映射"
   - 图标是网格形状的

3. **添加域名映射**：
   - 点击 **"+ 添加映射"** 或 **"ADD MAPPING"** 按钮
   - 填写域名信息

---

### 方法 2: 通过域名映射列表页面（推荐）

直接访问：
```
https://console.cloud.google.com/run/domains?project=moonlit-gamma-479502-r6
```

在这个页面：
- 可以查看所有现有的域名映射
- 可以添加新的域名映射
- 可以管理域名映射状态

---

### 方法 3: 通过服务详情页

1. **访问服务列表**：
   ```
   https://console.cloud.google.com/run?project=moonlit-gamma-479502-r6
   ```

2. **点击服务名称**：
   - 点击 `print-main-frontend`（前端服务）
   - 或点击 `print-main-backend`（后端服务）

3. **在服务详情页**：
   - 查看顶部是否有 "网域映射" 或 "管理自定义域名" 标签页
   - 或者查看页面的其他相关链接

---

## 📝 添加域名映射的步骤

### 创建前端域名映射

1. 访问域名映射页面（方法 1 或 2）
2. 点击 **"+ 添加映射"** 或 **"ADD MAPPING"**
3. 填写信息：
   - **域名** (Domain): `pod.souvenirplusinc.com`
   - **服务** (Service): 选择 `print-main-frontend`
   - **区域** (Region): `us-central1`
4. 点击 **"创建"** 或 **"创建映射"**

### 创建后端域名映射

1. 同样在域名映射页面
2. 点击 **"+ 添加映射"**
3. 填写信息：
   - **域名** (Domain): `api.souvenirplusinc.com`
   - **服务** (Service): 选择 `print-main-backend`
   - **区域** (Region): `us-central1`
4. 点击 **"创建"** 或 **"创建映射"**

---

## ⏰ 创建后的等待时间

- **域名映射创建**: 立即完成
- **SSL 证书配置**: 15-60 分钟（GCP 自动配置）
- **可以访问**: 通常 **30 分钟到 2 小时** 后

---

## ✅ 验证访问

等待 30-60 分钟后：

- 前端: https://pod.souvenirplusinc.com
- Admin: https://pod.souvenirplusinc.com/admin
- 后端 API: https://api.souvenirplusinc.com/api

---

**最后更新**: 2025-11-28

