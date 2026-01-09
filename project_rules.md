# Project Rules & Best Practices

## 1. 数据一致性规范 (Data Consistency)

### 1.1 列表视图与其计算逻辑的数据依赖
- **Data Consistency**: When optimizing or modifying API responses, always check if frontend components depend on specific fields for calculations (e.g., `configuration` or `payment` for balance calculation).
- **Data Redundancy (Column vs JSON)**: Be aware that some fields (like `deposit_amount`) are stored both as dedicated database columns and inside JSON blobs (e.g., `configuration`).
    - **Backend**: Always update BOTH the column and the JSON field to maintain consistency.
    - **Frontend**: Prefer using properties mapped from dedicated columns (like `order.payment.depositAmount`) as the primary source of truth, rather than deep-nesting into JSON blobs, for critical business logic or financial displays.
- **根因分析**: 经典的“列表与详情”分离模式（Summary vs Detail）在精简列表字段时，没有考虑到前端对这些字段存在**逻辑依赖**（如动态计算金额）。
- **强制规则**: 
    - **禁止盲目精简**: 在优化 API 输出体积时，必须核对前端对应页面（及子组件）是否使用了该字段进行计算。
    - **逻辑连贯性**: 如果前端需要在列表页展示汇总、状态推导或其他计算结果，后端接口必须提供所有参与计算的原始字段。
    - **平衡优化**: 如果某些 JSON 字段确实太大，考虑在后端进行预计算并直接返回计算结果（如 `balanceDue` 直接由后端计算好返回），或者在列表页保留精简版的配置数据。

## 2. 国际化 (i18n)

### 2.1 拒绝硬编码中文
- **规则**: 所有面向用户的字符串必须进入 `translations/` 目录，禁止在 `.tsx` 中使用硬编码中文。
- **注意**: 尤其注意子组件（如 Modal, Card）的 `locale` 传递，确保语言切换时全量更新。

## 3. 业务逻辑与版本控制

### 3.1 部署验证
- **规则**: 在执行重大部署（尤其是核心业务逻辑变更）后，必须通过控制台打印或版本接口确认前端/后端运行的是最新代码。
