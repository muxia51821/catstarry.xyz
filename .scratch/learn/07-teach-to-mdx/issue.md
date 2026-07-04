**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L07: Teach-Skill Lesson HTML -> MDX Extraction

## Parent

docs/final-requirements-learn.json - Goal G006

## What to build

A script or CLI tool that converts teach-skill generated lesson HTML into MDX:
- Parse the lesson HTML output from the teach skill
- Extract: title, content body, code blocks, interactive component placeholders
- Generate ASCII slug from Chinese title (AI-assisted, see L13)
- Write output to content/learn/{track}/{slug}.mdx with proper frontmatter
- Mark interactive components (quizzes, simulators) with placeholder markers

## Acceptance criteria

- [ ] Script reads a teach lesson HTML file and outputs an MDX file
- [ ] Frontmatter includes: title, track, tags, excerpt, draft: true
- [ ] Code blocks preserved with language annotations
- [ ] Interactive components replaced with <!-- INTERACTIVE: type --> markers
- [ ] Output file placed in correct content/learn/{track}/ directory

## Blocked by

- L05: needs the learn schema to know what frontmatter fields to populate
- L06: new notes should default to draft: true, published via admin panel
