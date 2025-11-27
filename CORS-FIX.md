# CORS 问题修复

[2025-01-27] 修复前端无法连接后端的问题

## 🔴 问题描述

前端访问后端 API 时出现 CORS 错误：
```
Access to fetch at 'https://print-main-backend-xxx.run.app/api/...' from origin 'https://print-main-frontend-xxx.run.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ 修复方案

### 1. 代码修改
在 `backend/src/app.js` 中添加了 Cloud Run 域名支持：

```javascript
} else if (origin.endsWith('.run.app')) {
  // [2025-01-27 23:00:00] 允许所有 Cloud Run 域名（用于 GCP 部署）
  callback(null, true);
```

### 2. 环境变量设置
设置了 `FRONTEND_URL` 环境变量：
```bash
FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app
```

### 3. 重新部署
后端镜像正在重新构建以应用这些更改。

## 🔍 技术细节

### CORS 配置逻辑
1. 检查 origin 是否在硬编码的允许列表中
2. 检查是否是 localhost/127.0.0.1（开发环境）
3. 检查是否以 `.netlify.app` 结尾（Netlify 部署）
4. **新增：** 检查是否以 `.run.app` 结尾（Cloud Run 部署）
5. 如果都不匹配，拒绝请求

### 为什么需要这个修复
- 之前的代码只支持特定的域名和 Netlify
- Cloud Run 使用动态生成的域名（`xxx.run.app`）
- 需要在代码中添加对 Cloud Run 域名的支持

## ⏳ 状态

- ✅ 代码已修改
- ✅ 环境变量已设置
- ⏳ 后端镜像正在重新构建（预计 5-10 分钟）

## 📋 验证

构建完成后，访问前端 URL 测试：
- 前端：https://print-main-frontend-234065158862.us-central1.run.app
- 后端：https://print-main-backend-234065158862.us-central1.run.app

如果不再出现 CORS 错误，说明修复成功！

---

**最后更新：** 2025-01-27

