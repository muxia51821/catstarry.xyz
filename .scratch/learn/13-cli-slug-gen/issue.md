**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L13: CLI Slug Generator - Chinese Title -> ASCII Slug

## Parent

docs/final-requirements-learn.json - Goal G006

## What to build

A CLI script that generates ASCII slugs from Chinese titles for learn notes:
- Input: Chinese title string
- Output: ASCII slug (e.g. typescript-type-gymnastics)
- Strategy: detect English words -> keep as-is; Chinese -> AI-assisted
  translation or pinyin fallback
- Duplicate detection: if slug already exists, append -2, -3, etc.

## Acceptance criteria

- [ ] CLI accepts a Chinese title string and outputs an ASCII slug
- [ ] English portions preserved
- [ ] Chinese portions converted via AI translation or pinyin
- [ ] Duplicate detection: append -N suffix if slug exists
- [ ] Output is lowercase, hyphens only, no special chars
- [ ] Integrates with L07 pipeline

## Blocked by

- L01: slug format impacts note file naming and routing
