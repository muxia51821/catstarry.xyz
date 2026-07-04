# ADR-003: Worker Count — 2 Workers vs Per-Module Workers

> Status: **Accepted**
> Date: 2026-07-05
> Deciders: Phase 3 architecture agent + 木下

---

## Context

The site has two distinct API domains: public content APIs (feed CRUD, blog views, auth, home aggregation, learn admin) and financial APIs (trades, holdings, market data, PE, circuit breaker). How many Workers should serve these?

## Options

### A: 2 Workers — feed-api (all public) + finance-api (financial)

- Public API Worker serves /api/feed, /api/views, /api/auth, /api/home, /api/learn
- Finance Worker serves /api/trades, /api/holdings, /api/market, /api/pe, /api/circuit
- Shared code in top-level `shared/`

### B: Per-module Workers — feed-api, auth-api, learn-api, finance-api

- 4-5 Workers, each focused on one domain
- Maximum isolation

## Decision

**Chose A — 2 Workers.**

## Rationale

1. **Cold start**: More Workers = more cold starts. A combined public API Worker stays warm from /api/views traffic.
2. **Shared auth**: /feed and /learn/admin share the same auth session. Combining them avoids cross-Worker auth coordination.
3. **Cron boundary**: Finance Worker is the only one needing Cron Triggers (market data fetch, R2 cleanup). Separating it from the public API is the natural seam.
4. **Deployment independence**: Finance Worker can be updated without risking public site availability, and vice versa.

## Consequences

- `workers/feed-api/src/routes/` contains 5 route files — manageable
- `shared/auth.ts` is imported by both Workers
- `workers/finance-api/src/tasks/` isolates Cron handler logic
