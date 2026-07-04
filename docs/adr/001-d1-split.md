# ADR-001: D1 Database Split — 1 vs 2 Databases

> Status: **Accepted**
> Date: 2026-07-05
> Deciders: Phase 3 architecture agent + 木下

---

## Context

catstarry.xyz has two distinct domains: public-facing content (blog, feed, learn, projects, home) and private financial data (trades, holdings, market data). Both need structured SQL storage via Cloudflare D1.

**Question**: One shared D1 database or two separate ones?

## Options

### A: One shared D1 (`catstarry-db`)

- All tables in one database — feed_posts, blog_views, trades, holdings, market_data
- Cross-module Home aggregation queries simpler (no cross-DB joins needed)
- Fewer CF resources to manage

### B: Two D1 (`catstarry-db` + `finance-db`)

- Finance data physically isolated from public content
- Security boundary: a Worker compromise on the public API cannot leak financial data
- Independent backup/restore cycles

## Decision

**Chose B — Two D1 databases.**

## Rationale

1. **Data sensitivity asymmetry**: Financial data (trades, holdings, P&L) is significantly more sensitive than blog views or feed posts. Physical isolation is warranted.
2. **No cross-DB queries needed**: Home aggregation only reads feed/blog/learn/projects — never finance. The two domains have zero query overlap.
3. **Independent lifecycle**: Finance DB may need different backup cadence or data retention policies.
4. **Cost**: Cloudflare D1 free tier covers both databases with room to spare.

## Consequences

- Two `wrangler.toml` bindings to configure
- Two `schema.sql` files to maintain
- Finance Worker must use separate `env.DB` binding
