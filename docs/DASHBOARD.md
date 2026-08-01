# catstarry.xyz 项目看板

> 只记录高层阶段与模块状态。生产发布历史见 [`CHANGELOG.md`](../CHANGELOG.md)，长期项目事实见 [`CONTEXT.md`](../CONTEXT.md)，执行规则见 [`workflow-orchestration.md`](workflow-orchestration.md)。

---

## 模块状态

| 模块 | 状态 |
| --- | --- |
| Home | Production / maintained |
| Blog | Production / maintained |
| Feed | Production / maintained |
| Learn | Production / maintained |
| Projects | Production / maintained |
| Finance | Production / actively iterating |
| Poker | Independent deployment |

---

## Phase 状态

| Phase | 状态 |
| --- | --- |
| Phase 0–7 | ✅ 首次正式交付完成 |
| Phase 8 | 🟡 运营维护已启动 |

Phase 7 的 staging gate、production release 与 manual acceptance 已完成；具体 release evidence 只在 [`CHANGELOG.md`](../CHANGELOG.md) 维护。

---

## 技术栈

Astro + React + shadcn/ui + Cloudflare Pages / Workers + D1 + KV + R2。

---

## Phase 8 当前工作方式

- 新问题按 bug、维护、体验微调或新需求分类处理。
- 维护循环为：确认问题 → 最小改动 → 自动验证 → 木下人工验收 → 必要时进入独立 deployment task。
- 生产发布由 Deployment Session 执行；Phase 8 负责确定范围、审查证据并在成功后追加一条 `CHANGELOG.md` 记录。
- Git HEAD、待发布 commit、组件生产 source 等易过期状态，在需要时直接从 Git 与部署平台核对，不在看板中手工维护。
- 不建立 Phase 8 dispatch、next 或 release queue 文件。

Phase 0–7 的历史交付流程仍保留在 [`workflow-orchestration.md`](workflow-orchestration.md) 中作为参考；它不构成 Phase 8 的当前任务分发表。
