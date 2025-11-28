# 二级域名配置指南

## 📋 当前架构说明

### 当前服务地址

- **前端服务**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app`
- **后端 API**: `https://print-main-backend-234065158862.us-central1.run.app/api`

### 前端如何连接后端

前端通过环境变量 `NEXT_PUBLIC_API_URL` 知道后端地址，这个值存储在 GCP Secret Manager 中：
```
https://print-main-backend-234065158862.us-central1.run.app/api
```

---

## 🎯 两种配置方案

### 方案 A: 只配置前端二级域名（简单但不够理想）

**配置：**
- `app.souvenirplusinc.com` → 前端服务

**优点：**
- 只需配置一个二级域名
- 用户访问网站使用友好域名
- 后端仍然通过原始 Cloud Run URL 工作

**缺点：**
- 后端 API 地址仍然是难记的 Cloud Run URL
- 不够专业
- 如果 Cloud Run URL 改变，需要更新 Secret Manager

**适用场景：**
- 临时方案
- 只需要用户访问网站，不需要直接访问 API

---

### 方案 B: 同时配置前后端二级域名（推荐）

**配置：**
- `app.souvenirplusinc.com` → 前端服务
- `api.souvenirplusinc.com` → 后端服务

**优点：**
- 更专业、易维护
- 后端 API 地址简洁易记：`https://api.souvenirplusinc.com/api`
- 即使 Cloud Run URL 变化，二级域名保持不变
- 配置更清晰，符合最佳实践

**缺点：**
- 需要配置两个 DNS 记录
- 需要在 GCP 创建两个域名映射

**适用场景：**
- 生产环境
- 长期使用
- 需要直接访问 API 的场景

---

## 🚀 推荐配置步骤（方案 B）

### 步骤 1: 在 GCP 创建域名映射

#### 1.1 创建前端域名映射

```bash
gcloud beta run domain-mappings create \
  --service=print-main-frontend \
  --domain=app.souvenirplusinc.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

**GCP 会返回 DNS 记录，类似：**
```
Please add the following record to your DNS:
Type: CNAME
Name: app
Value: ghs.googlehosted.com.
```

#### 1.2 创建后端域名映射

```bash
gcloud beta run domain-mappings create \
  --service=print-main-backend \
  --domain=api.souvenirplusinc.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

**GCP 会返回 DNS 记录：**
```
Please add the following record to your DNS:
Type: CNAME
Name: api
Value: ghs.googlehosted.com.
```

---

### 步骤 2: 在 cPanel Zone Editor 中添加 DNS 记录

根据截图，您已经在 Zone Editor 页面了。按照以下步骤操作：

#### 2.1 添加前端 DNS 记录

1. 点击 **"+ CNAME Record"** 按钮
2. 填写以下信息：
   - **Name**: `app` （只填写前缀，不包括域名）
   - **Value**: `ghs.googlehosted.com.` （注意末尾有点）
   - **TTL**: `3600` （或使用默认值）
3. 点击添加

#### 2.2 添加后端 DNS 记录

1. 再次点击 **"+ CNAME Record"** 按钮
2. 填写以下信息：
   - **Name**: `api` （只填写前缀）
   - **Value**: `ghs.googlehosted.com.` （注意末尾有点）
   - **TTL**: `3600`
3. 点击添加

**重要提示：**
- Name 字段只填写二级域名前缀（`app` 或 `api`），不包括主域名
- Value 必须以点结尾（`.ghs.googlehosted.com.`）

---

### 步骤 3: 等待 DNS 传播（5-30 分钟）

DNS 记录生效需要一些时间。

**验证 DNS 记录：**
```bash
dig app.souvenirplusinc.com CNAME
dig api.souvenirplusinc.com CNAME
```

当看到 `ghs.googlehosted.com.` 时，说明 DNS 已生效。

---

### 步骤 4: 更新后端 API URL

DNS 生效后，更新 Secret Manager 中的 API URL：

```bash
# 更新 API URL Secret
echo -n "https://api.souvenirplusinc.com/api" | \
  gcloud secrets versions add api-url \
  --data-file=- \
  --project=moonlit-gamma-479502-r6
```

---

### 步骤 5: 重新部署前端（使用新的 API URL）

需要重新构建和部署前端，让它使用新的 API URL：

```bash
# 修改 cloudbuild.yaml 中的构建参数（如果需要）
# 然后重新部署
gcloud builds submit --config cloudbuild.yaml \
  --project=moonlit-gamma-479502-r6
```

或者直接更新前端服务使用的 Secret（如果已配置为从 Secret 读取）：

```bash
gcloud run services update print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --update-secrets=NEXT_PUBLIC_API_URL=api-url:latest
```

---

## ✅ 配置完成后的访问地址

- **前端网站**: `https://app.souvenirplusinc.com`
- **后端 API**: `https://api.souvenirplusinc.com/api`

---

## ⚠️ 注意事项

1. **SSL 证书**: Cloud Run 会自动为自定义域名提供免费 SSL 证书
2. **域名验证**: GCP 会通过 DNS 记录验证域名所有权，所以必须先添加 DNS 记录
3. **DNS 传播**: 等待 5-30 分钟让 DNS 记录生效
4. **费用**: 自定义域名映射是免费的

---

## 🔍 查看当前配置状态

### 检查域名映射状态

```bash
gcloud beta run domain-mappings list \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

### 查看当前后端 API URL

```bash
gcloud secrets versions access latest \
  --secret=api-url \
  --project=moonlit-gamma-479502-r6
```

---

**最后更新**: 2025-11-28
