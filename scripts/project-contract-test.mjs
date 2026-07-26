import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  isCredentialFreeHttpsUrl,
  isIsoCalendarDate,
  selectVisibleProjects,
} from '../src/lib/project-selection.mjs';

const projects = JSON.parse(await readFile('src/data/projects/index.json', 'utf8'));
const publicProjects = projects.filter((project) => project.visibility === 'public');
assert.ok(publicProjects.length > 0 && publicProjects.length <= 2, 'Projects must expose one or two current public entries');
assert.equal(new Set(projects.map((project) => project.projectId)).size, projects.length, 'projectId values must be unique');
assert.deepEqual(selectVisibleProjects([]), [], 'Projects must preserve the explicit empty state');
assert.equal(isIsoCalendarDate('2026-02-31'), false);
assert.equal(isIsoCalendarDate('2026-02-28'), true);
assert.equal(isCredentialFreeHttpsUrl('https://user:password@example.com/'), false);
assert.deepEqual(
  selectVisibleProjects([
    ...projects,
    { ...projects[0], projectId: 'older-contract', date: '2000-01-01' },
  ]).map((project) => project.projectId),
  publicProjects
    .toSorted((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 2)
    .map((project) => project.projectId),
  'Projects must show at most the two newest public entries',
);

for (const project of publicProjects) {
  assert.match(project.url, /^https:\/\//);
  assert.match(project.screenshot, /^\/assets\/projects\/[a-z0-9-]+\.png$/, `${project.projectId} needs a real screenshot`);
  const bytes = await readFile(`public${project.screenshot}`);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${project.projectId} screenshot must be a PNG`);
  assert.ok(bytes.readUInt32BE(16) >= 1200, `${project.projectId} screenshot is too narrow`);
  assert.ok(bytes.readUInt32BE(20) >= 700, `${project.projectId} screenshot is too short`);
}

console.log('Projects data and screenshot contracts passed.');
