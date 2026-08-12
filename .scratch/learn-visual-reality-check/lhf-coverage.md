# Learn LHF-001–214 Current Coverage Matrix

> Baseline: `task/learn-visual-reality-check @ 25447ec6f514746386701dda73f2ed661ce6c75e`  
> Authority: `catstarry.xyz — Learn Closure Package — 2026-08-11` from private `main @ e86993de9521b074f902e3cefe8be643b609d056`  
> Scope: current implementation factual coverage only; this is not final implementation acceptance.

## Status summary

| Status | Count |
|---|---:|
| PASS | 122 |
| DRIFT | 91 |
| BLOCKED | 1 |
| NOT OBSERVABLE YET | 0 |
| REVALIDATE | 0 |
| **Total** | **214** |

判定原则：

- `PASS`：当前 implementation 已满足该单项；不表示所在 surface 整体通过。
- `DRIFT`：Confirmed requirement 尚未实现，不能降为 Revalidate。
- `BLOCKED`：当前不满足，且施工受到已知 migration/production evidence gate 阻塞。
- 视觉“好不好”不由本矩阵代替，交给 Web Visual Reality Check。

## Evidence keys

- `E-HOME`：`evidence/desktop-home-*.png`、`mobile-home-*.png`
- `E-GRAPH`：`desktop-home-graph*.png`
- `E-SEARCH`：`desktop-home-search-*.png`、`mobile-home-search.png`
- `E-TRACK`：`desktop-track-*.png`、`mobile-track-programming-full.png`
- `E-NOTE`：`desktop-note-*.png`、`mobile-note-*.png`
- `E-WIKILINK`：`desktop-note-wikilink-active.png` + `current-reality.json`
- `E-ADMIN` / `E-PREVIEW`：对应 full screenshots
- `E-MOBILE` / `E-INTERACTION`：mobile screenshots + `current-reality.json`
- `S-*`：报告 Route / Source Matrix 中对应 source evidence。

## Atomic coverage

| ID | Surface | Atomic requirement | Current factual state | Evidence | Status | Notes / dependency |
|---|---|---|---|---|---|---|
| LHF-001 | Opening | `/learn` top-level exit = `← 返回星图` | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME | **PASS** | 无迁移；等待 Web optical judgement |
| LHF-002 | Opening | No `LEARNING RECORDS` | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME | **DRIFT** | 无迁移；等待 Web optical judgement |
| LHF-003 | Opening | H1 = `Learn` | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME | **PASS** | 无迁移；等待 Web optical judgement |
| LHF-004 | Opening | Intro explains durable knowledge, not learning process log | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME | **DRIFT** | 无迁移；等待 Web optical judgement |
| LHF-005 | Opening | Recommended copy: `这里放的是经过系统学习后，值得长期保留、以后还会回来看的一些理解。` | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME | **DRIFT** | 无迁移；等待 Web optical judgement |
| LHF-006 | Opening | No header count pill | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME | **DRIFT** | 无迁移；等待 Web optical judgement |
| LHF-007 | Opening | No category-colored eyebrow required | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME | **DRIFT** | 无迁移；等待 Web optical judgement |
| LHF-008 | Opening | Opening remains Cream Canvas | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME | **PASS** | 无迁移；等待 Web optical judgement |
| LHF-009 | Opening | Header max measure narrower than whole Graph field | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME | **PASS** | 无迁移；等待 Web optical judgement |
| LHF-010 | Opening | Opening has no hero illustration | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME | **PASS** | 无迁移；等待 Web optical judgement |
| LHF-011 | Knowledge Map / Graph | Graph is high-weight homepage capability | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-012 | Knowledge Map / Graph | Graph remains inside Cream Gallery | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-013 | Knowledge Map / Graph | Remove black `home-void` panel | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-014 | Knowledge Map / Graph | Remove magenta nodes | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-015 | Knowledge Map / Graph | Remove saffron hover | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-016 | Knowledge Map / Graph | Remove graph shadow | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-017 | Knowledge Map / Graph | No dashboard-like radius requirement | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-018 | Knowledge Map / Graph | Graph may use subtle tonal S1 plane | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-019 | Knowledge Map / Graph | Structural hairlines allowed | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-020 | Knowledge Map / Graph | Default edges = warm quiet lines | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-021 | Knowledge Map / Graph | Active edge = Klein Blue | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-022 | Knowledge Map / Graph | Node = Published Note | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-023 | Knowledge Map / Graph | Node shows readable title label | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-024 | Knowledge Map / Graph | Node is not anonymous tiny dot | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-025 | Knowledge Map / Graph | Track provides macro region/orientation | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-026 | Knowledge Map / Graph | Region is visually weak | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-027 | Knowledge Map / Graph | Track color does not become a multi-color category palette | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-028 | Knowledge Map / Graph | Cross-Track edge visually legal | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-029 | Knowledge Map / Graph | No edge from shared Track alone | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-030 | Knowledge Map / Graph | No visual relation type taxonomy | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-031 | Knowledge Map / Graph | No arrows implying prerequisite | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-032 | Knowledge Map / Graph | No Graph progress | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-033 | Knowledge Map / Graph | No animated constellation drift | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-034 | Knowledge Map / Graph | No pulsing | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-035 | Knowledge Map / Graph | No glow | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-036 | Knowledge Map / Graph | No score / importance sizing unless future evidence | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-037 | Knowledge Map / Graph | Node click → Note | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-038 | Knowledge Map / Graph | Node focus uses visible ring | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-039 | Knowledge Map / Graph | Hover/focus highlights direct relations | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-040 | Knowledge Map / Graph | Hover does not reveal required hidden information | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-041 | Knowledge Map / Graph | Unrelated nodes may softly de-emphasize | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-042 | Knowledge Map / Graph | Track hover highlights region, not edges | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-043 | Knowledge Map / Graph | Reciprocal links render one visible edge | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-044 | Knowledge Map / Graph | Broken public relation blocks publication | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-045 | Knowledge Map / Graph | Public Graph excludes Draft | 当前源码／渲染证据与该项一致 | E-GRAPH / S-GRAPH | **PASS** | relation normalization、lifecycle filter、broken-link validation |
| LHF-046 | Knowledge Map / Graph | Public Graph excludes Withdrawn | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-047 | Knowledge Map / Graph | Public Graph excludes Superseded active corpus nodes | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-048 | Knowledge Map / Graph | Diagnostic `N notes · N tracks · N links` removed from public UI | 当前源码或渲染现实与该项冲突 | E-GRAPH / S-GRAPH | **DRIFT** | relation normalization、lifecycle filter、broken-link validation |
| LHF-049 | Track Directory | Track directory lives in Knowledge Map region | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | active Track validation、Knowledge Map composition |
| LHF-050 | Track Directory | No separate large 3-column Track Card grid | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | active Track validation、Knowledge Map composition |
| LHF-051 | Track Directory | Track entry = plain text destination | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | active Track validation、Knowledge Map composition |
| LHF-052 | Track Directory | Low-weight Note count allowed | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | active Track validation、Knowledge Map composition |
| LHF-053 | Track Directory | No latest-modified timestamp in Track entry | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | active Track validation、Knowledge Map composition |
| LHF-054 | Track Directory | Track link focus/hover emphasizes matching graph region | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | active Track validation、Knowledge Map composition |
| LHF-055 | Track Directory | Track click enters Track page | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | active Track validation、Knowledge Map composition |
| LHF-056 | Track Directory | Active Tracks only | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | active Track validation、Knowledge Map composition |
| LHF-057 | Track Directory | Empty declared Tracks not shown | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | active Track validation、Knowledge Map composition |
| LHF-058 | Track Directory | Track directory wraps naturally on mobile | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | active Track validation、Knowledge Map composition |
| LHF-059 | Track Directory | No pill-like Track filter | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | active Track validation、Knowledge Map composition |
| LHF-060 | Track Directory | No selected persistent filter state v1 | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | active Track validation、Knowledge Map composition |
| LHF-061 | Search | Search non-sticky | 当前源码或渲染现实与该项冲突 | E-SEARCH / S-SEARCH | **DRIFT** | Section search index、homepage composition |
| LHF-062 | Search | Search is not homepage centerpiece | 当前源码或渲染现实与该项冲突 | E-SEARCH / S-SEARCH | **DRIFT** | Section search index、homepage composition |
| LHF-063 | Search | Search placed near Knowledge Map heading | 当前源码或渲染现实与该项冲突 | E-SEARCH / S-SEARCH | **DRIFT** | Section search index、homepage composition |
| LHF-064 | Search | Desktop compact width | 当前源码或渲染现实与该项冲突 | E-SEARCH / S-SEARCH | **DRIFT** | Section search index、homepage composition |
| LHF-065 | Search | Mobile full available width | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-066 | Search | Search title / Track / Section / tags | 当前源码或渲染现实与该项冲突 | E-SEARCH / S-SEARCH | **DRIFT** | Section search index、homepage composition |
| LHF-067 | Search | No body full-text | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-068 | Search | Anchored result list/popover | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-069 | Search | Query does not remove/hide whole Home | 当前源码或渲染现实与该项冲突 | E-SEARCH / S-SEARCH | **DRIFT** | Section search index、homepage composition |
| LHF-070 | Search | Arrow Up/Down navigates results | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-071 | Search | Enter opens selected result | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-072 | Search | Escape closes result list | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-073 | Search | Click outside closes | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-074 | Search | No result = simple `没有找到相关笔记` | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-075 | Search | No search illustrations | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-076 | Search | No external search service | 当前源码／渲染证据与该项一致 | E-SEARCH / S-SEARCH | **PASS** | Section search index、homepage composition |
| LHF-077 | Recent Knowledge | One region only | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-078 | Recent Knowledge | Heading = `最近知识` / `Recent Knowledge` | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | publishedAt/revisedAt lifecycle |
| LHF-079 | Recent Knowledge | Note appears at most once | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-080 | Recent Knowledge | First publication displays `发布` | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | publishedAt/revisedAt lifecycle |
| LHF-081 | Recent Knowledge | Substantive revision displays `修订` | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | publishedAt/revisedAt lifecycle |
| LHF-082 | Recent Knowledge | Maintenance edit invisible temporally | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | publishedAt/revisedAt lifecycle |
| LHF-083 | Recent Knowledge | Frameless rows | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | publishedAt/revisedAt lifecycle |
| LHF-084 | Recent Knowledge | Hairline separates rows | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | publishedAt/revisedAt lifecycle |
| LHF-085 | Recent Knowledge | Title primary | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-086 | Recent Knowledge | Excerpt secondary | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-087 | Recent Knowledge | Track / Section tertiary | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-088 | Recent Knowledge | Date low weight | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-089 | Recent Knowledge | Tags not displayed | 当前源码或渲染现实与该项冲突 | E-HOME / S-HOME / S-DATA | **DRIFT** | publishedAt/revisedAt lifecycle |
| LHF-090 | Recent Knowledge | No Card shadow | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-091 | Recent Knowledge | No hover lift | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-092 | Recent Knowledge | Hover/focus Title → Klein Blue | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-093 | Recent Knowledge | Whole text row may be destination | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-094 | Recent Knowledge | No explicit `打开笔记` CTA | 当前源码／渲染证据与该项一致 | E-HOME / S-HOME / S-DATA | **PASS** | publishedAt/revisedAt lifecycle |
| LHF-095 | Track Page | `← 返回 Learn` | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-096 | Track Page | H1 = Track name | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-097 | Track Page | Track description explains domain | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-098 | Track Page | Note count optional low-weight metadata | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-099 | Track Page | No Track color hero | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-100 | Track Page | Section navigation uses plain text | 当前源码或渲染现实与该项冲突 | E-TRACK / S-TRACK / S-DATA | **DRIFT** | stable ordering、Track catalog |
| LHF-101 | Track Page | No section pills | 当前源码或渲染现实与该项冲突 | E-TRACK / S-TRACK / S-DATA | **DRIFT** | stable ordering、Track catalog |
| LHF-102 | Track Page | Section link anchors to local grouping | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-103 | Track Page | Section heading visually stronger than metadata | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-104 | Track Page | Notes are frameless rows | 当前源码或渲染现实与该项冲突 | E-TRACK / S-TRACK / S-DATA | **DRIFT** | stable ordering、Track catalog |
| LHF-105 | Track Page | No numeric curriculum numbering | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-106 | Track Page | No progress | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-107 | Track Page | No `完成` | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-108 | Track Page | No local Graph v1 | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-109 | Track Page | No mandatory sequence | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-110 | Track Page | Neutral stable ordering, not recent-update ordering | 当前源码或渲染现实与该项冲突 | E-TRACK / S-TRACK / S-DATA | **DRIFT** | stable ordering、Track catalog |
| LHF-111 | Track Page | v1 ordering may use locale/title sort | 当前源码或渲染现实与该项冲突 | E-TRACK / S-TRACK / S-DATA | **DRIFT** | stable ordering、Track catalog |
| LHF-112 | Track Page | Future explicit local guidance requires real evidence | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-113 | Track Page | Bottom ending includes quiet `← 返回 Learn` | 当前源码或渲染现实与该项冲突 | E-TRACK / S-TRACK / S-DATA | **DRIFT** | stable ordering、Track catalog |
| LHF-114 | Track Page | No shared Footer required | 当前源码／渲染证据与该项一致 | E-TRACK / S-TRACK / S-DATA | **PASS** | stable ordering、Track catalog |
| LHF-115 | Public Note Header | Primary return = `← 返回 Learn` | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-116 | Public Note Header | Track shown as context | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-SCHEMA | **PASS** | lifecycle dates、frontmatter migration |
| LHF-117 | Public Note Header | Section shown when present | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-118 | Public Note Header | Track is clickable | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-SCHEMA | **PASS** | lifecycle dates、frontmatter migration |
| LHF-119 | Public Note Header | Section may link to Track section anchor | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-120 | Public Note Header | Context not represented as ontology breadcrumb | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-121 | Public Note Header | H1 highest information weight | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-SCHEMA | **PASS** | lifecycle dates、frontmatter migration |
| LHF-122 | Public Note Header | Excerpt / deck retained | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-SCHEMA | **PASS** | lifecycle dates、frontmatter migration |
| LHF-123 | Public Note Header | Show first publication date | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-124 | Public Note Header | Show revision date only after substantive revision | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-125 | Public Note Header | Do not display maintenance modified date | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-126 | Public Note Header | Do not display Mission | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-SCHEMA | **PASS** | lifecycle dates、frontmatter migration |
| LHF-127 | Public Note Header | Do not display Batch | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-SCHEMA | **PASS** | lifecycle dates、frontmatter migration |
| LHF-128 | Public Note Header | Do not display completion | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-SCHEMA | **PASS** | lifecycle dates、frontmatter migration |
| LHF-129 | Public Note Header | Do not display sourceUrl frontmatter | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-130 | Public Note Header | Tags not displayed by default | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-SCHEMA | **DRIFT** | lifecycle dates、frontmatter migration |
| LHF-131 | Reading | Body target ≈720–760px | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-132 | Reading | Header may be wider | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-133 | Reading | No Blog Paper clone | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-134 | Reading | No body Card | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-135 | Reading | No body shadow | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-136 | Reading | No decorative body border | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-137 | Reading | Direct Cream Gallery background | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-138 | Reading | H2/H3 preserve clear CJK hierarchy | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-139 | Reading | Paragraph line-height supports long Chinese reading | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-140 | Reading | Inline links use Klein Blue | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-141 | Reading | Code block local dark surface legal | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-142 | Reading | Code block no page-wide dark theme | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-143 | Reading | Tables horizontally overflow when necessary | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-144 | Reading | Images responsive | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-145 | Reading | Images no decorative shadow | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-146 | Reading | References stay in article body | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-147 | Reading | No automatic Public version history | 当前源码／渲染证据与该项一致 | E-NOTE / E-PREVIEW / S-CSS | **PASS** | mostly visual/renderer reuse |
| LHF-148 | Relations / Related Notes | DirectoryTree removed | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-149 | Relations / Related Notes | No parent/child indentation | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-150 | Relations / Related Notes | Related Notes derived from relation graph | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-151 | Relations / Related Notes | Use inbound + outbound links | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-152 | Relations / Related Notes | Deduplicate relation | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-153 | Relations / Related Notes | Region omitted when empty | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-154 | Relations / Related Notes | Desktop may use narrow sticky relation rail | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-155 | Relations / Related Notes | Rail does not contain hierarchy | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-156 | Relations / Related Notes | Mobile Related Notes moves after body | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-157 | Relations / Related Notes | Relation entry title primary | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-158 | Relations / Related Notes | Track context shown only when useful | 当前源码或渲染现实与该项冲突 | E-NOTE / S-NOTE / S-DATA | **DRIFT** | remove parent tree；derive inbound/outbound relations |
| LHF-159 | Relations / Related Notes | No typed relation badge | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-DATA | **PASS** | remove parent tree；derive inbound/outbound relations |
| LHF-160 | Relations / Related Notes | No recommendation algorithm | 当前源码／渲染证据与该项一致 | E-NOTE / S-NOTE / S-DATA | **PASS** | remove parent tree；derive inbound/outbound relations |
| LHF-161 | Wikilink | Wikilink remains visible internal link | 当前源码／渲染证据与该项一致 | E-WIKILINK / S-NOTE / S-CSS | **PASS** | direct destination semantics、preview simplification |
| LHF-162 | Wikilink | Desktop hover may show preview | 当前源码／渲染证据与该项一致 | E-WIKILINK / S-NOTE / S-CSS | **PASS** | direct destination semantics、preview simplification |
| LHF-163 | Wikilink | Keyboard focus may show preview | 当前源码／渲染证据与该项一致 | E-WIKILINK / S-NOTE / S-CSS | **PASS** | direct destination semantics、preview simplification |
| LHF-164 | Wikilink | Preview is supplemental | 当前源码或渲染现实与该项冲突 | E-WIKILINK / S-NOTE / S-CSS | **DRIFT** | direct destination semantics、preview simplification |
| LHF-165 | Wikilink | Click navigates immediately | 当前源码或渲染现实与该项冲突 | E-WIKILINK / S-NOTE / S-CSS | **DRIFT** | direct destination semantics、preview simplification |
| LHF-166 | Wikilink | Enter navigates immediately | 当前源码或渲染现实与该项冲突 | E-WIKILINK / S-NOTE / S-CSS | **DRIFT** | direct destination semantics、preview simplification |
| LHF-167 | Wikilink | Touch navigates immediately | 当前源码或渲染现实与该项冲突 | E-WIKILINK / S-NOTE / S-CSS | **DRIFT** | direct destination semantics、preview simplification |
| LHF-168 | Wikilink | No second `打开笔记` click | 当前源码或渲染现实与该项冲突 | E-WIKILINK / S-NOTE / S-CSS | **DRIFT** | direct destination semantics、preview simplification |
| LHF-169 | Wikilink | Preview title + short excerpt only | 当前源码或渲染现实与该项冲突 | E-WIKILINK / S-NOTE / S-CSS | **DRIFT** | direct destination semantics、preview simplification |
| LHF-170 | Wikilink | Preview no unnecessary shadow strength | 当前源码或渲染现实与该项冲突 | E-WIKILINK / S-NOTE / S-CSS | **DRIFT** | direct destination semantics、preview simplification |
| LHF-171 | Wikilink | Reduced motion removes transition only | 当前源码／渲染证据与该项一致 | E-WIKILINK / S-NOTE / S-CSS | **PASS** | direct destination semantics、preview simplification |
| LHF-172 | Admin / Preview | Admin remains module-local | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-173 | Admin / Preview | No Global Admin implication | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-174 | Admin / Preview | Admin rows may be functional bounded surfaces | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-175 | Admin / Preview | Show lifecycle state | 当前源码或渲染现实与该项冲突 | E-ADMIN / E-PREVIEW / S-ADMIN | **DRIFT** | lifecycle、external adapter、historical destination gate |
| LHF-176 | Admin / Preview | Draft action = Preview / Publish | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-177 | Admin / Preview | Remove `完成小节` | 当前源码或渲染现实与该项冲突 | E-ADMIN / E-PREVIEW / S-ADMIN | **DRIFT** | lifecycle、external adapter、historical destination gate |
| LHF-178 | Admin / Preview | Remove completion ID | 当前源码或渲染现实与该项冲突 | E-ADMIN / E-PREVIEW / S-ADMIN | **DRIFT** | lifecycle、external adapter、historical destination gate |
| LHF-179 | Admin / Preview | Remove learning progress | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-180 | Admin / Preview | Existing retract semantics superseded | 当前源码或渲染现实与该项冲突 | E-ADMIN / E-PREVIEW / S-ADMIN | **DRIFT** | lifecycle、external adapter、historical destination gate |
| LHF-181 | Admin / Preview | Post-publication destructive action does not restore Draft semantics | 当前源码或渲染现实与该项冲突 | E-ADMIN / E-PREVIEW / S-ADMIN | **DRIFT** | lifecycle、external adapter、historical destination gate |
| LHF-182 | Admin / Preview | Supersede / Withdraw action enablement requires destination migration gate | 当前实现不满足；且需先完成历史 destination / production preflight | E-ADMIN / E-PREVIEW / S-ADMIN | **BLOCKED** | lifecycle、external adapter、historical destination gate |
| LHF-183 | Admin / Preview | Preview noindex | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-184 | Admin / Preview | Preview no-store | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-185 | Admin / Preview | Preview requires auth | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-186 | Admin / Preview | Preview shares public renderer | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-187 | Admin / Preview | Preview banner clearly marks private state | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-188 | Admin / Preview | Preview returns to Learn Admin | 当前源码／渲染证据与该项一致 | E-ADMIN / E-PREVIEW / S-ADMIN | **PASS** | lifecycle、external adapter、historical destination gate |
| LHF-189 | Responsive / Accessibility | Home becomes single-column naturally | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-190 | Responsive / Accessibility | Graph reflows, not horizontally clipped as desktop canvas | 当前源码或渲染现实与该项冲突 | E-MOBILE / E-INTERACTION / S-CSS | **DRIFT** | new Graph reflow、relation reflow |
| LHF-191 | Responsive / Accessibility | Track directory wraps | 当前源码或渲染现实与该项冲突 | E-MOBILE / E-INTERACTION / S-CSS | **DRIFT** | new Graph reflow、relation reflow |
| LHF-192 | Responsive / Accessibility | Section navigation wraps | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-193 | Responsive / Accessibility | Note relation rail moves after body | 当前源码或渲染现实与该项冲突 | E-MOBILE / E-INTERACTION / S-CSS | **DRIFT** | new Graph reflow、relation reflow |
| LHF-194 | Responsive / Accessibility | No mobile Directory drawer | 当前源码或渲染现实与该项冲突 | E-MOBILE / E-INTERACTION / S-CSS | **DRIFT** | new Graph reflow、relation reflow |
| LHF-195 | Responsive / Accessibility | No hover simulation | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-196 | Responsive / Accessibility | Node visible labels retained | 当前源码或渲染现实与该项冲突 | E-MOBILE / E-INTERACTION / S-CSS | **DRIFT** | new Graph reflow、relation reflow |
| LHF-197 | Responsive / Accessibility | Node touch targets enlarged | 当前源码或渲染现实与该项冲突 | E-MOBILE / E-INTERACTION / S-CSS | **DRIFT** | new Graph reflow、relation reflow |
| LHF-198 | Responsive / Accessibility | Focus visible on every interactive node | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-199 | Responsive / Accessibility | Track identity not color-only | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-200 | Responsive / Accessibility | Relation identity not color-only | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-201 | Responsive / Accessibility | Search preserves keyboard semantics | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-202 | Responsive / Accessibility | Overlay focus behavior valid | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-203 | Responsive / Accessibility | Reduced motion preserves graph understanding | 当前源码／渲染证据与该项一致 | E-MOBILE / E-INTERACTION / S-CSS | **PASS** | new Graph reflow、relation reflow |
| LHF-204 | Responsive / Accessibility | No essential hover-only information | Mobile 当前隐藏 Graph map，关系与 node labels 不可用；不是 hover simulation，但产生同等 capability 缺失 | E-MOBILE / E-INTERACTION / S-CSS | **DRIFT** | new Graph reflow、relation reflow |
| LHF-205 | Empty / Ending | 0 corpus is valid | 当前源码／渲染证据与该项一致 | S-HOME / S-DATA / E-HOME | **PASS** | 0-corpus acceptance、post-migration rendering |
| LHF-206 | Empty / Ending | Empty copy = `暂时还没有公开的学习笔记。` | 当前源码或渲染现实与该项冲突 | S-HOME / S-DATA / E-HOME | **DRIFT** | 0-corpus acceptance、post-migration rendering |
| LHF-207 | Empty / Ending | No fake graph | 当前源码或渲染现实与该项冲突 | S-HOME / S-DATA / E-HOME | **DRIFT** | 0-corpus acceptance、post-migration rendering |
| LHF-208 | Empty / Ending | No fake Track | 当前源码／渲染证据与该项一致 | S-HOME / S-DATA / E-HOME | **PASS** | 0-corpus acceptance、post-migration rendering |
| LHF-209 | Empty / Ending | No CTA | 当前源码／渲染证据与该项一致 | S-HOME / S-DATA / E-HOME | **PASS** | 0-corpus acceptance、post-migration rendering |
| LHF-210 | Empty / Ending | No onboarding | 当前源码／渲染证据与该项一致 | S-HOME / S-DATA / E-HOME | **PASS** | 0-corpus acceptance、post-migration rendering |
| LHF-211 | Empty / Ending | Home ending may be natural whitespace | 当前源码／渲染证据与该项一致 | S-HOME / S-DATA / E-HOME | **PASS** | 0-corpus acceptance、post-migration rendering |
| LHF-212 | Empty / Ending | Track ending = return Learn | 当前源码或渲染现实与该项冲突 | S-HOME / S-DATA / E-HOME | **DRIFT** | 0-corpus acceptance、post-migration rendering |
| LHF-213 | Empty / Ending | Note ending = related navigation + return Learn | 当前源码或渲染现实与该项冲突 | S-HOME / S-DATA / E-HOME | **DRIFT** | 0-corpus acceptance、post-migration rendering |
| LHF-214 | Empty / Ending | Shared Footer remains Revalidate | 当前源码／渲染证据与该项一致 | S-HOME / S-DATA / E-HOME | **PASS** | 0-corpus acceptance、post-migration rendering |
