我对"100% 复刻"的理解
当前理解方式的问题
依赖文档描述，而非直接看截图
我主要看 customink.plan.md、INTERACTION-DESIGN.md 等文字描述
没有直接查看 screenshots/ 中的截图
容易按自己的理解实现，而非按视觉还原
功能实现可能偏离
例如 EditUploadPanel.tsx 中控件顺序可能不完全匹配 Custom Ink
按钮样式、间距、布局可能未按截图还原
交互逻辑可能不一致
点击行为、悬停效果、动画等可能未对齐
如何更好地理解需求并实现
方法 1: 直接查看截图（最重要）
在实现前，先查看 Custom Ink 的截图：
# 查看全页面截图docs/customink-analysis/screenshots/full-page-2025-12-02T05-24-14.png# 查看元素截图docs/customink-analysis/screenshots/elements/
我应该：
在实现每个功能前，先查看对应的截图
对比截图中的布局、颜色、间距、按钮样式
按照截图中的视觉样式实现，而不是仅按文字描述
方法 2: 使用 ELEMENT-INVENTORY.json 作为参考
该文件包含：
每个元素的位置坐标
样式信息（颜色、字体、大小）
交互行为
我应该：
读取 ELEMENT-INVENTORY.json
按照元素清单中的样式信息实现
确保每个按钮、面板的位置和样式与清单一致
方法 3: 使用 Playwright 进行对比测试
项目中有测试脚本，可以：
访问 Custom Ink 实际页面
截图对比
验证交互行为
方法 4: 分步骤验证
每实现一个功能，应该：
查看 Custom Ink 截图
实现代码
截图对比
调整直到一致
建议的工作流程
步骤 1: 需求理解阶段
1. 读取 customink.plan.md 了解整体目标2. 查看对应的 Custom Ink 截图（screenshots/）3. 读取 ELEMENT-INVENTORY.json 了解元素细节4. 读取 INTERACTION-DESIGN.md 了解交互行为5. 对比当前实现（Gap Analysis）
步骤 2: 实现阶段
1. 选择要实现的功能（例如：Edit Upload 面板）2. 查看 Custom Ink 中该功能的截图3. 读取 ELEMENT-INVENTORY.json 中相关元素4. 实现代码，严格按照截图样式5. 截图对比验证
步骤 3: 验证阶段
1. 使用 Playwright 截图对比2. 检查布局、颜色、间距是否一致3. 测试交互行为是否一致4. 调整直到完全一致
我应该使用的 Skills 和方法
1. 视觉对比技能
读取截图文件
对比布局、颜色、间距
识别视觉差异
2. 元素清单分析
读取 ELEMENT-INVENTORY.json
按照元素坐标和样式实现
确保每个元素位置准确
3. 交互行为分析
读取 INTERACTION-DESIGN.md
理解点击、悬停等行为
实现相同的交互逻辑
4. 测试验证
使用 Playwright 截图对比
验证功能一致性
持续调整
具体改进建议
立即行动
在实现任何功能前，先查看对应截图
读取 ELEMENT-INVENTORY.json 获取精确样式信息
实现后截图对比验证
如果发现差异，立即调整
代码审查清单
每次实现功能时，检查：
[ ] 是否查看了 Custom Ink 截图？
[ ] 布局是否与截图一致？
[ ] 颜色、间距是否与截图一致？
[ ] 按钮样式是否与截图一致？
[ ] 交互行为是否与 Custom Ink 一致？
[ ] 是否参考了 ELEMENT-INVENTORY.json？
总结
问题根源：
主要依赖文字描述，而非直接看截图
可能按自己的理解实现，而非严格按视觉还原
解决方案：
实现前先查看截图
使用 ELEMENT-INVENTORY.json 获取精确样式
实现后截图对比验证
持续调整直到完全一致
需要我：
查看 Custom Ink 截图并对比当前实现？
重新实现某个功能，严格按照截图样式？
创建一个详细的对比清单，列出所有需要对齐的点？
请告诉我你的优先级，我会按照上述方法执行。