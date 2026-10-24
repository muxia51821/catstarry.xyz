import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  isCredentialFreeHttpsUrl,
  isIsoCalendarDate,
  selectVisibleProjects,
} from '../src/lib/project-selection.mjs';

const projects = JSON.parse(await readFile('src/data/projects/index.json', 'utf8'));
const publicProjects = projects.filter((project) => project.visibility === 'public');
assert.ok(publicProjects.length > 0, 'Projects must expose current public entries');
assert.equal(new Set(projects.map((project) => project.projectId)).size, projects.length, 'projectId values must be unique');
assert.deepEqual(selectVisibleProjects([]), [], 'Projects must preserve the explicit empty state');
assert.equal(isIsoCalendarDate('2026-02-31'), false);
assert.equal(isIsoCalendarDate('2026-02-28'), true);
assert.equal(isCredentialFreeHttpsUrl('https://user:password@example.com/'), false);
const projectsWithOlderEntry = [
  ...projects,
  { ...projects[0], projectId: 'older-contract', date: '2000-01-01' },
];
assert.deepEqual(
  selectVisibleProjects(projectsWithOlderEntry).map((project) => project.projectId),
  projectsWithOlderEntry
    .filter((project) => project.visibility === 'public')
    .toSorted((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .map((project) => project.projectId),
  'Projects must show every public entry in newest-first order',
);

for (const project of publicProjects) {
  assert.match(project.url, /^https:\/\//);
  assert.match(project.screenshot, /^\/assets\/projects\/[a-z0-9-]+\.(?:webp|png|jpe?g)$/, `${project.projectId} needs a real screenshot`);
  const { format, width, height } = await sharp(`public${project.screenshot}`).metadata();
  const extension = project.screenshot.split('.').at(-1).replace('jpg', 'jpeg');
  assert.equal(format, extension, `${project.projectId} screenshot format must match its extension`);
  assert.ok(width >= 1200, `${project.projectId} screenshot is too narrow`);
  assert.ok(height >= 700, `${project.projectId} screenshot is too short`);
}

console.log('Projects data and screenshot contracts passed.');
