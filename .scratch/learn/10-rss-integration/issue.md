**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L10: Learn + Blog Unified RSS Feed

## Parent

docs/final-requirements-learn.json - Goal G004 (RSS)

## What to build

Extend the existing RSS feed to include published learn notes alongside blog:
- Unified feed at /blog/rss.xml (or create /rss.xml that aggregates both)
- Each item includes: title, link, description/excerpt, pubDate
- Only published content (no drafts, no feed notes)
- Ordered by date, interleaved blog and learn

## Acceptance criteria

- [ ] RSS feed includes both blog posts and published learn notes
- [ ] Learn note items have: title, link, excerpt, pubDate
- [ ] Draft notes excluded
- [ ] Feed notes excluded (not in RSS scope per requirements)
- [ ] link rel="alternate" in head points to the unified feed

## Blocked by

- L05: needs learn schema to know which notes are published
