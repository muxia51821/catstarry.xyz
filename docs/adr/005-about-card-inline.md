# ADR-005: About Card Placement — Inline Expand vs Modal Popup

> Status: **Accepted**
> Date: 2026-07-05
> Deciders: Phase 3 architecture agent (resolved cross-document inconsistency)

---

## Context

The about card on Home has conflicting descriptions across documents:

- **GLOSSARY.md**: "导航栏入口→居中模态弹窗" (navbar entry → centered modal)
- **acceptance-home.md**: "在页面最顶部" (at the very top of page), "点击后原地展开" (expands in-place)
- **Issue H02** (`.scratch/home/02-about-card/issue.md`): "expands in-place (not modal)"

GLOSSARY was written early in Phase 0. The detailed requirements in Phase 1-2 refined the design.

## Decision

**About card renders inline at the top of Home page, expands/collapses in-place. Not a modal.**

## Rationale

1. **Issue H02 is authoritative**: It explicitly states "expands in-place (not modal)" — this is the detailed specification from Phase 2.
2. **User experience**: An inline card at the top of the timeline integrates with the B-type Home philosophy ("流动的河"). A modal interrupts the flow.
3. **Documentation hierarchy**: Issue > Acceptance > Glossary. The most recent and detailed document wins.

## Consequences

- GLOSSARY.md entry for "about 卡片" must be updated: "导航栏入口→居中模态弹窗" → "首页最顶部原地展开/收起"
- No navbar entry needed for about — it's always visible at Home page top
