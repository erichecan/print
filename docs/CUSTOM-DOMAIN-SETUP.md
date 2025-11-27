# Cloud Run 自定义域名配置指南

[2025-01-27] 如何在 cPanel 和 GCP Cloud Run 中配置自定义域名

## 📋 步骤概览

1. **在 cPanel 中创建二级域名**（选择 "Domains"）
2. **在 GCP Cloud Run 中配置自定义域名映射**
3. **在 cPanel 中添加 DNS 记录**

---

## 🔧 步骤 1: 在 cPanel 中创建二级域名

### 1.1 进入域名管理

1. 登录 cPanel
2. 在控制面板中找到 **"Domains"**（地球图标，右半边是橙色的）
3. 点击进入

### 1.2 建议的二级域名

为你的应用创建以下二级域名：

- **`api.fivelionshvac.com`** → 指向后端服务
- **`app.fivelionshvac.com`** 或 **`www.fivelionshvac.com`** → 指向前端服务

---

## ☁️ 步骤 2: 在 GCP Cloud Run 中配置自定义域名

### 2.1 映射自定义域名到 Cloud Run 服务

需要在 GCP 中先映射域名，GCP 会提供验证记录。

**后端服务：**
```bash
gcloud run domain-mappings create \
  --service=print-main-backend \
  --domain=api.fivelionshvac.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

**前端服务：**
```bash
gcloud run domain-mappings create \
  --service=print-main-frontend \
  --domain=app.fivelionshvac.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

### 2.2 获取 DNS 验证记录

执行上述命令后，GCP 会返回 DNS 记录，类似：

```
Waiting for domain mapping to be created...done.
Please verify the ownership of api.fivelionshvac.com by adding the following record to your DNS:
Type: CNAME
Name: api
Value: ghs.googlehosted.com.
```

**重要：** 记录下这些 DNS 记录，下一步需要添加到 cPanel。

---

## 📝 步骤 3: 在 cPanel 中添加 DNS 记录

### 3.1 找到 DNS 管理

在 cPanel 中：
- 找到 **"Zone Editor"**（DNS 区域编辑器）
- 或者 **"Advanced DNS Zone Editor"**

### 3.2 添加 CNAME 记录

对于每个二级域名，添加 CNAME 记录：

#### 后端 API 域名：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| CNAME | api | ghs.googlehosted.com. | 3600 |

#### 前端应用域名：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| CNAME | app | ghs.googlehosted.com. | 3600 |

**注意：**
- 名称只填写前缀（如 `api`、`app`）
- 值必须以点结尾（`.ghs.googlehosted.com.`）

---

## ⏳ DNS 传播时间

- DNS 记录通常需要 **5-30 分钟** 生效
- 最多可能需要 **24-48 小时**（很少见）

---

## ✅ 验证配置

### 验证 DNS 记录

```bash
# 检查 DNS 记录是否生效
dig api.fivelionshvac.com CNAME
dig app.fivelionshvac.com CNAME
```

### 验证域名映射

```bash
# 检查 Cloud Run 域名映射状态
gcloud run domain-mappings list \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

---

## 🔄 配置后的更新

### 更新 API URL Secret

域名配置完成后，需要更新 API URL：

```bash
# 更新后端 URL
BACKEND_URL="https://api.fivelionshvac.com"
API_URL="${BACKEND_URL}/api"

# 更新 Secret
echo -n "${API_URL}" | gcloud secrets versions add api-url --data-file=-

# 重新部署前端以使用新的 API URL
gcloud run services update print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

### 更新前端 NEXT_PUBLIC_API_URL

前端也需要重新构建，使用新的 API URL：

```bash
# 修改 cloudbuild.yaml，更新构建参数
# --build-arg NEXT_PUBLIC_API_URL=https://api.fivelionshvac.com/api
```

---

## 💡 推荐方案

### 方案 A: 使用二级域名（推荐）

- `api.fivelionshvac.com` → 后端
- `app.fivelionshvac.com` → 前端

### 方案 B: 使用路径

- `fivelionshvac.com` → 前端
- `fivelionshvac.com/api` → 后端（需要代理配置）

**推荐使用方案 A**，更清晰，不需要代理配置。

---

## ⚠️ 注意事项

1. **SSL 证书**：Cloud Run 会自动提供免费的 SSL 证书
2. **域名验证**：GCP 需要验证域名所有权（通过 DNS 记录）
3. **DNS 传播**：等待 DNS 记录生效后再访问
4. **费用**：自定义域名映射是免费的

---

## 📚 参考链接

- [GCP Cloud Run 自定义域名文档](https://cloud.google.com/run/docs/mapping-custom-domains)
- [cPanel DNS 管理文档](https://docs.cpanel.net/cpanel/domains/dns-zone-editor/)

---

**最后更新**: 2025-01-27

