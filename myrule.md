# 项目规则与最佳实践 (Project Rules & Best Practices)

本文档记录了重要的开发规则、约定和经验教训，旨在保证代码质量并防止问题复发。

## 1. 语法验证 (Syntax Verification)
- **编辑后运行 `tsc`**: 在对 `.tsx` 文件进行重大重构或应用大量补丁后，**必须**运行 `npx tsc --noEmit --skipLibCheck` 以验证是否引入了语法错误（例如畸形的 JSX 标签）。

## 2. CSS 与样式 (CSS & Styling)
- **避免组件内的全局样式**: 不要在组件内部使用包含嵌套 `@media` 查询的 `<style jsx global>`。这会导致 SWC 编译器崩溃（Panic）。请将此类样式移至 `src/app/globals.css`。

## 3. 环境配置与运行时 (Environment Configuration)
- **生产环境 URL 检查**: 应用程序执行严格规则：在生产构建（`npm run build`）中，`NEXT_PUBLIC_API_URL` **不能**是 `localhost`。如果在本地测试生产构建，请注意这将抛出运行时错误，除非禁用该检查或提供真实的 URL。
- **服务器重启与缓存清理**: 当遇到构建工件（artifacts）缺失或 "Module not found" 错误，且您刚刚删除了 `.next` 文件夹时，**必须重启**开发服务器（`npm run dev`）以重新生成构建缓存。
- **开发 vs 生产模式**: 
    - `npm run dev`: 开发模式，支持 localhost API，包含热重载。
    - `npm run build` & `npm start`: 生产模式，禁止 localhost API（默认安全策略），性能优化。

### 3.1 前后端连接失败故障排除 (Frontend-Backend Connection Troubleshooting)
- **现象**: `ERR_CONNECTION_REFUSED`, `500 Internal Server Error`, 或提示 `无法连接到后端服务器`。
- **根因**: 前端 (3000) 已启动，但后端 (3001) 未运行或已停止。
- **规则**: 本项目必须同时运行两个独立的开发服务器才能正常工作。
    1. **Backend**: 在 `backend/` 目录下运行 `npm run dev` (端口 3001)。
    2. **Frontend**: 在 `apps/web/` 目录下运行 `npm run dev` (端口 3000)。
- **注意**: 仅重启前端不足以解决连接问题，务必检查 3001 端口是否处于监听状态 (`lsof -i:3001`)。

### 3.2 Cloud Run 部署变量冲突 (Deployment Env Var Conflict)
- **错误**: `Cannot update environment variable [KEY] to string literal because it has already been set with a different type.`
- **根因**: Cloud Run 中该环境变量之前被配置为引用 **Secret**，现在脚本试图将其设置为**普通字符串**（或者反之）。Cloud Run 不允许直接覆盖不同类型的变量。
- **解决方案**: 在 `gcloud run deploy` 命令中，必须先使用 `--clear-env-vars=KEY` 清除旧配置，然后再设置新值。
    - **正确写法**: `--clear-env-vars=NEXT_PUBLIC_API_URL --set-env-vars="NEXT_PUBLIC_API_URL=..."` (注意使用等号和引号避免解析错误)。

## 4. 数据一致性规范 (Data Consistency)
### 4.1 列表视图与其计算逻辑的数据依赖
- **数据一致性**: 在优化或修改 API 响应时，务必检查前端组件是否依赖特定字段进行计算（例如 `configuration` 或 `payment` 用于余额计算）。
- **数据冗余 (Column vs JSON)**: 请注意某些字段（如 `deposit_amount`）既存储为专用数据库列，也存储在 JSON blob（如 `configuration`）中。
    - **后端**: 必须**同时更新**列和 JSON 字段以保持一致性。
    - **前端**: 对于关键业务逻辑或财务显示，优先使用映射自专用列的属性（如 `order.payment.depositAmount`）作为单一事实来源，而不是深度嵌套到 JSON blob 中。
- **根因分析**: 经典的“列表与详情”分离模式（Summary vs Detail）在精简列表字段时，没有考虑到前端对这些字段存在**逻辑依赖**（如动态计算金额）。
- **强制规则**: 
    - **禁止盲目精简**: 在优化 API 输出体积时，必须核对前端对应页面（及子组件）是否使用了该字段进行计算。
    - **逻辑连贯性**: 如果前端需要在列表页展示汇总、状态推导或其他计算结果，后端接口必须提供所有参与计算的原始字段。
    - **平衡优化**: 如果某些 JSON 字段确实太大，考虑在后端进行预计算并直接返回计算结果（如 `balanceDue` 直接由后端计算好返回），或者在列表页保留精简版的配置数据。

## 5. 国际化 (i18n / Internationalization)
### 5.1 拒绝硬编码中文 (No Hardcoded Strings)
- **规则**: 所有面向用户的字符串必须使用翻译字典（例如 `src/translations/*.ts`）。严禁在 `.tsx` 组件中硬编码中文字符串。
- **背景**: 线下订单模块最初有许多硬编码的中文字符串，导致切换到英语时 UI 错乱。
- **预防**:
    1. 所有 UI 字符串必须放入翻译字典。
    2. 组件必须接受 `locale` 属性并使用 `t()` 函数或类似辅助函数。
    3. 始终提供英语 (`en`) 回退。
    4. 确保 `locale` 从顶层页面/容器向下传播到每个子组件。

### 5.2 验证 (Verification)
- **规则**: 在提交更改之前，必须在中文和英文环境下测试 UI。
- **预防**: 手动在 URL 或设置中切换应用程序语言环境，以验证所有字符串是否反映正确的语言，并且布局是否保持一致（英文文本通常比中文长）。

## 6. 业务逻辑与部署 (Business Logic & Deployment)
### 6.1 部署验证
- **规则**: 在执行重大部署（尤其是核心业务逻辑变更）后，必须通过控制台打印或版本接口确认前端/后端运行的是最新代码。

## 7. React 反模式 (React Anti-Patterns)
### 7.1 禁止在渲染阶段更新 State
- **错误**: "Too many re-renders."
- **根因**: 直接在组件体或 map 循环中调用 `setState`。
- **规则**:
    - **决不**在渲染路径中同步调用状态设置器。
    - 使用 `useEffect` 或在渲染**之前**准备数据。

### 7.2 数据展示去重
- **问题**: 天真地拼接名称会导致重复（例如 "Product A, Product A"）。
- **规则**: 在拼接字符串进行展示之前，**必须**使用 `Array.from(new Set(list))` 去除重复项。

## 8. 代码修改安全性 (Code Modification Safety)
- **复杂编辑后验证语法**: 当在大文件上使用 `multi_replace_file_content` 时，**必须**验证生成的语法。
- **原子包装**: 如果需要，分步修改大代码块的开始/结束部分。

## 9. API 一致性与定义 (API Consistency & Definitions)
### 9.1 HTTP 方法 (PUT vs PATCH)
- **规则**: 前端和后端之间的 HTTP 方法必须严格验证。
- **背景**: 曾发生前端使用 `PATCH` 但后端定义为 `PUT` 的 Bug。
- **预防**: 
    1. 并排打开前端 `api.ts` 和后端 `routes/*.js` 以验证方法。
    2. 小心 `update` 操作（PUT vs PATCH）。
    3. 如果更改后端方法，立即搜索前端的使用情况。

### 9.2 路由定义
- 后端路由: `backend/src/routes/`
- 前端 API 客户端: `apps/web/src/lib/api.ts`

## 10. UI 与布局最佳实践 (UI & Layout Best Practices)
### 10.1 独立布局的隔离 (Isolation of Independent Layouts)
- **规则**: 当页面（如 `/design-lab`）拥有独立的 Layout 时，必须确保 Root Layout (`LayoutWrapper`) 正确识别并隐藏全局 Header/Footer。
- **验证**: 检查 `pathname` 匹配逻辑是否覆盖所有子路由（如 `/design-lab/` 前缀），防止全局 Header 与页面独立 Header 重叠（看起来像“浮层”）。

### 10.2 文件引用验证 (Import Verification)
- **规则**: 在修改文件前，务必检查父组件实际引用的是哪个文件。
- **案例**: 编辑了 `DesignLabClient.tsx` 但 Router 实际导入的是 `DesignLabClient5.0.tsx`，导致修复不生效。

### 10.3 Logo 与图片适配 (Logo & Image Scaling)
- **规则**: 替换不同比例的 Logo 时，必须显式约束 `height` 并配合 `width: auto` 和 `object-fit: contain`。
- **避免**: 仅设置 `maxWidth` 而不限制 `height`，会导致高宽比不同的新图撑破容器。

## 11. 产品向导与复杂表单 (Product Wizard & Complex Forms)
### 11.1 数据获取封装性 (Data Fetching Robustness)
- **规则**: 在使用 `useSWR` 或其他 Fetch Hook 获取数据时，必须在 `useMemo` 或 `useEffect` 中健壮地处理响应结构。
- **背景**: API 响应可能被封装在 `{ data: [...] }` 对象中，也可能直接返回数组。前端必须同时兼容这两种情况，避免因后端包装格式微调导致页面空白。
- **代码示例**:
  ```typescript
  const items = useMemo(() => {
    // 优先检查 data 属性，其次检查本身是否为数组
    if (fetchedData?.data && Array.isArray(fetchedData.data)) return fetchedData.data;
    if (Array.isArray(fetchedData)) return fetchedData;
    return [];
  }, [fetchedData]);
  ```

### 11.2 默认状态的关联逻辑 (Default State Linking)
- **规则**: 当表单具有默认初始值（如“白色”）时，组件初始化时必须尝试将其与全局映射（Mapping ID）关联。
- **问题**: 如果仅初始化文本为“白色”而未关联 Mapping ID，UI 会将其视为“自定义/其他”颜色，导致只读字段变为可编辑，或下拉菜单无法正确显示选中项。
- **解决方案**: 在 `useEffect` 中遍历初始数据，通过名称（toLowerCase）匹配全局配置，并自动补全 ID 和标准值。

### 11.3 混合输入模式的 UI 布局 (UI Layout for Mixed Inputs)
- **规则**: 对于既支持“预设选项”又支持“自定义输入”的控件（如颜色选择），推荐使用**内联布局**（Inline Layout）。
- **最佳实践**:
    - **下拉菜单**（左侧） + **预览/值显示**（右侧）在同一行。
    - **状态区分**: 
        - 选中**预设映射**时：右侧显示为只读文本或预览色块，暗示不可修改。
        - 选中**自定义/其他**时：右侧自动切换为可编辑的 Input，暗示完全控制。
    - 这种视觉反馈比垂直堆叠更直观，能清晰传达“标准”与“自定义”的区别。
