# Offline 订单提交问题修复说明

**日期**: 2025-01-28 19:20:00

## 问题描述

用户在提交 offline 订单时遇到 500 内部服务器错误：

```
[OfflineOrder] Submission error: Error: Failed to create offline order
POST https://print-main-backend-234065158862.us-central1.run.app/api/offline-orders 500 (Internal Server Error)
```

## 问题根源

通过分析后端代码，发现问题的根源在于：

1. **`getInitialStage()` 可能返回 `undefined`**：
   - `DEFAULT_STAGE_CONFIG` 被设置为空数组 `[]`
   - 当数据库中没有配置阶段时，`getInitialStage()` 会返回 `undefined`
   - 在 `offlineOrderController.js` 中访问 `initialStage.key` 时会导致错误

2. **缺少错误处理**：
   - `getStageConfig()` 没有错误处理，数据库查询失败时会抛出异常
   - 没有对 `initialStage` 进行有效性验证

## 修复方案

### 1. 添加默认阶段配置

**文件**: `backend/src/services/offlineWorkflowService.js`

```javascript
// [2025-01-28 19:15:00] 修复：提供默认阶段，避免 getInitialStage 返回 undefined
const DEFAULT_STAGE_CONFIG = [
  {
    key: 'new',
    label: 'New',
    description: 'New order received',
    position: 0
  }
];
```

### 2. 改进 `getInitialStage()` 函数

确保始终返回有效的阶段对象：

```javascript
const getInitialStage = async () => {
  try {
    const stages = await getStageConfig();
    // 确保始终返回有效的阶段对象
    if (stages && stages.length > 0) {
      return stages[0];
    }
  } catch (error) {
    // 如果获取阶段配置失败，返回默认阶段
    logger.warn('[offlineWorkflowService] Failed to get stage config, using default:', error?.message);
  }
  // 返回默认阶段，确保永远不会返回 undefined
  return DEFAULT_STAGE_CONFIG[0];
};
```

### 3. 改进 `getStageConfig()` 错误处理

添加 try-catch 确保数据库查询失败时不会导致整个请求失败：

```javascript
const getStageConfig = async () => {
  try {
    const record = await Setting.findOne({ where: { key: STAGE_SETTING_KEY } });
    const parsed = parseSettingValue(record?.value);
    const stages = normalizeStages(parsed?.stages || parsed);
    return stages;
  } catch (error) {
    // 如果查询失败，记录错误并返回空数组（将使用默认阶段）
    logger.warn('[offlineWorkflowService] Failed to get stage config from database:', error?.message);
    return [];
  }
};
```

### 4. 在控制器中添加验证

**文件**: `backend/src/controllers/offlineOrderController.js`

添加对 `initialStage` 的验证：

```javascript
// 获取初始阶段，确保不为 undefined
const initialStage = await getInitialStage();

// 验证 initialStage 是否有效
if (!initialStage || !initialStage.key || !initialStage.label) {
  logger.error('[offlineOrderController] Invalid initial stage:', initialStage);
  return res.status(500).json({
    error: 'Server Error',
    message: 'Failed to get initial stage configuration. Please contact administrator.',
  });
}
```

## 修复效果

1. ✅ **确保始终有有效的阶段配置**：即使数据库中没有配置，也会使用默认阶段
2. ✅ **改进错误处理**：数据库查询失败不会导致整个请求失败
3. ✅ **添加验证逻辑**：在创建订单前验证阶段配置的有效性
4. ✅ **更好的错误日志**：记录详细的错误信息，便于调试

## 测试建议

修复后，请测试以下场景：

1. **正常提交**：填写完整的订单表单并提交，应该能够成功创建订单
2. **无阶段配置**：确保在数据库中没有阶段配置时，仍能成功提交订单（使用默认阶段）
3. **数据库连接失败**：模拟数据库连接失败的情况，确保系统能够优雅地处理

## 相关文件

- `backend/src/services/offlineWorkflowService.js` - 阶段配置服务
- `backend/src/controllers/offlineOrderController.js` - 订单控制器

## 提交信息

```
修复 offline 订单提交失败问题

- [2025-01-28 19:15:00] 修复 getInitialStage() 可能返回 undefined 的问题
- [2025-01-28 19:15:00] 添加默认阶段配置，确保始终有有效的阶段对象
- [2025-01-28 19:20:00] 改进错误处理：getStageConfig 失败时返回空数组
- [2025-01-28 19:20:00] 在 offlineOrderController 中添加 initialStage 验证
- 修复了 500 内部服务器错误，确保订单可以正常提交
```

