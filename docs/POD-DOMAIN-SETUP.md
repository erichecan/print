# pod.souvenirplusinc.com 域名配置指南

[2025-01-27] 快速配置指南

## 📍 当前状态

你已经在 **Zone Editor** 界面了，看到了域名 `souvenirplusinc.com`。

接下来需要 **3 个步骤**：

---

## ✅ 步骤 1: 验证域名所有权（必须先做）

在创建域名映射之前，GCP 需要验证你拥有 `souvenirplusinc.com` 域名。

### 最简单的方法：通过 GCP Console

1. **打开这个链接**（直接跳转到域名验证页面）：
   ```
   https://console.cloud.google.com/apis/credentials/domainverification?project=moonlit-gamma-479502-r6
   ```

2. **点击 "添加域名"**
   - 输入：`souvenirplusinc.com`
   - 选择验证方法：**"DNS 记录"**

3. **添加 DNS TXT 记录**
   - GCP 会显示一条 TXT 记录，格式类似：
     ```
     名称: @
     类型: TXT
     值: google-site-verification=xxxxxxxxxxxxx
     ```
   - **回到 cPanel Zone Editor**，点击 `+ TXT Record`
   - 填写：
     - **Name**: `@` 或留空
     - **TXT**: 粘贴完整的验证字符串
     - **TTL**: `3600`
   - 保存

4. **返回 GCP Console，点击"验证"**
   - 等待几分钟让 DNS 生效
   - 如果失败，等待 5-10 分钟后再重试

---

## ✅ 步骤 2: 在 Cloud Run 中创建域名映射

域名验证完成后，有两种方式：

### 方法 A：通过 GCP Console（推荐，最简单）

1. **打开 Cloud Run 服务页面**：
   ```
   https://console.cloud.google.com/run/detail/us-central1/print-main-frontend?project=moonlit-gamma-479502-r6
   ```

2. **添加自定义域名**：
   - 点击 "管理自定义域名" 标签
   - 点击 "添加映射"
   - 输入：`pod.souvenirplusinc.com`
   - 选择区域：`us-central1`
   - 点击 "继续"

3. **GCP 会显示需要添加的 DNS 记录**
   - 记录格式：
     ```
     类型: CNAME
     名称: pod
     值: ghs.googlehosted.com.
     ```

### 方法 B：告诉我，我帮你用命令行创建

域名验证完成后，告诉我，我会运行命令创建域名映射。

---

## ✅ 步骤 3: 在 Zone Editor 中添加 CNAME 记录

1. **在 Zone Editor 中**，找到 `souvenirplusinc.com`，点击 **`+ CNAME Record`**

2. **填写信息**：
   - **Name**: `pod`（只要前缀）
   - **CNAME**: `ghs.googlehosted.com.`（注意末尾的点）
   - **TTL**: `3600`（或默认值）

3. **保存**

---

## ⏱️ 等待生效

- **DNS 记录生效**: 5-30 分钟
- **域名映射验证**: DNS 生效后，GCP 自动验证
- **SSL 证书**: 验证通过后自动配置（15-30 分钟）

---

## 🔍 验证

配置完成后，访问：
```
https://pod.souvenirplusinc.com
```

---

## 💡 提示

- **域名验证只需一次**：验证 `souvenirplusinc.com` 后，所有子域名（如 `pod`, `api` 等）都可以直接使用
- **如果遇到问题**：告诉我你在哪一步，我会帮你解决

---

**现在请先完成步骤 1（域名验证），完成后告诉我！**

