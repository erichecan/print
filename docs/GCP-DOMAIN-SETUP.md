# GCP 二级域名配置指南

## 📋 配置信息

- **前端域名**: `pod.souvenirplusinc.com`
- **后端域名**: `api.souvenirplusinc.com`
- **项目**: `moonlit-gamma-479502-r6`
- **区域**: `us-central1`

---

## 🔐 步骤 1: 验证域名所有权

在 GCP 创建自定义域名映射之前，需要先验证域名所有权。

### 1.1 访问 Google Search Console 验证域名

1. 访问：https://search.google.com/search-console
2. 点击"添加属性"
3. 选择"域名"类型，输入：`souvenirplusinc.com`
4. 按照提示完成域名验证（通常通过 DNS TXT 记录）

### 1.2 或在 GCP Console 中验证

1. 访问：https://console.cloud.google.com/run/domains
2. 点击"验证域名"
3. 输入域名：`souvenirplusinc.com`
4. 按照提示添加 DNS 记录完成验证

---

## 🚀 步骤 2: 创建域名映射

### 2.1 创建前端域名映射

```bash
gcloud beta run domain-mappings create \
  --service=print-main-frontend \
  --domain=pod.souvenirplusinc.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

### 2.2 创建后端域名映射

```bash
gcloud beta run domain-mappings create \
  --service=print-main-backend \
  --domain=api.souvenirplusinc.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

**执行后会返回需要添加的 DNS 记录，类似：**
```
Please add the following record to your DNS:
Type: CNAME
Name: pod
Value: ghs.googlehosted.com.
```

---

## 📝 步骤 3: 在 cPanel 中添加 DNS 记录

根据 GCP 返回的 DNS 记录，在 cPanel Zone Editor 中添加：

### 3.1 添加前端 DNS 记录

1. 登录 cPanel
2. 进入 **Zone Editor**
3. 点击 **"+ CNAME Record"** 按钮
4. 填写：
   - **Name**: `pod` （只填写前缀）
   - **Value**: `ghs.googlehosted.com.` （注意末尾有点）
   - **TTL**: `3600`

### 3.2 添加后端 DNS 记录

1. 再次点击 **"+ CNAME Record"** 按钮
2. 填写：
   - **Name**: `api` （只填写前缀）
   - **Value**: `ghs.googlehosted.com.` （注意末尾有点）
   - **TTL**: `3600`

---

## ⏰ 步骤 4: 等待 DNS 传播（5-30 分钟）

DNS 记录生效需要时间。

**验证 DNS 记录：**
```bash
dig pod.souvenirplusinc.com CNAME
dig api.souvenirplusinc.com CNAME
```

当看到 `ghs.googlehosted.com.` 时，说明 DNS 已生效。

---

## 🔄 步骤 5: 更新后端 API URL

DNS 生效后，更新 Secret Manager 中的 API URL：

```bash
echo -n "https://api.souvenirplusinc.com/api" | \
  gcloud secrets versions add api-url \
  --data-file=- \
  --project=moonlit-gamma-479502-r6
```

---

## 🚀 步骤 6: 重新部署前端（使用新的 API URL）

更新 Secret 后，需要重新部署前端：

```bash
gcloud builds submit --config cloudbuild.yaml \
  --project=moonlit-gamma-479502-r6
```

或者如果前端已配置从 Secret 读取，只需更新 Secret 即可。

---

## ✅ 配置完成后的访问地址

- **前端网站**: `https://pod.souvenirplusinc.com`
- **Admin 后台**: `https://pod.souvenirplusinc.com/admin`
- **后端 API**: `https://api.souvenirplusinc.com/api`

---

## 🔍 查看域名映射状态

```bash
gcloud beta run domain-mappings list \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

---

## ⚠️ 注意事项

1. **域名验证**: 必须先完成域名所有权验证，才能创建域名映射
2. **DNS 传播**: 添加 DNS 记录后需要等待 5-30 分钟生效
3. **SSL 证书**: Cloud Run 会自动为自定义域名提供免费 SSL 证书
4. **费用**: 自定义域名映射是免费的

---

**最后更新**: 2025-11-28

