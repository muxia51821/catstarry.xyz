# Phase 5 Dispatch

base commit: `09e3103 docs: close shared infrastructure F and set Home as next module`

active module: Home production implementation

owner: Phase 5 Home module Agent; Phase 5 main execution / integration thread owns shared files

allowed files:

- Home module: `src/pages/index.astro`, `src/components/home/**`, `scripts/home-production-regression.mjs`, Home-only assets and tests
- Shared files only by main execution / integration thread: `package.json`, `src/layouts/Base.astro`, shared contracts, migrations, auth / CORS, CI/CD, production deploy config

blocked by: none recorded in governance

next action: Home module thread continues implementation; main execution / integration thread must review and own any shared-file changes before merge
