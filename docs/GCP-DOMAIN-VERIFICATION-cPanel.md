# GCP 域名验证指南（使用 cPanel）

## 📋 情况说明

- **域名面板**: cPanel (https://fivelionshvac.com:2083)
- **需要验证的域名**: `souvenirplusinc.com`
- **CNAME 记录**: 已经配置好了

**问题**: GCP 要求先验证域名所有权，然后才能创建域名映射。

---

## 🔐 方法：通过 Google Search Console 验证域名

由于 cPanel 不是 Cloudflare，需要通过 Google Search Console 验证域名所有权。

### 步骤 1: 访问 Google Search Console

1. 访问：https://search.google.com/search-console
2. 使用您的 Google 账号登录（必须与 GCP 项目使用的账号相同）

### 步骤 2: 添加属性（域名验证）

1. 点击页面左上角的 **"添加属性"** 按钮
2. 选择 **"域名"** 类型（不是"URL 前缀"）
3. 输入您的域名：`souvenirplusinc.com`
4. 点击 **"继续"**

### 步骤 3: 获取验证记录

Google Search Console 会显示一个 **TXT 记录**，类似：
```
google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 步骤 4: 在 cPanel 添加 TXT 记录

1. 登录您的 cPanel：`https://fivelionshvac.com:2083`
2. 找到 **"Zone Editor"** 或 **"DNS 区域编辑器"**
3. 选择域名：`souvenirplusinc.com`
4. 点击 **"+ TXT Record"** 或 **"添加 TXT 记录"**
5. 填写以下信息：
   - **Name**: `@` 或留空（表示根域名）
   - **Type**: `TXT`
   - **Value**: `google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（完整的验证字符串）
   - **TTL**: `3600` 或使用默认值
6. 点击 **"添加记录"** 或 **"Add Record"**

### 步骤 5: 返回 Google Search Console 验证

1. 返回 Google Search Console 页面
2. 点击 **"验证"** 按钮
3. 如果验证成功，会显示 "所有权验证成功"

**注意**: DNS 记录传播可能需要几分钟到几小时，如果验证失败，请等待 10-30 分钟后重试。

---

## 🚀 验证成功后创建域名映射

域名验证成功后，执行以下命令创建域名映射：

```bash
# 创建前端域名映射
gcloud beta run domain-mappings create \
  --service=print-main-frontend \
  --domain=pod.souvenirplusinc.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6

# 创建后端域名映射
gcloud beta run domain-mappings create \
  --service=print-main-backend \
  --domain=api.souvenirplusinc.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

---

## 📝 重要提示

### 验证记录示例

在 cPanel Zone Editor 中添加的 TXT 记录应该类似：

```
Type: TXT
Name: @ (或留空)
Value: google-site-verification=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
TTL: 3600
```

### 验证账户要求

- **重要**: 用于验证域名的 Google 账号必须与 GCP 项目的所有者账号相同
- 如果不同，需要将验证账号添加到 GCP 项目作为所有者或域管理员

### 如果验证失败

1. **检查 DNS 记录是否正确**：
   ```bash
   dig souvenirplusinc.com TXT
   ```
   应该能看到 `google-site-verification=...` 记录

2. **等待 DNS 传播**：TXT 记录可能需要 5-30 分钟才能生效

3. **检查账户权限**：确保 Google Search Console 使用的账号在 GCP 项目中有权限

---

## 🔄 完整的配置流程

1. ✅ CNAME 记录已配置（您已完成）
2. ⏳ 验证域名所有权（需要添加 TXT 记录）
3. ⏳ 创建 GCP 域名映射（验证后执行）
4. ⏳ 等待 SSL 证书自动配置（GCP 自动完成）
5. ⏳ 更新后端 API URL Secret
6. ⏳ 重新部署前端服务

---

**最后更新**: 2025-11-28

