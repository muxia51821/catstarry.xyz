**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L05: Learn Content Schema - content/config.ts

## Parent

docs/final-requirements-learn.json - infrastructure

## What to build

Extend Astro content collection schema to define the learn collection with fields:
title, track, section (optional), tags, draft (default false), publishDate,
lastModified, excerpt (optional). Schema co-exists with existing blog collection.

## Acceptance criteria

- [ ] content/config.ts defines the learn collection with required fields
- [ ] draft field defaults to false and filters draft notes from production builds
- [ ] track field is required and validated
- [ ] lastModified drives sorting on Home timeline and /learn track list
- [ ] Schema co-exists with the existing blog collection

## Blocked by

None - schema definition is a prerequisite for L01-L04
