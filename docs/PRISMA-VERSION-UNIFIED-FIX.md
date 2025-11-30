# Prisma 版本统一和引擎强制生成修复
# [2025-01-29 16:15:00]

## 修复内容

### 1. 统一 Prisma 版本

**文件**: `backend/package.json`

- ✅ 将 `@prisma/client` 从 `^5.8.1` 升级到 `5.22.0`（精确版本）
- ✅ 将 `prisma` 从 `^5.8.1` 升级到 `5.22.0`（精确版本）
- 原因：统一版本，避免构建时安装不同版本导致的不一致

### 2. 增强 Dockerfile 中的引擎生成

**文件**: `backend/Dockerfile`

**新增环境变量**：
- `PRISMA_CLI_GENERATE_DATAPROXY="false"` - 在命令行层面禁用 DataProxy
- `PRISMA_ENGINES_MIRROR=""` - 使用默认引擎镜像
- `PRISMA_SKIP_POSTINSTALL_GENERATE="false"` - 不跳过生成
- `PRISMA_GENERATE_SKIP_AUTOINSTALL="false"` - 不跳过自动安装

**改进的引擎文件检查**：
- 检查多个可能的引擎文件位置：
  - `libquery_engine*`
  - `query-engine*`
  - `*.node`
  - 使用 `find` 查找所有引擎相关文件

**运行时环境变量**：
- 在 `RUN` 命令中直接设置环境变量，确保传递给 `prisma generate`

### 3. 增强 server.js 中的运行时生成

**文件**: `backend/server.js`

**新增环境变量**：
- `PRISMA_SKIP_POSTINSTALL_GENERATE: 'false'` - 不跳过生成
- `PRISMA_ENGINES_MIRROR: ''` - 使用默认引擎镜像

### 4. 优化 Prisma Schema 注释

**文件**: `prisma/schema.prisma`

- 添加更详细的注释说明 binaryTargets 的作用
- 明确说明 native 和 debian-openssl-3.0.x 的含义

## 修复原理

### 为什么添加更多环境变量？

Prisma 在生成 Client 时可能会自动检测环境，决定是否生成引擎。通过明确设置所有相关环境变量，我们可以：

1. **强制生成二进制引擎**：确保 Prisma 不会选择 DataProxy 模式
2. **避免自动检测干扰**：明确告诉 Prisma 我们的意图
3. **确保引擎下载**：不跳过任何自动安装步骤

### binaryTargets 的作用

- `native`: 为当前构建平台生成引擎（构建时的 Docker 容器）
- `debian-openssl-3.0.x`: 为 Cloud Run 运行环境（Debian with OpenSSL 3.0.x）生成引擎

## 预期效果

1. ✅ Prisma 版本统一（构建时和运行时使用相同的 5.22.0）
2. ✅ 环境变量明确设置，强制生成二进制引擎
3. ✅ 引擎文件应该能够正确生成和下载
4. ✅ 不再出现 `engine=none`

## 下一步

1. 提交更改
2. 触发部署
3. 验证构建日志，检查是否成功生成引擎文件
4. 测试 API 端点

---

**修复时间**: 2025-01-29 16:15:00

