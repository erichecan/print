# 错误码规范文档

## 概述

本文档定义了项目中使用的统一错误码规范，确保前后端错误处理的一致性。

## 错误响应格式

所有错误响应都遵循以下统一格式：

```json
{
  "success": false,
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "用户友好的错误消息",
  "details": {
    // 可选的详细信息
  },
  "timestamp": "2025-12-06T12:00:00.000Z"
}
```

## 错误码列表

### 4xx 客户端错误

#### BAD_REQUEST (400)
- **描述**: 请求参数错误或格式不正确
- **使用场景**: 
  - 缺少必填参数
  - 参数格式错误
  - 参数值无效
- **示例消息**: 
  - "产品ID、颜色ID和尺码为必填项"
  - "尺码费用配置必须是一个数组"
  - "无效的尺码: XXX"

#### UNAUTHORIZED (401)
- **描述**: 未授权，需要身份验证
- **使用场景**:
  - 未提供认证令牌
  - 令牌无效
  - 令牌已过期
- **示例消息**:
  - "认证令牌无效"
  - "认证令牌已过期"
  - "需要身份验证"

#### FORBIDDEN (403)
- **描述**: 禁止访问，权限不足
- **使用场景**:
  - 用户没有执行操作的权限
  - 资源访问被拒绝
- **示例消息**:
  - "您没有权限执行此操作"
  - "访问被拒绝"

#### NOT_FOUND (404)
- **描述**: 资源不存在
- **使用场景**:
  - 请求的资源不存在
  - 路由不存在
- **示例消息**:
  - "资源不存在"
  - "可用性配置不存在"
  - "颜色不存在"
  - "路由不存在"

#### CONFLICT (409)
- **描述**: 资源冲突
- **使用场景**:
  - 唯一约束冲突
  - 资源已存在
- **示例消息**:
  - "该产品-颜色-尺码配置已存在"
  - "颜色名称已存在"

#### VALIDATION_ERROR (422)
- **描述**: 数据验证失败
- **使用场景**:
  - 表单验证失败
  - 数据格式验证失败
- **示例消息**:
  - "验证失败"
  - 包含详细的字段级错误信息

#### RATE_LIMIT_EXCEEDED (429)
- **描述**: 请求频率超限
- **使用场景**:
  - API 调用频率过高
  - 防止滥用
- **示例消息**:
  - "请求过于频繁，请稍后重试"

### 5xx 服务器错误

#### INTERNAL_SERVER_ERROR (500)
- **描述**: 服务器内部错误
- **使用场景**:
  - 未预期的服务器错误
  - 数据库操作失败
  - 第三方服务错误
- **示例消息**:
  - "服务器内部错误"
  - "无法获取可用性配置，请稍后重试"
  - "创建颜色失败，请稍后重试"

#### SERVICE_UNAVAILABLE (503)
- **描述**: 服务不可用
- **使用场景**:
  - 服务维护中
  - 依赖服务不可用
- **示例消息**:
  - "服务暂时不可用，请稍后重试"

## 错误处理最佳实践

### 1. 使用自定义错误类

```javascript
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');

// 抛出错误
if (!productId) {
  throw new BadRequestError('产品ID为必填项', { field: 'productId' });
}

if (!order) {
  throw new NotFoundError('订单不存在', { orderId });
}

if (existingConfig) {
  throw new ConflictError('配置已存在', { productId, colorId, size });
}
```

### 2. 在控制器中使用 next() 传递错误

```javascript
exports.createColor = async (req, res, next) => {
  try {
    // ... 业务逻辑
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ConflictError('颜色名称已存在', { name }));
    }
    next(new InternalServerError('创建颜色失败，请稍后重试'));
  }
};
```

### 3. 提供用户友好的错误消息

- ✅ **好的做法**: "产品ID、颜色ID和尺码为必填项"
- ❌ **不好的做法**: "productId, colorId, and size are required"

- ✅ **好的做法**: "无法获取可用性配置，请稍后重试"
- ❌ **不好的做法**: "Failed to get availability configs"

### 4. 在 details 中提供额外信息

```javascript
throw new BadRequestError('尺码费用配置必须是一个数组', {
  received: typeof sizeFees,
  expected: 'array',
});
```

### 5. 记录错误日志

错误处理中间件会自动记录错误日志，包括：
- 错误消息和堆栈跟踪
- HTTP 方法和 URL
- 用户 ID（如果已认证）
- IP 地址和 User-Agent
- 错误码和状态码
- 时间戳

## 前端错误处理

前端应该根据错误码显示相应的用户友好提示：

```typescript
// 示例：前端错误处理
if (error.code === 'BAD_REQUEST') {
  showError('请求参数错误，请检查输入');
} else if (error.code === 'NOT_FOUND') {
  showError('资源不存在');
} else if (error.code === 'CONFLICT') {
  showError('资源已存在，请勿重复创建');
} else if (error.code === 'INTERNAL_SERVER_ERROR') {
  showError('服务器错误，请稍后重试');
} else {
  showError(error.message || '发生未知错误');
}
```

## 错误码映射表

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未授权 |
| 403 | FORBIDDEN | 禁止访问 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突 |
| 422 | VALIDATION_ERROR | 验证失败 |
| 429 | RATE_LIMIT_EXCEEDED | 请求频率超限 |
| 500 | INTERNAL_SERVER_ERROR | 服务器内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务不可用 |

## 更新日志

- **2025-12-06**: 创建错误码规范文档，统一错误处理格式

