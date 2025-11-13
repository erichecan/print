# 项目文档索引

**最后更新**: 2025-01-27

本文档提供了项目所有文档的索引和说明。

---

## 📚 文档结构

```
docs/
├── README.md                          # 本文档索引
├── PROJECT-REVIEW-REPORT.md           # ⭐ 项目全面评估报告（最新）
│
├── PRD.md                             # 产品需求文档
├── ARCHITECTURE.md                    # 技术架构文档
├── API-SPEC.md                        # API 规范文档
├── DATABASE-SCHEMA.md                 # 数据库 Schema
│
├── guides/                            # 指南文档
│   ├── CLIENT-REVIEW-GUIDE.md         # 客户评审指南
│   ├── CMS-USER-GUIDE.md              # CMS 用户指南
│   ├── I18N-IMPLEMENTATION.md         # 国际化实现指南
│   ├── THEME-MIGRATION.md             # 主题迁移指南
│   ├── SEO-GUIDE.md                   # SEO 优化指南
│   ├── style-guide.md                 # 样式指南
│   └── visual-check.md                # 视觉检查清单
│
├── status/                            # 项目状态文档
│   ├── COMPLETE-SYSTEM.md             # 完整系统说明
│   ├── FINAL-STATUS.md                # 最终状态报告
│   ├── FINAL-SUMMARY.md               # 最终总结
│   ├── PROJECT-STATUS-FINAL.md        # 项目状态最终报告
│   ├── PHASE-1-PROGRESS.md            # Phase 1 进度报告
│   ├── FRONTEND-COMPLETENESS-REPORT.md # 前端完成度报告
│   └── SUMMARY.md                     # 项目总结
│
├── setup/                             # 设置和安装文档
│   ├── SETUP-GUIDE.md                 # 设置指南
│   ├── SETUP-SUMMARY.md               # 设置总结
│   ├── INSTALLATION-STEPS.md          # 安装步骤
│   ├── INSTALL-GIT-FIRST.md           # Git 安装指南
│   ├── GIT-SETUP-QUICKSTART.md        # Git 快速开始
│   ├── GITHUB-SETUP-GUIDE.md          # GitHub 设置指南
│   ├── GITHUB-INITIALIZATION.md       # GitHub 初始化
│   ├── REVIEW-QUICK-START.md          # 评审快速开始
│   ├── MVP-E2E-ROADMAP.md             # MVP E2E 路线图
│   └── ...
│
├── archive/                           # 归档文档
│   ├── NETLIFY-DEBUG.md               # Netlify 调试记录
│   ├── NETLIFY-FIX-SUMMARY.md         # Netlify 修复总结
│   ├── LAYOUT-OPTIMIZATION-SUMMARY.md # 布局优化总结
│   ├── IMAGE-REPLACEMENT-LIST.md      # 图片替换列表
│   ├── IMAGE-REPLACEMENT-SUMMARY.md   # 图片替换总结
│   └── Terminal使用速查.md            # 终端使用速查
│
├── DESIGN-LAB-*.md                    # Design Lab 相关文档
│   ├── DESIGN-LAB-GAP-ANALYSIS.md     # Design Lab 差距分析
│   ├── DESIGN-LAB-LAYOUT-COMPARISON.md # Design Lab 布局对比
│   ├── DESIGN-LAB-LAYOUT-COMPLETE.md  # Design Lab 布局完成
│   ├── DESIGN-LAB-LAYOUT-PLAN.md      # Design Lab 布局计划
│   ├── DESIGN-LAB-MIGRATION.md        # Design Lab 迁移
│   ├── DESIGN-LAB-REDESIGN-PLAN.md    # Design Lab 重设计计划
│   ├── DESIGN-LAB-REDESIGN-STATUS.md  # Design Lab 重设计状态
│   └── DESIGN-LAB-REFRACTORING-STATUS.md # Design Lab 重构状态
│
├── API-CONTRACTS.md                   # API 合约文档
├── CHANGELOG.md                       # 变更日志
├── DEPLOYMENT-GUIDE.md                # 部署指南
├── DEVELOPMENT-PLAN.md                # 开发计划
├── E2E-PLAYBOOK.md                    # E2E 测试剧本
├── E2E-TESTING-GUIDE.md               # E2E 测试指南
├── ENVIRONMENT-VARIABLES.md           # 环境变量文档
├── MIGRATION-MATRIX.md                # 迁移矩阵
├── MONITORING-GUIDE.md                # 监控指南
├── NETLIFY-DEPLOYMENT.md              # Netlify 部署指南
├── OFFLINE-ORDERS-DESIGN.md          # 离线订单设计
├── RELEASE-CHECKLIST.md               # 发布检查清单
├── SECURITY-CHECKLIST.md              # 安全检查清单
└── COMPETITOR-ANALYSIS-DESIGN-LAB.md  # 竞品分析（Custom Ink）
```

---

## 🎯 快速导航

### 新手上路

1. **项目概览**: [README.md](../README.md) (根目录)
2. **项目评估**: [PROJECT-REVIEW-REPORT.md](./PROJECT-REVIEW-REPORT.md) ⭐ **最新**
3. **产品需求**: [PRD.md](./PRD.md)
4. **技术架构**: [ARCHITECTURE.md](./ARCHITECTURE.md)
5. **快速开始**: [setup/REVIEW-QUICK-START.md](./setup/REVIEW-QUICK-START.md)

### 开发文档

- **API 规范**: [API-SPEC.md](./API-SPEC.md)
- **数据库 Schema**: [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)
- **开发计划**: [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md)
- **环境变量**: [ENVIRONMENT-VARIABLES.md](./ENVIRONMENT-VARIABLES.md)
- **迁移矩阵**: [MIGRATION-MATRIX.md](./MIGRATION-MATRIX.md)

### 部署和运维

- **部署指南**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- **Netlify 部署**: [NETLIFY-DEPLOYMENT.md](./NETLIFY-DEPLOYMENT.md)
- **监控指南**: [MONITORING-GUIDE.md](./MONITORING-GUIDE.md)
- **安全检查**: [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md)
- **发布清单**: [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)

### Design Lab

- **竞品分析**: [COMPETITOR-ANALYSIS-DESIGN-LAB.md](./COMPETITOR-ANALYSIS-DESIGN-LAB.md)
- **差距分析**: [DESIGN-LAB-GAP-ANALYSIS.md](./DESIGN-LAB-GAP-ANALYSIS.md)
- **布局计划**: [DESIGN-LAB-LAYOUT-PLAN.md](./DESIGN-LAB-LAYOUT-PLAN.md)
- **迁移指南**: [DESIGN-LAB-MIGRATION.md](./DESIGN-LAB-MIGRATION.md)

### 测试

- **E2E 测试指南**: [E2E-TESTING-GUIDE.md](./E2E-TESTING-GUIDE.md)
- **E2E 测试剧本**: [E2E-PLAYBOOK.md](./E2E-PLAYBOOK.md)
- **MVP E2E 路线图**: [setup/MVP-E2E-ROADMAP.md](./setup/MVP-E2E-ROADMAP.md)

---

## 📊 项目状态文档

### 最新评估报告

**⭐ [PROJECT-REVIEW-REPORT.md](./PROJECT-REVIEW-REPORT.md)** - 2025-01-27
- 项目全面评估
- 功能完成度分析
- 距离正式发布的差距
- 距离 Custom Ink 的差距
- 发布路线图

### 历史状态文档

- [PROJECT-STATUS-FINAL.md](./status/PROJECT-STATUS-FINAL.md) - 项目最终状态
- [FINAL-STATUS.md](./status/FINAL-STATUS.md) - 最终状态报告
- [PHASE-1-PROGRESS.md](./status/PHASE-1-PROGRESS.md) - Phase 1 进度
- [FRONTEND-COMPLETENESS-REPORT.md](./status/FRONTEND-COMPLETENESS-REPORT.md) - 前端完成度

---

## 🔍 文档分类

### 按类型分类

**需求文档**:
- PRD.md
- API-CONTRACTS.md

**架构文档**:
- ARCHITECTURE.md
- DATABASE-SCHEMA.md
- MIGRATION-MATRIX.md

**开发文档**:
- DEVELOPMENT-PLAN.md
- API-SPEC.md
- ENVIRONMENT-VARIABLES.md

**测试文档**:
- E2E-TESTING-GUIDE.md
- E2E-PLAYBOOK.md

**部署文档**:
- DEPLOYMENT-GUIDE.md
- NETLIFY-DEPLOYMENT.md
- RELEASE-CHECKLIST.md

**运维文档**:
- MONITORING-GUIDE.md
- SECURITY-CHECKLIST.md

**指南文档**:
- guides/ 目录下的所有文档

### 按阶段分类

**规划阶段**:
- PRD.md
- ARCHITECTURE.md
- DEVELOPMENT-PLAN.md

**开发阶段**:
- API-SPEC.md
- DATABASE-SCHEMA.md
- MIGRATION-MATRIX.md

**测试阶段**:
- E2E-TESTING-GUIDE.md
- E2E-PLAYBOOK.md

**部署阶段**:
- DEPLOYMENT-GUIDE.md
- RELEASE-CHECKLIST.md

**运维阶段**:
- MONITORING-GUIDE.md
- SECURITY-CHECKLIST.md

---

## 📝 文档维护

### 文档更新原则

1. **及时更新**: 代码变更后及时更新相关文档
2. **版本控制**: 重要文档标注版本号和更新日期
3. **清晰分类**: 文档按类型和阶段分类存放
4. **索引维护**: 定期更新本文档索引

### 文档命名规范

- **功能文档**: `FEATURE-NAME.md` (如 `DESIGN-LAB-MIGRATION.md`)
- **状态文档**: `STATUS-NAME.md` (如 `PROJECT-STATUS-FINAL.md`)
- **指南文档**: `GUIDE-NAME.md` (如 `SETUP-GUIDE.md`)
- **检查清单**: `*-CHECKLIST.md` (如 `RELEASE-CHECKLIST.md`)

---

## 🚀 快速查找

### 查找特定主题

**支付相关**:
- API-SPEC.md (支付 API)
- SECURITY-CHECKLIST.md (支付安全)

**Design Lab 相关**:
- COMPETITOR-ANALYSIS-DESIGN-LAB.md
- DESIGN-LAB-*.md (所有 Design Lab 文档)

**部署相关**:
- DEPLOYMENT-GUIDE.md
- NETLIFY-DEPLOYMENT.md
- RELEASE-CHECKLIST.md

**测试相关**:
- E2E-TESTING-GUIDE.md
- E2E-PLAYBOOK.md

---

## 📞 联系信息

如有文档相关问题，请联系开发团队。

---

**文档索引最后更新**: 2025-01-27

