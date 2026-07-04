# ADR-002: Blog Metadata Storage — KV Bridge vs D1 Migration

> Status: **Accepted**
> Date: 2026-07-05
> Deciders: Phase 3 architecture agent + 木下

---

## Context

Blog posts are authored as Markdown files with frontmatter (Astro Content Collections). The Home page needs blog metadata (title, date, excerpt, etc.) for its mixed timeline. Should blog metadata live only in Markdown frontmatter, or be migrated into D1?

## Options

### A: KV Bridge (build-time export)

```
Markdown frontmatter → getCollection() → blog-metadata.json → KV
Worker reads KV for Home aggregation
```

- Blog publishing flow stays unchanged (Git push → CF Pages deploy)
- No double-write problem
- KV read is fast and cheap

### B: D1 migration

- Blog metadata duplicated into D1 `blog_posts` table
- Home aggregation queries D1 directly
- Risk of frontmatter/D1 drift

## Decision

**Chose A — KV Bridge.**

## Rationale

1. **Single source of truth**: Markdown frontmatter is the authoring source. Duplicating into D1 creates sync risk.
2. **Git-driven publishing preserved**: 木下's established workflow (write Markdown → Git push → auto deploy) stays unchanged. No extra D1 write step.
3. **Adequate consistency**: Astro build → KV write happens once per deploy. Blog metadata changes only when 木下 pushes new content — exactly when a deploy happens.
4. **Simplicity**: One JSON blob in KV covers the Home aggregation use case.

## Consequences

- `astro.config.mjs` needs a build integration or deploy hook to write KV
- Worker `/api/home` reads KV alongside D1 (blog from KV, feed from D1, learn from collection, projects from static)
- KV value must fit under 25MB limit (blog metadata for a personal site: kilobytes)
