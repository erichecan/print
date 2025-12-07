# GCP Cloud Run 日志查看地址

## 直接访问链接

### 前端服务日志
https://console.cloud.google.com/run/detail/us-central1/print-main-frontend/logs?project=moonlit-gamma-479502-r6

### 后端服务日志
https://console.cloud.google.com/run/detail/us-central1/print-main-backend/logs?project=moonlit-gamma-479502-r6

## 使用 gcloud 命令查看日志

### 查看前端最近 50 条日志
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-frontend" --limit 50 --format json --freshness=10m
```

### 查看后端最近 50 条日志
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-backend" --limit 50 --format json --freshness=10m
```

### 查看认证相关日志
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-backend AND (textPayload=~'Authentication attempt' OR jsonPayload.message=~'Authentication attempt')" --limit 20 --format json --freshness=10m
```

### 查看授权检查日志
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-backend AND (textPayload=~'Authorization check' OR jsonPayload.message=~'Authorization check')" --limit 20 --format json --freshness=10m
```

### 查看 API Proxy 日志
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-frontend AND (textPayload=~'API Proxy' OR jsonPayload.message=~'API Proxy')" --limit 20 --format json --freshness=10m
```

### 查看 403 错误日志
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-backend AND (textPayload=~'403' OR jsonPayload.statusCode=403 OR jsonPayload.code=~'FORBIDDEN')" --limit 20 --format json --freshness=10m
```

## 测试结果摘要

根据最新的测试结果：

1. ✅ **Token 已正确存储到 localStorage**
   - Token 长度: 192 字符
   - Token 格式: 有效的 JWT

2. ✅ **Authorization header 已正确发送**
   - Header: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - 请求中包含完整的 token

3. ❌ **后端返回 403 错误**
   - 错误信息: "You do not have permission to access this resource"
   - 这可能是权限问题，而不是 token 解析问题

## 下一步调试建议

1. 查看后端日志中的 "Authentication attempt" 日志，确认：
   - Token 是否被正确接收
   - Token 是否被正确解析
   - 用户信息是否正确

2. 查看后端日志中的 "Authorization check" 日志，确认：
   - 用户角色是什么
   - 允许的角色是什么
   - 为什么权限检查失败

3. 检查数据库中的用户角色：
   - 确认 `salesmanager@suvernireplus.com` 的角色是 `SALES_MANAGER`
   - 确认路由配置允许 `SALES_MANAGER` 访问

