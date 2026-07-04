**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# f.catstarry.xyz - Product Requirement Document

> **Status**: ready-for-agent
> **Created**: 2026-07-04
> **Source**: docs/final-requirements-finance.json
> **Phase**: Phase 2

---

## Problem Statement

Admin and cati co-manage a family investment portfolio, currently using Excel for
all trade recording, holdings tracking, and snapshots. Excel has these problems:
- No real-time market prices or P&L visibility
- PE temperature judgment requires manual data lookup
- Position deviation warnings rely on manual calculation
- Excess return split calculation (Modified Dietz + High-Water Mark) is error-prone
- cati can only view on computer, no mobile access
- Annual review and signature rely on paper/WeChat confirmation

A web dashboard is needed to replace Excel as the daily investment management tool,
deployed on an independent subdomain. Admin has read-write access, cati read-only.

## Solution

f.catstarry.xyz - Cloudflare full-stack (Pages + Workers + D1 + KV) independent
Astro project:
- Migrate all historical Excel data to D1
- Real-time market data (15-min delay) + daily PE-TTM auto-fetch
- PE Temperature Gauge with 5-zone auto-judgment + operation suggestions
- Position deviation real-time alerts + rebalancing suggestions
- Three-level circuit breaker with auto-trigger + cati notification
- Annual excess return split auto-calculation (Modified Dietz)
- Annual review signature + Excel export for archival
- Password auth (two tiers: admin rw / cati ro)

## User Stories

1. As admin, I want to import all historical Excel data into the dashboard so Excel becomes archive-only.
2. As admin, I want to quickly record trades (date/ticker/direction/quantity/price/category) with continuous entry mode.
3. As admin, I want to see real-time prices and P&L for my holdings without manually checking market websites.
4. As admin, I want a PE temperature gauge that auto-judges market conditions and suggests actions.
5. As admin, I want position deviation warnings and rebalancing suggestions when allocation drifts.
6. As admin, I want automatic circuit breaker protection when drawdown reaches thresholds.
7. As admin, I want year-end excess return split auto-calculated, with cati confirmation before deduction.
8. As admin, I want to write annual summary, get cati signature, and export full-year Excel.
9. As cati, I want to log in via mobile browser and view investment status (read-only).
10. As cati, I want to confirm monthly review on the 1st of each month.
11. As cati, I want to see the full excess split calculation process for transparency.
12. As cati, I want to be notified when circuit breaker triggers.

## Implementation Decisions

### Architecture
- Independent subdomain f.catstarry.xyz, separate CF Pages project
- Auth: password login, two tiers, session cookie 12h TTL
- Storage: D1 (trades/holdings/snapshots/market_data) + KV (sessions/config/rate-limit)
- Market data: CF Worker Cron Trigger fetching free A-share API

### Core Calculations

**Modified Dietz Method:**
R = (EV - BV - CF) / (BV + sum(CF_i x W_i))
where W_i = (T - t_i) / T

**High-Water Mark:**
HWM = max(historical max net value) x 1.03
Excess split only calculated when current net value > HWM

**PE Temperature 5-Zone** (SSE 300 PE-TTM, thresholds by historical percentile):
| Zone | PE Range | Color | Suggestion |
|------|----------|-------|------------|
| Freeze | < 10 | Blue | Aggressively add position |
| Low | 10-12 | Green | Moderately add position |
| Normal | 12-15 | Yellow | Normal DCA |
| High | 15-18 | Orange | Reduce investment |
| Overheat | > 18 | Red | Pause or reduce |

**Three-Level Circuit Breaker:**
| Level | Trigger | Action | Notification |
|-------|---------|--------|-------------|
| Yellow | Drawdown > 10% | Pause new active positions | Dashboard banner |
| Red | Drawdown > 20% | Force index-only DCA | Banner + cati |
| Black | cati objection | Full pause | Admin |

## Testing Decisions

- Modified Dietz and PE temperature calculations: pure functions, unit-tested with known cases
- Historical data migration: test environment first, row-by-row Excel comparison
- Circuit breaker: integration tests simulating drawdown scenarios
- Permission tests: cati account attempting write operations -> 403

## Out of Scope

- Salary auto-invest sync (mentioned in handoff but not clarified)
- Real-time prices (15-min delay acceptable)
- More index PE data (only SSE 300/500/1000 in phase 1)
- Watchlist tracking
- Multi-account support
