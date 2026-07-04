# ADR-004: Feed Post Visibility — Two-State vs Three-State Schema

> Status: **Accepted**
> Date: 2026-07-05
> Deciders: Phase 3 architecture agent (escalated from Phase 2 inconsistency)

---

## Context

Phase 2 produced two conflicting schema definitions for the feed_posts table:

- **PRD** (`.scratch/feed/issue.md`): `status TEXT — "public" / "hidden" / "deleted"` (three states)
- **Issue F01** (`.scratch/feed/01-schema-worker/issue.md`): `visibility TEXT — "public" | "private"` (two states)

Issue F07 (content management) additionally specifies that deletion is physical (`DELETE FROM posts WHERE id = ?`), not soft-delete.

This ADR resolves the conflict at the architecture level before Phase 5 implementation.

## Options

### A: Two-state visibility (`public` | `private`)

- `visibility = "private"` is the "hidden" state (仅我可见)
- Deletion is `DELETE` — physical, irreversible
- Matches issue F01 + F07

### B: Three-state status (`public` | `hidden` | `deleted`)

- Soft-delete keeps data in DB
- Matches PRD issue.md

## Decision

**Chose A — Two-state visibility + physical delete.**

## Rationale

1. **Issue F07 is authoritative**: F07 explicitly specifies `DELETE FROM posts WHERE id = ?` as the deletion mechanism and "不可逆" as a hard constraint. A three-state schema with soft-delete contradicts this.
2. **Simplicity**: Two states match the UX — a post is either visible or hidden. "Deleted" is not a state, it is the absence of the record.
3. **Privacy**: Physical deletion aligns with 木下's stated preference that deleted content should not exist anywhere.
4. **Phase 5 alignment**: F01, F02, F03, and F07 all use `visibility` as the field name and two-state logic. Only the PRD summary uses three-state.

## Consequences

- PRD (`.scratch/feed/issue.md`) has a documentation error — the schema section should say `visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private'))`
- Phase 5 developers should treat F01 schema as authoritative over the PRD summary
