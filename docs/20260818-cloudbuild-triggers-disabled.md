# 禁用 Cloud Build 触发器 — 统一走 GitHub Actions

日期：2026-08-18
执行账号：erichecan@gmail.com　项目：print-482914

## 背景

排查一次常规部署时发现：每次 push 到 `main`，代码实际被**部署 3 次**。

| # | 部署来源 | 配置来源 | 状态 |
|---|---|---|---|
| 1 | GitHub Actions `deploy-backend.yml` / `deploy-frontend.yml` | 工作流内联参数 | 保留 |
| 2 | Cloud Build 触发器（region `global`） | `cloudbuild.yaml` | **已禁用** |
| 3 | Cloud Build 触发器（region `northamerica-northeast2`） | `autodetect: true` | **已禁用** |

Cloud Build 跑得比 GitHub Actions 晚，所以**线上实际生效的一直是 Cloud Build 的配置**，
GitHub Actions 的 revision 每次都被覆盖。可从 revision 时间线印证：

```
print-main-backend-00606-qth  10:06  cpu 0.5  max 3   ← GitHub Actions
print-main-backend-00607-648  10:08  cpu 1    max 5   ← Cloud Build
print-main-backend-00608-f4x  10:08  cpu 1    max 5   ← Cloud Build（第二个触发器）
```

（2026-08-17 的 `00604` / `00605` 是同一现象。）

### 造成的三个实际问题

1. **重复构建费用** —— Cloud Build 按机器时间计费，每次 push 白烧两次构建。
2. **配置以 cloudbuild.yaml 为准** —— 改 `deploy-*.yml` 里的 cpu / max-instances 不会生效。
3. **`AUTO_MIGRATE` 被覆盖为 `false`** —— GitHub Actions 设的是 `true`。本次部署无 schema
   变更所以无影响，但下次有迁移时，GitHub Actions 跑完迁移会被 Cloud Build 覆盖成不跑
   迁移的版本，行为不确定。

这也与 CLAUDE.md 第 9.2 节冲突：项目已有 `.github/workflows/deploy-*.yml` 时必须走 GitHub Actions。

## 已执行的操作

两个触发器均通过 `gcloud builds triggers import` 加 `disabled: true` 禁用，**没有删除**，
配置已完整备份，随时可还原。

```bash
gcloud builds triggers list --region=global                   # DISABLED = True
gcloud builds triggers list --region=northamerica-northeast2  # DISABLED = True
```

## 如何还原

```bash
gcloud config configurations activate print-482914   # 账号 erichecan@gmail.com

# 触发器 1（global）
gcloud builds triggers import \
  --source=docs/20260818-cloudbuild-trigger-backup.yaml --region=global

# 触发器 2（northamerica-northeast2）
gcloud builds triggers import \
  --source=docs/20260818-cloudbuild-trigger2-backup.yaml --region=northamerica-northeast2
```

两个备份文件都是禁用前的原始 `describe` 输出，不含 `disabled` 字段，导入即恢复启用。

## 后续影响与待办

- 从下一次 push 起，只有 GitHub Actions 部署，线上配置将变为工作流声明的
  **backend: cpu 0.5 / max 3 / AUTO_MIGRATE=true**，frontend: cpu 1 / max 5。
  cpu 从 1 降到 0.5 是配置回归到工作流声明值，若发现后端响应变慢，改
  `deploy-backend.yml` 的 `--cpu` 即可（现在改它才真正生效）。
- ⚠️ 未修复：`cloudbuild.yaml` 的 `--set-env-vars` 逗号分隔被 shell 解析错位，导致线上
  `FRONTEND_URL` 变成了 `https://storage.googleapis.com/print-482914-images`
  （本该是 `https://printngoplus.com`）。触发器禁用后，下次 GitHub Actions 部署会把这个
  值刷正确，因为 `deploy-backend.yml` 里的 `--set-env-vars` 写法是对的。
- `cloudbuild.yaml` 本身保留未动，仅停用触发器。
