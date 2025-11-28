# HTML 文件验证域名方法（最简单）

## 🎯 使用 HTML 文件验证域名

这是最简单的方法，不需要配置 DNS 记录！

---

## ⚡ 快速步骤

### 步骤 1: 下载验证文件

在 Google Search Console 页面中：

1. 找到 **"HTML 文件"** 验证方法（您现在看到的）
2. 点击下载按钮，下载文件：`google4024688680c5e551.html`
   - 文件名类似：`googlexxxxxxxxxxxxx.html`

### 步骤 2: 上传文件到网站根目录

1. **登录 cPanel**: `https://fivelionshvac.com:2083`

2. **找到文件管理器**:
   - 在 cPanel 首页找到 **"文件管理器"** (File Manager)
   - 或搜索 "file manager"

3. **进入网站根目录**:
   - 点击进入 `public_html` 文件夹
   - 这是网站的主目录，文件会显示在 `https://souvenirplusinc.com/`

4. **上传 HTML 文件**:
   - 点击 **"上传"** (Upload) 按钮
   - 选择刚才下载的 `google4024688680c5e551.html` 文件
   - 等待上传完成

### 步骤 3: 验证

1. 返回 Google Search Console 页面
2. 点击 **"验证"** (Verify) 按钮
3. 如果验证成功，会显示成功消息

---

## ✅ 验证成功后的操作

验证成功后，文件**不要删除**（Google 会定期检查验证文件）。

然后就可以创建 GCP 域名映射了：

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

## 🔍 验证文件是否上传成功

上传后，可以在浏览器访问验证文件，确认是否可访问：

```
https://souvenirplusinc.com/google4024688680c5e551.html
```

如果能看到文件内容（通常是一个简单的 HTML 页面），说明上传成功。

---

## 💡 小提示

- **文件名不要修改**：必须保持 Google 提供的原始文件名
- **不要删除文件**：验证成功后也要保留，Google 会定期检查
- **确保文件在根目录**：文件应该在 `public_html/` 目录下，可以直接通过域名访问

---

**最后更新**: 2025-11-28

