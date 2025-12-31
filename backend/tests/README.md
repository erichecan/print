# 测试文档

**更新时间**:  
**测试框架**: Jest

## 测试结构

```
backend/tests/
├── unit/              # 单元测试
│   ├── authController.test.js      # 认证 API 测试
│   ├── cartController.test.js      # 购物车 API 测试
│   ├── checkoutController.test.js  # 支付 API 测试
│   ├── orderController.test.js     # 订单 API 测试
│   └── ...
└── integration/       # 集成测试
    └── ...
```

## 运行测试

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
npm test -- tests/unit/authController.test.js
```

### 运行测试并查看覆盖率
```bash
npm run test:coverage
```

### 监听模式（开发时使用）
```bash
npm run test:watch
```

## 测试覆盖范围

### ✅ 认证 API 测试 (`authController.test.js`)
- ✅ 用户注册
  - 成功注册新用户
  - 验证必填字段（email, password）
  - 验证密码长度要求
  - 验证邮箱唯一性
- ✅ 用户登录
  - 成功登录
  - 验证必填字段
  - 验证用户不存在的情况
  - 验证密码错误的情况
- ✅ 用户登出
  - 成功登出
- ✅ 获取当前用户信息
  - 成功获取用户信息
  - 验证未认证的情况
  - 验证用户不存在的情况
- ✅ 忘记密码
  - 请求密码重置
  - 验证必填字段
- ✅ 重置密码
  - 验证未实现功能（501）

**测试用例数**: 15 个

### ✅ 购物车 API 测试 (`cartController.test.js`)
- ✅ 获取购物车
  - 空购物车（无用户/会话）
  - 已认证用户的购物车
  - 自动创建购物车
- ✅ 添加商品到购物车
  - 添加新商品
  - 更新已存在商品的数量
  - 验证必填字段（variantId）
  - 验证数量要求
  - 验证商品变体不存在的情况
- ✅ 更新购物车商品数量
  - 成功更新数量
  - 验证数量要求
  - 验证商品不存在的情况
- ✅ 从购物车移除商品
  - 成功移除商品
  - 验证商品不存在的情况
- ✅ 清空购物车
  - 成功清空购物车
  - 处理空购物车的情况

**测试用例数**: 15 个

### ✅ 订单 API 测试 (`orderController.test.js`)
- ✅ 通过订单号获取订单（访客访问）
  - 成功获取订单
  - 验证邮箱匹配
  - 验证邮箱不匹配（403）
  - 验证缺少邮箱参数（400）
  - 验证订单不存在（404）
- ✅ 获取用户订单列表
  - 成功获取订单列表
  - 验证分页功能
  - 验证未认证的情况（401）
- ✅ 通过 ID 获取订单详情
  - 成功获取订单详情
  - 验证访问权限（403）
  - 验证订单不存在（404）

**测试用例数**: 9 个

### ✅ 支付 API 测试 (`checkoutController.test.js`)
- ✅ 准备结账
  - 成功计算总价（含地址）
  - 验证空购物车（400）
- ✅ 创建支付意图
  - 成功创建支付意图
  - 验证缺少地址（400）
  - 验证空购物车（400）
  - 验证 Stripe 未配置（500）
- ✅ 获取运费
  - 成功获取运费
  - 验证缺少地址（400）
- ✅ 确认订单
  - 验证缺少 paymentIntentId（400）
  - 验证缺少 email（400）
  - 验证支付未完成（400）

**测试用例数**: 14 个

## 测试统计

- **总测试用例数**: 53 个
- **通过率**: 100%
- **测试文件数**: 4 个

## Mock 说明

### Prisma Mock
所有测试都 mock 了 Prisma 客户端，避免实际数据库操作。

### Stripe Mock
支付相关测试 mock 了 Stripe SDK，避免实际 API 调用。

### 示例 Mock 设置
```javascript
jest.mock('../../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));
```

## 编写新测试

### 测试文件结构
```javascript
jest.mock('../../src/lib/prisma', () => ({
  // Mock Prisma models
}));

const prisma = require('../../src/lib/prisma');
const controller = require('../../src/controllers/controller');

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('Controller Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    prisma.model.findUnique.mockResolvedValueOnce(mockData);
    
    // Act
    const req = { /* ... */ };
    const res = createMockResponse();
    await controller.method(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      // expected data
    }));
  });
});
```

## 注意事项

1. **时间戳**: 所有测试用例都包含时间戳注释，格式：`[YYYY-MM-DD HH:mm:ss]`
2. **Mock 清理**: 每个测试前使用 `beforeEach` 清理 mock
3. **错误处理**: 测试覆盖了成功和失败场景
4. **边界条件**: 测试包含了边界条件和错误情况

## 持续集成

测试应该在以下情况自动运行：
- Pull Request 创建时
- 代码推送到主分支时
- 手动触发 CI/CD 流水线时

## 测试覆盖率目标

- **当前覆盖率**: 核心 API > 70%
- **目标覆盖率**: > 80%

## 相关文档

- [Jest 文档](https://jestjs.io/docs/getting-started)
- [API 规范](../docs/API-SPEC.md)
- [开发计划](../docs/DEVELOPMENT-PLAN-DETAILED.md)

