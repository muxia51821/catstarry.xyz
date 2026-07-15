**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-15

# P03: New Project Onboarding Template

## Parent

docs/final-requirements-projects.json - Goal G003

## What to build

Provide a template and workflow for adding new projects:
- README in .scratch/projects/ documenting the process
- Data template for project index (fields: name, description, url, screenshot, tags, date)
- Workflow: notify AI agent -> agent adds index entry -> Git push -> auto-deploy
- Screenshot spec: dimensions, format, storage location
- Explicit material-update marker: 木下确认一次项目更新属于实质更新时，AI 在索引记录中加入稳定 update ID，创建一条 Feed 公开足迹

## Acceptance criteria

- [ ] README documents the 4-step workflow
- [ ] Data template provided with all required fields and examples
- [ ] Screenshot spec defined (dimensions, format, storage location)
- [ ] 不使用旧 Poker 项目或历史项目作为回填/足迹参考
- [ ] 实质更新仅在木下显式标记后产生一条 Feed 公开足迹；普通索引编辑、保存和重复部署不产生足迹

## Blocked by

- P01: needs the data format settled from P01 implementation
