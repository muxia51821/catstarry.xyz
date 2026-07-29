current main HEAD: 4841b4f

staging candidate: 4b41e4a

historical RC1 merge point: a524b0d

active module: production release decision / preflight gate

owner: 木下 + production release session (not started)

completed:

- Phase 5 implementation
- Phase 6 automated technical acceptance
- RC1 merge to main
- isolated staging D1 / KV / R2 created
- Feed, Finance API, main Astro Worker, and Finance Pages deployed to staging
- staging migrations applied and reviewed
- staging.catstarry.xyz bound; main site, /api/feed, and /activity-signals.json verified HTTP 200
- f-staging.catstarry.xyz DNS verification resolved
- f-staging.catstarry.xyz A / AAAA resolution and HTTPS verified
- Finance staging root returns HTTP 200
- f-staging.catstarry.xyz/api/health reaches Finance API router and returns JSON not_found error envelope; /api/health is not an existing business route and is not a routing failure
- npm run test:finance:site passed
- npm run test:finance:http passed
- staging-only test account configured in FINANCE_AUTH_KV_STAGING with 7 day TTL; credential value is intentionally not recorded here
- browser staging smoke verified anonymous session, unauthenticated protected API 401, login, session, /api/holdings, /api/market, logout, and post-logout protected API 401
- cookie attributes verified: host-only, HttpOnly, Secure, SameSite=Strict
- Finance frontend API requests verified as https://f-staging.catstarry.xyz/api/*
- UI login dashboard and logout return-to-login verified; no console error / exception
- main site to Finance and Finance to main navigation verified
- main site DOM does not include Finance domain
- direct cross-origin main site call to Finance API is rejected by CORS as designed
- Phase 6 final manual acceptance completed: Home, Blog, Feed, Learn, Projects, Finance login page / dashboard empty-data display, main site and Finance paths, desktop and mobile visuals are acceptable
- Cloudflare VPN / challenge only affects automated screenshots and is not a product acceptance failure
- Phase 7 staging gate closed; staging is ready for production release decision

blocked by:

- production release decision
- production preflight
- Wrangler 4.113.0 trigger migration remote batch limitation requires separate upgrade / verification handling before production

deferred:

- production release decision
- Wrangler 4.113.0 trigger migration remote batch limitation; production preflight needs separate upgrade / verification handling
- selected planet assets replacement and visual tuning after launch
- Finance historical real-data migration, real market provider, full dual-role business experience, and annual workflow
- other real-data-driven business differences

next action: decide whether to start production release; if yes, run production preflight before touching production resources
