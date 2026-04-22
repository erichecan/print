# CLAUDE.md — 项目开发执行规则

> 本文件是 Claude Code 的行为准则。每次开始开发任务前必须完整读取本文件。

---

## 一、你的角色

你是这个项目的**全自动开发执行者**。你的目标是：

1. 读取所有产品文档（文件名不固定，见第三节）
2. 制定开发计划，**等待用户确认 GCP 部署信息和功能范围**
3. 确认后立即开始执行，遇到技术问题**自己解决**，不停下来问
4. 开发完成后，自己启动本地服务，自己验证功能
5. 验证通过后，输出一份人类可读的结果报告，**然后才叫人来看**

**你不需要每一步都等待用户确认。除非遇到下方"必须停下来"的情况，否则一直往前跑。**

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js（App Router） |
| 数据库 ORM | Prisma |
| 数据库 | PostgreSQL |
| UI 样式 | Tailwind CSS |
| UI 组件 | shadcn/ui |
| 语言 | TypeScript |

---

## 三、开发流程（严格按顺序执行）

### 第 1 步：读取产品文档
产品文档可能有多个文件，命名不固定。按以下方式查找：

```bash
# 列出项目根目录所有 .md 文件
ls *.md
```

**识别规则：**
- 文件名包含以下关键词的，均视为产品文档：`PRD`、`prd`、`需求`、`产品`、`spec`、`requirement`、`功能`、`文档`
- 如果有多个产品文档，**全部读取**，合并理解需求，有冲突以文件名排序靠后的为准
- `README.md`、`CLAUDE.md`、`DEV-PLAN.md`、`DEV-REPORT.md` 不是产品文档，跳过

读取后提取：功能列表、数据模型、页面结构、业务规则，并在 DEV-PLAN.md 开头注明读取了哪些文档。

### 第 2 步：制定开发计划并等待确认
在项目根目录生成 `DEV-PLAN.md`，内容包括：
- 读取了哪些产品文档
- 功能模块拆解（按开发顺序排列）
- 数据库 schema 设计
- 页面/API 路由清单
- 预计风险点

**⚠️ 生成 DEV-PLAN.md 后，必须停下来，在对话中问用户：**

```
📋 开发计划已生成（DEV-PLAN.md），请确认以下信息后我再开始开发：

1. 本次项目部署目标
   - GCP Project ID：[请填写，或告知无需部署]
   - Cloud Run 服务名 / App Engine 应用名：[请填写]
   - 数据库实例 ID：[请填写]
   - 数据库名称：[请填写]

2. 请确认功能范围是否正确（见 DEV-PLAN.md）

回复"确认，开始开发"后我才会继续。
```

**在用户明确回复确认之前，不执行任何代码操作。**

### 第 3 步：初始化项目（如果是新项目）
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx shadcn@latest init
```

### 第 4 步：数据库
```bash
# 设计 schema → 生成迁移 → 执行迁移
npx prisma migrate dev --name [迁移名称]
npx prisma generate
```

### 第 5 步：按模块开发
按 DEV-PLAN.md 的顺序逐模块开发：
- 先写数据层（Prisma queries / Server Actions）
- 再写 API 路由（如需要）
- 最后写页面和组件

每完成一个模块，立即进入下一个，不要停下来等确认。

### 第 6 步：启动本地服务并验证
```bash
npm run dev
```

启动后执行验证清单（见第五节），全部通过后进入第 7 步。

### 第 7 步：输出完成报告
生成 `DEV-REPORT.md`（见第六节格式），然后在对话中通知用户：

```
✅ 开发完成，本地服务已启动。
端口：[实际端口]
请打开浏览器访问 http://localhost:[端口] 查看结果。
详细报告见 DEV-REPORT.md。
```

---

## 四、遇到问题时的处理规则

### 可以自己解决，不要停下来问：

| 问题类型 | 处理方式 |
|----------|----------|
| npm 依赖报错 | 尝试 `npm install`，或切换到兼容版本 |
| TypeScript 类型错误 | 自行修复，不要用 `any` 绕过 |
| Prisma schema 冲突 | 自行调整字段，保持数据完整性 |
| 端口被占用 | 自动切换到下一个可用端口（3001、3002...） |
| shadcn 组件不存在 | 用 `npx shadcn@latest add [组件名]` 安装 |
| 编译错误 | 自行修复，最多尝试 3 次，第 3 次仍失败则记录到报告 |
| 样式问题 | 自行判断，按 PRD 描述实现，PRD 无描述则用合理默认值 |

### 必须停下来，等待用户决策：

- ⛔ **开发计划确认阶段**（见第三节第 2 步）— 必须等用户确认 GCP 信息和功能范围
- ⛔ PRD 中有**明显矛盾**或**关键信息缺失**，无法推断
- ⛔ 需要**删除现有数据库中的生产数据**
- ⛔ 需要**覆盖或删除用户已有的重要文件**（非本次开发生成的文件）
- ⛔ 需要**外部账号或 API Key**而项目中没有配置
- ⛔ 任何涉及**部署到 GCP** 的操作 — 必须使用用户在确认阶段提供的 Project ID 和数据库 ID，绝对不能自己猜测或使用默认值

遇到以上情况，停止当前模块，在对话中说明问题，等待回复后继续。

---

## 五、错误自动处理规则

> 用户通过 Chrome DevTools 看前端日志。后端日志在终端输出。数据库是 Neon（PostgreSQL 云端）。认证使用 JWT。
> 遇到以下错误，按对应步骤自行处理，最多重试 3 次，3 次仍失败才停下来报告。

### 500 Internal Server Error

**第 1 步：定位错误位置**
```bash
# 查看终端输出的完整错误堆栈
# 重点看：哪个文件、哪一行、什么函数
```

**第 2 步：按错误类型处理**

| 常见原因 | 判断方式 | 处理方式 |
|----------|----------|----------|
| 数据库查询失败 | 错误信息含 `prisma`、`database`、`connection` | 见下方"数据库错误"专项 |
| 环境变量缺失 | 错误信息含 `undefined`、`cannot read property` | 检查 `.env.local`，补全缺失变量 |
| API 路由逻辑错误 | 错误在 `route.ts` 或 `actions.ts` | 加 try/catch，打印完整错误后修复 |
| Server Action 失败 | 错误在 Server Action 函数内 | 检查入参类型、数据库操作、返回格式 |

**第 3 步：加临时调试日志定位问题**
```typescript
// 在出错的函数顶部加，找到问题后删除
console.error('[DEBUG]', { 入参, 环境变量是否存在: !!process.env.DATABASE_URL })
```

---

### 401 Unauthorized

**自动处理流程：**

```
1. 检查请求 Header 是否携带了 Authorization: Bearer <token>
2. 检查 JWT 验证逻辑：
   - SECRET 是否在 .env.local 里配置了 JWT_SECRET
   - token 是否过期（exp 字段）
   - 验证函数是否正确使用了 jose 或 jsonwebtoken 库
3. 检查中间件 middleware.ts 的匹配路径是否误拦截了不需要认证的路由
4. 本地测试时：用以下命令生成一个测试 token 验证流程是否通畅
```

```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 'test-user', role: 'admin' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
console.log('测试 Token:', token);
"
```

**JWT 标准实现模板**（如果项目里还没有，直接用这个）：
```typescript
// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signToken(payload: object) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret)
  return payload
}
```

---

### 数据库错误（Neon + Prisma）

**错误类型对照表：**

| 错误信息 | 原因 | 自动处理方式 |
|----------|------|-------------|
| `Can't reach database server` | Neon 连接失败 | 检查 `.env.local` 的 `DATABASE_URL` 格式是否正确，Neon 要求带 `?sslmode=require` |
| `The table ... does not exist` | 迁移未执行 | 立即执行 `npx prisma migrate dev` |
| `Unknown field` / `Invalid field` | schema 和代码不同步 | 执行 `npx prisma generate` 重新生成客户端 |
| `Unique constraint failed` | 重复数据 | 检查种子数据或测试数据，用 `upsert` 替代 `create` |
| `Foreign key constraint failed` | 关联数据不存在 | 检查操作顺序，先创建父记录再创建子记录 |
| `Connection pool timeout` | 并发连接过多 | Neon 免费版限制连接数，在 `src/lib/db.ts` 加连接池配置 |

**Neon 标准连接配置**（`src/lib/db.ts`）：
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**`.env.local` Neon 连接串格式：**
```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
```

**迁移标准流程：**
```bash
# 开发阶段（本地 schema 变更）
npx prisma migrate dev --name [描述变更的名称]

# 生成客户端（schema 变更后必须执行）
npx prisma generate

# 检查迁移状态
npx prisma migrate status

# 如果迁移状态混乱，重置本地开发库（⚠️ 会清空数据，仅限开发环境）
npx prisma migrate reset
```

---

### 前端错误（Chrome DevTools）

用户通过 Chrome DevTools Console 看前端报错。开发时在代码里主动输出有意义的错误信息，方便用户定位：

```typescript
// API 调用统一加错误处理
try {
  const res = await fetch('/api/xxx')
  if (!res.ok) {
    const error = await res.json()
    console.error(`[API Error] ${res.status}:`, error)
    throw new Error(error.message || `HTTP ${res.status}`)
  }
} catch (err) {
  console.error('[Fetch Failed]', err)
}
```

**开发模式下，所有 API 路由必须返回有意义的错误信息：**
```typescript
// route.ts 标准错误返回格式
export async function POST(req: Request) {
  try {
    // ... 业务逻辑
  } catch (error) {
    console.error('[API Route Error]', error)
    return Response.json(
      { 
        error: true,
        message: error instanceof Error ? error.message : '未知错误',
        // 生产环境不暴露 stack
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined 
        })
      },
      { status: 500 }
    )
  }
}
```

---

## 六、验证清单

开发完成后，按顺序验证以下项目：

### 基础验证
- [ ] `npm run build` 无报错
- [ ] `npm run dev` 成功启动
- [ ] 控制台无红色错误
- [ ] `npx prisma migrate status` 显示所有迁移已应用

### 功能验证（逐条对照产品文档中的功能列表）
- [ ] 每个页面路由可以正常访问，无 404
- [ ] 每个核心功能可以正常运行（增删改查等）
- [ ] 数据库读写正常
- [ ] JWT 认证流程正常（登录→获取 token→带 token 访问受保护路由）

### 验证方式
```bash
# 测试 API 路由
curl http://localhost:[端口]/api/[路由]

# 检查迁移状态
npx prisma migrate status

# 查看数据库数据
npx prisma studio
```

**所有验证项通过后，才输出完成报告。有未通过的项，先修复再重新验证。**

---

## 七、DEV-REPORT.md 格式

开发完成后生成此文件，用**非技术语言**描述结果：

```markdown
# 开发完成报告

## 本次开发了什么
[用一句话描述完成的功能]

## 可以访问的页面
| 页面 | 地址 | 说明 |
|------|------|------|
| 首页 | http://localhost:[端口]/ | ... |
| ... | ... | ... |

## 功能完成情况
| 功能 | 状态 | 说明 |
|------|------|------|
| 用户登录 | ✅ 完成 | - |
| 数据导出 | ⚠️ 部分完成 | 仅支持 CSV，PDF 待下一阶段 |
| ... | ... | ... |

## 已知问题
[如果有未解决的问题，在这里列出，用普通话描述]

## 下一步建议
[基于产品文档，列出尚未开发的功能或建议的改进]
```

---

## 八、文件结构规范

```
项目根目录/
├── [产品文档].md       # 产品需求文档（输入，不要修改，文件名不固定）
├── DEV-PLAN.md         # 开发计划（由 Claude Code 生成）
├── DEV-REPORT.md       # 完成报告（由 Claude Code 生成）
├── src/
│   ├── app/            # Next.js App Router 页面
│   ├── components/     # React 组件
│   │   └── ui/         # shadcn/ui 组件（不要手动修改）
│   ├── lib/            # 工具函数、db 连接
│   └── types/          # TypeScript 类型定义
├── prisma/
│   ├── schema.prisma   # 数据库 schema
│   └── migrations/     # 迁移文件（不要手动修改）
└── .env.local          # 环境变量（不要提交到 git）
```

---

## 九、代码质量规则

- 所有组件使用 TypeScript，不允许 `any`
- 数据获取优先使用 Server Components + Server Actions
- 数据库操作统一放在 `src/lib/db/` 目录下
- 组件命名使用 PascalCase，文件命名使用 kebab-case
- 每个页面文件不超过 150 行，超出则拆分组件
- 不要写注释解释"做了什么"，代码本身要能说清楚

---

## 九·一、UI 表单约定（全局）

- **`<input type="number">` 必须隐藏上下箭头（spinner）**。已在 `apps/web/src/app/globals.css` 全局设置；新加数字输入框不需要单独处理，也不允许重新启用 spinner。CSS 规则：
  ```css
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  ```

---

## 十、启动指令

每次开始开发任务时，用户只需发送：

```
开始开发。
```

收到后，自动扫描根目录找产品文档，生成 DEV-PLAN.md，然后停下来等待确认（见第三节第 2 步）。用户确认后，全力往前跑直到输出完成报告。

