# 使用 webapp-testing Skill 进行完整测试

## 已安装的 Skills

✅ **webapp-testing** - Web 应用测试工具包  
✅ **frontend-design** - 前端设计工具  
✅ **canvas-design** - Canvas 设计工具  

## 快速开始

### 方法 1: 使用自动服务器管理（推荐）

```bash
./test-payment-complete.sh
```

这个脚本会：
1. 自动启动后端服务（端口 4000）
2. 自动启动前端服务（端口 3000）
3. 等待服务就绪后运行测试
4. 测试完成后自动清理服务器

### 方法 2: 手动运行（服务已启动时）

如果服务已经运行，直接运行测试脚本：

```bash
python3 test-payment-with-webapp-testing.py http://localhost:3000
```

## 测试内容

测试脚本会验证以下功能：

### 1. 添加购物车功能
- ✅ 无弹窗提示（alert/Toast）
- ✅ 购物车图标数字实时更新
- ✅ 无需刷新页面即可看到更新
- ✅ API 请求成功

### 2. 购物车页面
- ✅ 图片正常显示
- ✅ 图片 URL 格式正确
- ✅ 图片加载错误处理

### 3. Stripe 支付按钮
- ✅ 填写地址信息后运费计算
- ✅ 选择运费方式
- ✅ Place Order 按钮状态正确

## 测试结果

测试完成后，会在 `test-results/` 目录下生成：
- `webapp-testing-add-to-cart.png` - 添加购物车测试截图
- `webapp-testing-cart-images.png` - 购物车图片测试截图
- `webapp-testing-checkout-button.png` - 支付按钮测试截图
- `debug-*.png` - 调试截图（如果有问题）

## 使用 webapp-testing Skill 的优势

1. **服务器生命周期管理** - `with_server.py` 自动管理多个服务器
2. **Reconnaissance-then-action 模式** - 先探索页面，再执行操作
3. **最佳实践** - 遵循 webapp-testing 的测试模式
4. **跨语言支持** - Python 脚本可以轻松集成到 CI/CD

## 故障排除

### 问题：连接被拒绝
- 确保使用 `test-payment-complete.sh` 自动启动服务器
- 或手动启动服务后运行测试脚本

### 问题：找不到元素
- 检查页面是否完全加载（等待 `networkidle`）
- 查看调试截图了解页面状态

### 问题：测试失败
- 查看测试输出中的详细错误信息
- 检查 `test-results/` 目录中的截图
- 验证数据库中有测试数据

## 参考资源

- **webapp-testing skill**: `.claude/skills/webapp-testing/`
- **示例脚本**: `.claude/skills/webapp-testing/examples/`
- **服务器管理**: `.claude/skills/webapp-testing/scripts/with_server.py`

## 下一步

1. 运行完整测试：`./test-payment-complete.sh`
2. 查看测试结果和截图
3. 根据测试结果修复问题（如果有）
4. 集成到 CI/CD 流程

