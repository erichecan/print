## 部署版本快速检查指南

> 最后更新：2025-12-04 09:55:00  
> 目的：快速确认当前 GCP Cloud Run 上运行的代码版本是否为最新一次部署

### 1. 前提条件

- 已安装并登录 `gcloud`（当前项目：`moonlit-gamma-479502-r6`）
- 已在本地终端执行：

```bash
gcloud config set project moonlit-gamma-479502-r6
```

### 2. 查看 Cloud Run 当前部署镜像（前端 / 后端）

```bash
# 查看后端当前镜像（print-main-backend）
gcloud run services describe print-main-backend \
  --region=us-central1 \
  --format="value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)"

# 查看前端当前镜像（print-main-frontend）
gcloud run services describe print-main-frontend \
  --region=us-central1 \
  --format="value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)"
```

- 输出中的 `image` 字段应类似：
  - `us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend@sha256:...`
  - `us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/frontend@sha256:...`
- 记录这两个 **镜像 digest（sha256）**，用于和 Artifact Registry / 本地构建对比。

### 3. 在 Artifact Registry 中确认镜像版本

```bash
# 列出后端镜像版本
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend \
  --include-tags \
  --format="table(DIGEST,TAGS,CREATE_TIME)" \
  --sort-by=~CREATE_TIME

# 列出前端镜像版本
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/frontend \
  --include-tags \
  --format="table(DIGEST,TAGS,CREATE_TIME)" \
  --sort-by=~CREATE_TIME
```

- 用 Cloud Run 服务上的 `DIGEST` 对比这里最新一行的 `DIGEST`：
  - 如果一致：**Cloud Run 正在运行最新镜像**。
  - 如果不一致：说明最新镜像还没被部署到 Cloud Run，需要重新运行部署脚本。

### 4. 对比本地构建时间与部署时间（可选）

如果使用 `./scripts/deploy-gcp-free.sh` 或 `./scripts/deploy-gcp.sh`：

1. 部署时终端会打印构建 / 推送 / deploy 的时间戳，可以和上面 `CREATE_TIME` 对比；
2. 如需再次确认，可在 Cloud Run 控制台查看该服务的 **修订版本（Revision）创建时间**，应与最近一次部署脚本执行时间接近。

### 5. 快速健康检查（验证版本是否可用）

```bash
# 后端健康检查
curl -i "https://print-main-backend-*.run.app/api/health"

# 前端首页检查（手动在浏览器打开）
# https://print-main-frontend-*.run.app
```

- `health` 接口返回 200 且内容正常，说明后端版本可用；
- 前端页面加载正常、调用的 API 域名为 `print-main-backend-*.run.app`，并且无明显错误，即可认为版本检查通过。


