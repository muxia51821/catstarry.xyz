**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# P03: New Project Onboarding Template

## Parent

docs/final-requirements-projects.json - Goal G003

## What to build

Provide a template and workflow for adding new projects:
- README in .scratch/projects/ documenting the process
- Data template for project index (fields: name, description, url, screenshot, tags, date)
- Workflow: notify AI agent -> agent adds index entry -> Git push -> auto-deploy
- Screenshot spec: dimensions, format, storage location

## Acceptance criteria

- [ ] README documents the 4-step workflow
- [ ] Data template provided with all required fields and examples
- [ ] Screenshot spec defined (dimensions, format, storage location)
- [ ] Existing poker project used as reference example

## Blocked by

- P01: needs the data format settled from P01 implementation
