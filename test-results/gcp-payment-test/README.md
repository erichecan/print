# GCP 生产环境 Stripe 支付自动化测试

## 测试脚本说明

### 文件位置
- **测试脚本**: `test-gcp-payment-automated.py`
- **执行脚本**: `test-gcp-payment-automated.sh`
- **测试结果目录**: `test-results/gcp-payment-test/`

### 测试内容

1. **成功支付测试** - 使用 Stripe 测试卡号 `4242 4242 4242 4242`
2. **3D Secure 测试** - 使用测试卡号 `4000 0025 0000 3155`

### 测试步骤

1. 访问 GCP 生产环境首页
2. 查找并访问商品页面
3. 选择商品变体（颜色、尺寸）
4. 添加商品到购物车
5. 访问结账页面
6. 填写地址信息
7. 选择运费方式
8. 填写 Stripe 卡片信息
9. 提交支付
10. 验证支付成功和订单创建

## 运行测试

### 方法 1: 直接运行 Python 脚本

```bash
cd /Users/eric/Desktop/print-main
python3 test-gcp-payment-automated.py
```

### 方法 2: 使用执行脚本

```bash
cd /Users/eric/Desktop/print-main
./test-gcp-payment-automated.sh
```

## 测试结果

测试完成后会生成以下文件：

1. **test-report.json** - JSON 格式的测试报告
2. **test-report.html** - HTML 格式的测试报告（可在浏览器中打开）
3. **test.log** - 详细的测试日志
4. **payment-*.png** - 测试过程中的截图
5. **error-*.png** - 错误时的截图

## 查看测试报告

### HTML 报告
```bash
open test-results/gcp-payment-test/test-report.html
```

### JSON 报告
```bash
cat test-results/gcp-payment-test/test-report.json | python3 -m json.tool
```

### 测试日志
```bash
cat test-results/gcp-payment-test/test.log
```

## 当前状态

### 已完成的步骤
- ✅ 创建了自动化测试脚本
- ✅ 实现了完整的支付流程测试
- ✅ 添加了错误处理和截图功能
- ✅ 生成了测试报告（JSON 和 HTML）

### 已知问题
- ⚠️ 需要确保页面元素选择器正确匹配生产环境的实际页面结构
- ⚠️ 测试需要较长时间（每个测试约 1-2 分钟）
- ⚠️ 需要浏览器支持（使用 headed 模式以便观察）

## 测试环境

- **前端 URL**: https://print-main-frontend-234065158862.us-central1.run.app
- **后端 URL**: https://print-main-backend-234065158862.us-central1.run.app
- **Stripe 模式**: 测试模式（使用测试 API keys）

## 重要提示

1. **测试卡号不会产生真实扣款** - 使用的是 Stripe 测试卡号
2. **测试订单会创建在数据库中** - 但不会影响真实业务
3. **客户可以看到测试订单** - 因为是在生产环境测试
4. **建议在测试后清理或标记测试订单**

## 下一步

1. 运行测试并查看结果
2. 根据测试结果调整选择器和等待时间
3. 验证支付成功后检查 Stripe Dashboard
4. 验证订单是否在数据库中正确创建
5. 确认切换到正式环境前的准备工作

## 故障排除

### 问题：找不到商品链接
- 检查网络连接
- 确认 GCP 生产环境可访问
- 查看截图了解页面状态

### 问题：找不到添加购物车按钮
- 检查商品页面是否完全加载
- 确认是否需要先选择商品变体
- 查看错误截图

### 问题：支付失败
- 检查 Stripe 配置是否正确
- 确认使用的是测试 API keys
- 查看 Stripe Dashboard 中的错误信息

## 联系

如有问题，请查看测试日志和截图文件进行诊断。

