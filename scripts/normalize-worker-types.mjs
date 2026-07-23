import { readFile, writeFile } from 'node:fs/promises';

for (const path of process.argv.slice(2)) {
  const source = await readFile(path, 'utf8');
  const normalized = source.replace(/[ \t]+(?=\r?$)/gm, '');
  if (normalized !== source) await writeFile(path, normalized, 'utf8');
}
