# cPanel Zone Editor 配置指南

[2025-01-27] 在 Zone Editor 中添加 CNAME 记录指向 Cloud Run

## 📍 你当前的位置

✅ 已找到 Zone Editor（DNS 区域编辑器）

## 🔧 配置步骤

### 步骤 1: 在 GCP Cloud Run 中映射域名（先做）

需要先运行以下命令来配置域名映射：

```bash
# 映射后端域名（示例）
gcloud run domain-mappings create \
  --service=print-main-backend \
  --domain=api.fivelionshvac.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6

# 映射前端域名（示例）
gcloud run domain-mappings create \
  --service=print-main-frontend \
  --domain=app.fivelionshvac.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

执行后会显示需要添加的 DNS 记录。

---

### 步骤 2: 在 Zone Editor 中添加 CNAME 记录

1. **点击 "+ CNAME Record" 按钮**
   - 在域名 `souvenirplusinc.com` 的 Actions 列中
   - 点击蓝色的 `+ CNAME Record` 按钮

2. **填写 CNAME 记录信息**

   通常 Cloud Run 的 CNAME 记录格式如下：

   | 字段 | 值 | 说明 |
   |------|-----|------|
   | **Name** | `api` | 二级域名前缀（不包含 .com） |
   | **CNAME** | `ghs.googlehosted.com.` | GCP 提供的目标（注意末尾的点） |
   | **TTL** | `3600` | 或使用默认值 |

3. **保存记录**

---

## 📋 示例配置

### 后端 API 域名

如果你想创建 `api.fivelionshvac.com`：

```
Name: api
CNAME: ghs.googlehosted.com.
TTL: 3600
```

### 前端应用域名

如果你想创建 `app.fivelionshvac.com`：

```
Name: app
CNAME: ghs.googlehosted.com.
TTL: 3600
```

---

## ⚠️ 重要提示

1. **先配置 GCP 域名映射**：必须在 Cloud Run 中先创建域名映射，GCP 会验证域名所有权
2. **Name 字段**：只填写前缀（如 `api`），不要填写完整域名
3. **CNAME 值**：必须以点结尾（如 `ghs.googlehosted.com.`）
4. **等待生效**：DNS 记录需要 5-30 分钟生效

---

## 🔍 如果 Name 字段有特殊要求

有些 cPanel 版本可能要求：
- 填写完整域名：`api.fivelionshvac.com`
- 或者相对名称：`api`

根据你的 cPanel 界面提示填写即可。

---

## ✅ 配置完成后

DNS 记录生效后（5-30 分钟），你就可以访问：
- `https://api.fivelionshvac.com` → 后端服务
- `https://app.fivelionshvac.com` → 前端服务

Cloud Run 会自动提供免费的 SSL 证书！

---

**最后更新**: 2025-01-27

