# 调试日志配置说明

## 概述

调试日志工具支持本地开发和生产环境。可以通过环境变量配置日志端点。

## 环境变量

### NEXT_PUBLIC_DEBUG_LOG_ENDPOINT

日志服务器端点 URL（可选）

- **本地开发**（默认）：`http://127.0.0.1:7242/ingest/ecff888f-84e6-491c-bcdb-63061d70b207`
- **生产环境**：可以配置为您自己的日志收集服务 URL，例如：
  - `https://your-logging-service.com/api/logs`
  - 或者配置为将日志写入本地文件的服务

### NEXT_PUBLIC_ENABLE_DEBUG_LOGS

是否启用调试日志

- **值**：`'true'` 或 `'false'`
- **默认**：`false`（生产环境默认禁用）
- **开发环境**：总是启用（忽略此变量）

## 使用方式

### 本地开发

不需要额外配置，日志会自动发送到本地调试服务器。

### 生产环境启用调试日志

在 GCP Cloud Run 部署时，可以通过环境变量或 Secret Manager 配置：

```bash
# 方式 1: 通过环境变量（构建时传入）
--build-arg NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true \
--build-arg NEXT_PUBLIC_DEBUG_LOG_ENDPOINT=https://your-logging-service.com/api/logs

# 方式 2: 在 Cloud Run 服务配置中设置
gcloud run services update print-main-frontend \
  --update-env-vars NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true \
  --update-env-vars NEXT_PUBLIC_DEBUG_LOG_ENDPOINT=https://your-logging-service.com/api/logs
```

### 生产环境禁用（推荐）

不设置 `NEXT_PUBLIC_ENABLE_DEBUG_LOGS`，或设置为 `false`。日志将静默失败，不影响性能。

## 注意事项

1. **性能影响**：生产环境启用调试日志可能会影响性能，建议仅在调试时启用
2. **日志端点**：确保日志端点支持 CORS，允许从前端域名访问
3. **安全性**：日志可能包含敏感信息，确保日志服务的安全性
