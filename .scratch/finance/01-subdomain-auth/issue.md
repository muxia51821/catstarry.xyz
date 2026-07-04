**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F01: f.catstarry.xyz - Independent Subdomain + Password Auth

## Parent

docs/final-requirements-finance.json - infrastructure

## What to build

Create an independent Astro project deployed at f.catstarry.xyz:
- New Astro project (sibling to main catstarry.xyz)
- DNS: f.catstarry.xyz CNAME -> CF Pages (separate Pages project)
- Password-based auth with two access levels: admin read-write / cati read-only
- Session: cookie-based, 12h TTL
- Completely invisible from main site Home page

## Acceptance criteria

- [ ] f.catstarry.xyz resolves to a CF Pages deployment
- [ ] Password login page with two credential sets
- [ ] Admin login -> full read-write access
- [ ] cati login -> read-only access
- [ ] Session persists across page navigation
- [ ] No link or mention on catstarry.xyz Home

## Blocked by

None - can start immediately
