**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L11: Draft Visibility Rules - Zero Exposure

## Parent

docs/final-requirements-learn.json - Goal G003

## What to build

Enforce comprehensive draft visibility rules across the entire site:
- Draft learn notes MUST NOT appear in: /learn track list, Home timeline,
  RSS feed, search results, sitemap
- Draft notes ONLY visible on /learn/admin (L06) to logged-in user
- Direct URL access to draft note -> 404 (not 403 - no information leak)
- getCollection("learn") filters draft: true in production builds

## Acceptance criteria

- [ ] getCollection("learn") excludes draft notes in production
- [ ] Direct URL access to draft note -> 404
- [ ] Draft notes absent from Home timeline
- [ ] Draft notes absent from RSS feed
- [ ] Draft notes absent from search index
- [ ] Draft notes absent from sitemap.xml
- [ ] Draft notes visible in /learn/admin only

## Blocked by

- L05: needs schema with draft field
- L06: admin panel must be accessible for verification
