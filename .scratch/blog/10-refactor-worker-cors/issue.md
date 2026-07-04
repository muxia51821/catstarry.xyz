# Slice 10：代码质量修复 — CORS 统一 + Category 类型安全

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-04
> **来源**：Phase 1 code-review Standards 检查
> **覆盖**：无对应的 User Story（代码质量改进）

---

## 目标

修复 Phase 1 原型阶段 code-review 发现的两个代码质量问题：
1. feed-api Worker 中多个路由处理函数各自设置 CORS 头，造成重复代码（Shotgun Surgery）
2. `getCategoryLabel` 函数参数类型为 `string` 而非 `Category` 联合类型，导致 TypeScript 类型安全性不足（Primitive Obsession）

## 验收标准

### CORS 统一

- [ ] 提取 CORS 头配置为单一的共享常量或 middleware 函数（如 `const CORS_HEADERS = { ... }` 或 `function addCors(response)`）
- [ ] 所有 API 路由（/api/views、/api/feed 等）使用同一份 CORS 配置
- [ ] 新增路由时无需重复编写 CORS 头，一次引入即可
- [ ] 现有 API 行为不变：`curl` 测试 CORS 头依然存在且正确
- [ ] Worker `wrangler deploy` 成功

### Category 类型安全

- [ ] 在 `src/lib/category.ts` 中定义 `type Category = 'tech' | 'life' | 'opinion'`
- [ ] `getCategoryLabel(category: Category)` 函数签名中参数类型从 `string` 改为 `Category`
- [ ] 所有调用 `getCategoryLabel` 的地方传入的参数类型兼容
- [ ] `astro check` 或 `tsc --noEmit` 通过，无类型错误
- [ ] `astro build` 构建成功

## 技术要点

### CORS 统一
- 推荐方案：在 `workers/feed-api/src/index.ts` 顶部定义 `const CORS_HEADERS`，各路由处理函数统一引用
- 如 Worker 路由结构复杂，可考虑提取 `src/middleware/cors.ts` 文件
- 不引入新的依赖包，使用原生 Response header 操作

### Category 类型安全
- 文件位置：`src/lib/category.ts`
- 类型定义与现有的 `CATEGORY_LABELS` 常量保持一致（key 就是 Category 的取值）
- 修改后需要检查所有引用 `getCategoryLabel` 的文件（如 `src/pages/blog/index.astro`、`src/pages/blog/[slug].astro` 等）

## 测试接缝

- `wrangler deploy` 后 curl 任意端点 → CORS 头存在
- `astro check` → 无类型错误
- `astro build` → 构建成功
- 博客列表页分类中文名显示正常
- 打开文章详情页 → meta 行分类显示正常

## 依赖

- Slice 4（分类 + 标签系统 — category.ts 已创建）
- Slice 5（阅读量统计 — Worker 已部署，CORS 问题在此 Worker 中）

## 被依赖

- 无

---

> **Triage**：`ready-for-agent`
