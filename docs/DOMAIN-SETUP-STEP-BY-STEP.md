# 域名配置完整指南 - pod.souvenirplusinc.com

[2025-01-27] 配置 Cloud Run 自定义域名的详细步骤

## 📋 当前状态

- **域名**: `pod.souvenirplusinc.com`
- **服务**: `print-main-frontend`
- **项目**: `moonlit-gamma-479502-r6`
- **区域**: `us-central1`

---

## 🎯 配置流程（3 个步骤）

### 步骤 1: 验证域名所有权

GCP 需要先验证你拥有 `souvenirplusinc.com` 域名。

#### 方法 A：通过 Google Search Console 验证（推荐，最快）

1. **访问 Google Search Console**
   - 打开：https://search.google.com/search-console
   - 使用你的 Google 账号登录（确保与 GCP 项目使用的账号一致）

2. **添加属性**
   - 点击左上角下拉菜单 → "添加属性"
   - 选择 **"网域"**（不是"网址前缀"）
   - 输入：`souvenirplusinc.com`
   - 点击"继续"

3. **验证域名**
   - Google 会显示需要添加的 DNS TXT 记录
   - 格式类似：`google-site-verification=xxxxxxxxxxxxx`
   - **在 cPanel Zone Editor 中添加这条 TXT 记录**

4. **添加 TXT 记录**
   - 在 Zone Editor 中，找到 `souvenirplusinc.com`
   - 点击 `+ TXT Record`（或类似的按钮）
   - 填写：
     - **Name**: `@` 或留空（表示根域名）
     - **TXT**: 粘贴 Google 提供的完整验证字符串
     - **TTL**: `3600`（或默认值）

5. **完成验证**
   - 返回 Google Search Console，点击"验证"
   - 等待几分钟让 DNS 生效，然后重试验证

#### 方法 B：通过 GCP Console 验证

1. **访问域名验证页面**
   - 打开：https://console.cloud.google.com/apis/credentials/domainverification?project=moonlit-gamma-479502-r6
   - 或者：GCP Console → API 和服务 → 凭据 → 域名验证

2. **添加域名**
   - 点击"添加域名"
   - 输入：`souvenirplusinc.com`
   - 选择验证方法（通常选择"DNS 记录"）

3. **添加 DNS TXT 记录**
   - GCP 会显示需要添加的 TXT 记录
   - 在 cPanel Zone Editor 中添加这条记录
   - 返回 GCP Console 完成验证

---

### 步骤 2: 在 Cloud Run 中创建域名映射

域名验证完成后，有两种方式创建域名映射：

#### 方法 A：通过 GCP Console（图形界面，推荐）

1. **打开 Cloud Run 服务**
   - 访问：https://console.cloud.google.com/run/detail/us-central1/print-main-frontend?project=moonlit-gamma-479502-r6
   - 或者：Cloud Run → 选择 `print-main-frontend` 服务

2. **添加自定义域名**
   - 点击"管理自定义域名"标签
   - 点击"添加映射"
   - 输入：`pod.souvenirplusinc.com`
   - 选择区域：`us-central1`
   - 点击"继续"

3. **获取 DNS 记录信息**
   - GCP 会显示需要添加的 CNAME 记录
   - 记录格式类似：
     ```
     类型: CNAME
     名称: pod
     值: ghs.googlehosted.com.
     ```

#### 方法 B：通过命令行（已验证域名后）

```bash
gcloud beta run domain-mappings create \
  --service=print-main-frontend \
  --domain=pod.souvenirplusinc.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

执行后会显示需要添加的 DNS 记录。

---

### 步骤 3: 在 cPanel Zone Editor 中添加 CNAME 记录

1. **打开 Zone Editor**
   - 在 cPanel 中找到 "Zone Editor"
   - 找到域名 `souvenirplusinc.com`

2. **点击 "+ CNAME Record" 按钮**

3. **填写 CNAME 记录**
   - **Name**: `pod`（只要前缀，不要 `.com`）
   - **CNAME**: `ghs.googlehosted.com.`（注意末尾的点）
   - **TTL**: `3600`（或默认值）

4. **保存记录**

---

## ⏱️ 等待生效

- **DNS 记录传播**: 5-30 分钟（通常）
- **域名映射验证**: GCP 会在 DNS 生效后自动验证
- **SSL 证书配置**: 验证通过后，GCP 会自动申请免费 SSL 证书（15-30 分钟）

---

## ✅ 验证配置

DNS 生效后，访问以下链接验证：

```bash
# 检查 DNS 记录
dig pod.souvenirplusinc.com CNAME

# 检查 SSL 证书
curl -I https://pod.souvenirplusinc.com
```

或者在浏览器中访问：`https://pod.souvenirplusinc.com`

---

## 🔧 如果需要后端 API 域名

如果还需要后端 API 域名（如 `api.souvenirplusinc.com`），可以：

1. **先验证根域名**（已完成）
2. **创建后端域名映射**
3. **添加 CNAME 记录**（Name: `api`）

---

## 📝 注意事项

1. **域名验证只需一次**：验证 `souvenirplusinc.com` 后，所有子域名都可以使用
2. **SSL 证书自动配置**：Cloud Run 会自动为自定义域名配置免费 SSL
3. **DNS 缓存**：如果本地看不到更改，可能是 DNS 缓存，等待或清除缓存
4. **区域选择**：确保域名映射的区域与服务部署的区域一致（`us-central1`）

---

**最后更新**: 2025-01-27

