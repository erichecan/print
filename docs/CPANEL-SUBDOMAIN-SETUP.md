# cPanel 二级域名配置指南

[2025-01-27] 在 cPanel 中为 Cloud Run 配置二级域名的正确方法

## ⚠️ 重要说明

**对于 Cloud Run 服务，你不需要在 cPanel 中"创建"传统的二级域名（带文档根目录的那种）**

你只需要在 **"Zone Editor"**（DNS 区域编辑器）中添加 **CNAME 记录** 即可。

---

## 📍 正确的操作位置

### 选项 1: 使用 Zone Editor（推荐）

1. 在 cPanel 主页面找到 **"Zone Editor"**（DNS 区域编辑器）
   - 图标：火箭图标或指针图标
   - 位置：通常在 "Domains" 区域附近

2. 点击进入 Zone Editor

3. 选择你的主域名（如 `fivelionshvac.com`）

4. 点击 **"Add Record"**（添加记录）

5. 添加 CNAME 记录：
   - **Name（名称）**: `api` （二级域名前缀）
   - **Type（类型）**: `CNAME`
   - **CNAME（值）**: `ghs.googlehosted.com.`（注意末尾的点）
   - **TTL**: `3600` 或默认值

6. 点击 **"Add Record"** 保存

---

## 🔧 完整配置流程

### 步骤 1: 在 GCP Cloud Run 中映射域名

首先运行脚本获取 DNS 记录：

```bash
cd /Users/eric/Desktop/print-main
./scripts/setup-custom-domain.sh
```

或者手动执行：

```bash
# 映射后端域名
gcloud run domain-mappings create \
  --service=print-main-backend \
  --domain=api.fivelionshvac.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6

# 映射前端域名
gcloud run domain-mappings create \
  --service=print-main-frontend \
  --domain=app.fivelionshvac.com \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

执行后会显示需要添加的 DNS 记录。

---

### 步骤 2: 在 cPanel Zone Editor 中添加 DNS 记录

1. **找到 Zone Editor**
   - 在 cPanel 搜索框输入 "zone" 或 "dns"
   - 点击 **"Zone Editor"**

2. **选择域名**
   - 选择 `fivelionshvac.com`

3. **添加 CNAME 记录**

   对于后端 API：
   ```
   名称: api
   类型: CNAME
   值: ghs.googlehosted.com.
   TTL: 3600
   ```

   对于前端应用：
   ```
   名称: app
   类型: CNAME
   值: ghs.googlehosted.com.
   TTL: 3600
   ```

4. **保存记录**

---

## 📋 DNS 记录示例

### 后端 API 域名

| 字段 | 值 |
|------|-----|
| 名称 | `api` |
| 类型 | `CNAME` |
| 值 | `ghs.googlehosted.com.` |
| TTL | `3600` |

这将创建：`api.fivelionshvac.com` → 指向 Cloud Run 后端

### 前端应用域名

| 字段 | 值 |
|------|-----|
| 名称 | `app` |
| 类型 | `CNAME` |
| 值 | `ghs.googlehosted.com.` |
| TTL | `3600` |

这将创建：`app.fivelionshvac.com` → 指向 Cloud Run 前端

---

## ❌ 不要这样做

- ❌ 不要在 "Domains" → "Manage" 中创建
- ❌ 不要使用 "Subdomains" 创建（会创建文档根目录）
- ❌ 不要创建 A 记录指向 IP 地址（Cloud Run 使用动态 IP）

---

## ✅ 正确的做法

- ✅ 使用 "Zone Editor" 添加 CNAME 记录
- ✅ 先映射域名到 Cloud Run（获取 DNS 记录）
- ✅ 然后在 Zone Editor 中添加 CNAME

---

## 🔍 如何找到 Zone Editor

在 cPanel 中搜索或查找：
- 搜索框输入："zone" 或 "dns"
- 或者在 "Domains" 区域附近查找
- 图标通常是：🌐 或 🚀

---

## ⏳ 等待 DNS 生效

- DNS 记录通常需要 **5-30 分钟** 生效
- 最多可能需要 **24-48 小时**

---

## ✅ 验证配置

### 检查 DNS 记录

```bash
# 检查 CNAME 记录是否生效
dig api.fivelionshvac.com CNAME
dig app.fivelionshvac.com CNAME
```

### 检查 Cloud Run 域名映射状态

```bash
gcloud run domain-mappings list \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

---

**最后更新**: 2025-01-27

