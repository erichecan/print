# i18n Audit Report: Offline Orders Module

This report summarizes the Chinese text identified in the `offline-orders` module that needs to be internationalized.

## Target Files

### 1. [page.tsx](file:///Users/eric/Desktop/print-main/apps/web/src/app/offline-orders/page.tsx) (Main Intake Page)
- **Header Actions**: `回到主站`, `进入主站后台`, `登录`
- **Loading State**: `加载中...`
- **Footer/Submit Labels**: `保存草稿`, `下一步`, `上一步`, `提交离线订单`
- **Dynamic Messages**: Feedback and error alerts.

### 2. [sales/orders/page.tsx](file:///Users/eric/Desktop/print-main/apps/web/src/app/offline-orders/sales/orders/page.tsx) (Management Page)
- **Titles**: `Sales 线下订单管理`, `订单列表`, `配置管理`
- **Filter UI**: `搜索`, `所有创建者`, `清除筛选条件`
- **Table Headers**: `订单编号`, `项目名称`, `客户`, `创建者`, `数量`, `交付日期`, `状态`, `阶段`, `操作`
- **Status Badges**: `加急`
- **Empty States**: `没有找到匹配的线下订单`, `当前还没有线下订单。`
- **Config Management**:
  - `颜色管理`, `产品管理`, `尺码价格管理`
  - `添加新颜色`, `颜色名称`, `十六进制`, `添加`
  - `产品名称`, `图片 URL`, `客户自有产品`
- **Confirmation/Alerts**: `删除失败`, `更新成功`, `请输入有效的金额`

### 3. [BillingDetails.tsx](file:///Users/eric/Desktop/print-main/apps/web/src/app/offline-orders/components/BillingDetails.tsx)
- **Table headers**: `计费明细`, `产品`, `颜色`, `尺码`, `数量`, `小计`
- **Summary labels**: `基础颜色数`, `印刷位置数`, `小计`, `税额`, `总计`

### 4. [ColorGroupCard.tsx](file:///Users/eric/Desktop/print-main/apps/web/src/app/offline-orders/components/ColorGroupCard.tsx)
- **Tooltips**: `继承上一颜色的印刷位置配置`
- **Buttons**: `继承上一颜色`, `复制到其他颜色`
- **Per-size toggle**: `为特定尺码设置不同的印刷位置`

### 5. Other Components (To be audited during implementation)
- `AddColorModal.tsx`
- `ProductItemColorConfig.tsx`
- `AddColorManualModal.tsx`

## Proposed i18n Strategy
1. **Centralized Keys**: Update `apps/web/src/translations/offlineOrders.ts` with comprehensive bilingual strings.
2. **Default Language**: Set default to `en`.
3. **Locale Context**: Ensure all sub-pages correctly use the locale switching mechanism.
