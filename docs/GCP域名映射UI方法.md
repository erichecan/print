# 通过 GCP Console UI 创建域名映射

## 🎯 为什么使用 UI 方法？

Google Search Console 的验证可能需要一些时间才能同步到 GCP。通过 GCP Console UI 创建域名映射时，GCP 会自动处理验证流程。

---

## 🚀 创建前端域名映射

### 步骤 1: 访问前端服务页面

直接访问：
```
https://console.cloud.google.com/run/detail/us-central1/print-main-frontend/domains?project=moonlit-gamma-479502-r6
```

或者：
1. 访问：https://console.cloud.google.com/run?project=moonlit-gamma-479502-r6
2. 找到服务：`print-main-frontend`
3. 点击服务名称进入详情页
4. 点击顶部标签页中的 **"管理自定义域名"** (Manage Custom Domains)

### 步骤 2: 添加域名映射

1. 点击 **"添加映射"** (Add Mapping) 或 **"+ ADD MAPPING"** 按钮
2. 在 **"域名"** (Domain) 字段输入：`pod.souvenirplusinc.com`
3. 确认区域是：`us-central1`
4. 点击 **"继续"** (Continue) 或 **"创建映射"** (Create Mapping)

### 步骤 3: 按照提示操作

- 如果 GCP 检测到域名未验证，会提供验证选项
- 如果 CNAME 记录已配置，GCP 会自动识别
- GCP 会显示配置状态和需要的 DNS 记录（如果有）

---

## 🚀 创建后端域名映射

### 步骤 1: 访问后端服务页面

直接访问：
```
https://console.cloud.google.com/run/detail/us-central1/print-main-backend/domains?project=moonlit-gamma-479502-r6
```

或者：
1. 访问：https://console.cloud.google.com/run?project=moonlit-gamma-479502-r6
2. 找到服务：`print-main-backend`
3. 点击服务名称进入详情页
4. 点击顶部标签页中的 **"管理自定义域名"** (Manage Custom Domains)

### 步骤 2: 添加域名映射

1. 点击 **"添加映射"** (Add Mapping) 或 **"+ ADD MAPPING"** 按钮
2. 在 **"域名"** (Domain) 字段输入：`api.souvenirplusinc.com`
3. 确认区域是：`us-central1`
4. 点击 **"继续"** (Continue) 或 **"创建映射"** (Create Mapping)

---

## ⏰ 访问时间线

创建域名映射后，预计的访问时间：

1. **域名映射创建**: 立即完成
2. **DNS 记录生效**: 5-30 分钟（如果 CNAME 已配置）
3. **SSL 证书配置**: 15-60 分钟（GCP 自动配置）
4. **可以访问**: 通常 **30 分钟到 2 小时** 后就可以访问

---

## ✅ 验证域名是否可访问

### 等待 30-60 分钟后，可以测试：

```bash
# 检查前端域名
curl -I https://pod.souvenirplusinc.com

# 检查后端域名
curl -I https://api.souvenirplusinc.com
```

### 或者在浏览器中访问：

- **前端**: https://pod.souvenirplusinc.com
- **后端 API**: https://api.souvenirplusinc.com/api

---

## 🔍 查看域名映射状态

访问以下链接查看状态：

- **前端域名映射状态**: 
  https://console.cloud.google.com/run/detail/us-central1/print-main-frontend/domains?project=moonlit-gamma-479502-r6

- **后端域名映射状态**: 
  https://console.cloud.google.com/run/detail/us-central1/print-main-backend/domains?project=moonlit-gamma-479502-r6

映射状态会显示：
- ✅ **已激活** (Active) - 可以访问
- ⏳ **配置中** (Provisioning) - 正在配置 SSL 证书
- ❌ **配置失败** (Failed) - 需要检查 DNS 记录

---

## ⚠️ 注意事项

1. **SSL 证书自动配置**: GCP 会自动为域名配置免费的 SSL 证书，无需手动操作
2. **DNS 传播**: 确保 CNAME 记录已正确配置并生效
3. **等待时间**: SSL 证书配置可能需要一些时间，请耐心等待

---

**最后更新**: 2025-11-28

