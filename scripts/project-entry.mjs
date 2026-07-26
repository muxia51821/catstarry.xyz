import { readFile, writeFile } from 'node:fs/promises';
import {
  isCredentialFreeHttpsUrl,
  isIsoCalendarDate,
} from '../src/lib/project-selection.mjs';

const [inputPath, targetPath = 'src/data/projects/index.json'] = process.argv.slice(2);
if (!inputPath) throw new Error('Usage: npm run project:add -- <entry.json> [index.json]');

const entry = JSON.parse(await readFile(inputPath, 'utf8'));
const index = JSON.parse(await readFile(targetPath, 'utf8'));
validate(entry, index);
index.push(entry);
await writeFile(targetPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
console.log(`Added ${entry.projectId} to ${targetPath}.`);

function validate(entry, index) {
  if (!entry || typeof entry !== 'object') throw new Error('Project entry must be an object');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.projectId ?? '')) throw new Error('projectId must be lowercase ASCII');
  if (index.some((project) => project.projectId === entry.projectId)) throw new Error(`Duplicate projectId: ${entry.projectId}`);
  if (typeof entry.name !== 'string' || !entry.name.trim()) throw new Error('name is required');
  if (typeof entry.description !== 'string' || !entry.description.trim()) throw new Error('description is required');
  if (!isCredentialFreeHttpsUrl(entry.url)) throw new Error('url must use credential-free HTTPS');
  if (!/^\/assets\/projects\/[a-z0-9-]+\.(?:webp|png|jpe?g)$/.test(entry.screenshot ?? '')) {
    throw new Error('screenshot must be a real image under /assets/projects/');
  }
  if (!Array.isArray(entry.tags) || entry.tags.length === 0) throw new Error('tags are required');
  if (!isIsoCalendarDate(entry.date)) throw new Error('date must be a valid YYYY-MM-DD calendar date');
  if (entry.visibility !== 'draft' && entry.visibility !== 'public') throw new Error('visibility must be draft or public');
  if ('updateId' in entry && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.updateId)) {
    throw new Error('updateId must be a stable lowercase ASCII marker');
  }
  if (entry.updateId && index.some((project) => project.updateId === entry.updateId)) {
    throw new Error(`Duplicate updateId: ${entry.updateId}`);
  }
}
