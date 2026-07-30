import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const planetsRoot = path.join(root, 'docs', 'design', 'assets', 'planets');
const sourceDir = path.join(planetsRoot, 'source');
const selectedDir = path.join(planetsRoot, 'selected');
const componentFiles = [
  path.join(root, 'src', 'components', 'home', 'HomeExperience.astro'),
  path.join(root, 'src', 'components', 'home', 'home-client.ts'),
];

const planets = ['about', 'blog', 'feed', 'learn', 'projects'];
const roles = {
  overview: { width: 1254, height: 1254 },
  focus: { width: 1120, height: 840 },
  mobile: { width: 640, height: 640 },
};

function selectedFilename(planet, role) {
  return `planet-${planet}-${role}.webp`;
}

async function digest(filename) {
  return createHash('sha256').update(await readFile(filename)).digest('hex');
}

async function verifySource(planet) {
  const filename = path.join(sourceDir, `${planet}-overview.png`);
  const metadata = await sharp(filename).metadata();
  assert.equal(metadata.format, 'png', `${planet} source must be PNG`);
  assert.equal(metadata.width, 1024, `${planet} source width`);
  assert.equal(metadata.height, 1024, `${planet} source height`);
  assert.equal(metadata.hasAlpha, true, `${planet} source must retain alpha`);
}

async function verifySelected(planet, role, expected) {
  const filename = path.join(selectedDir, selectedFilename(planet, role));
  const metadata = await sharp(filename).metadata();
  assert.equal(metadata.format, 'webp', `${planet}/${role} must be WebP`);
  assert.equal(metadata.width, expected.width, `${planet}/${role} width`);
  assert.equal(metadata.height, expected.height, `${planet}/${role} height`);
  assert.equal(metadata.hasAlpha, true, `${planet}/${role} must retain alpha`);
  assert.ok((await stat(filename)).size > 0, `${planet}/${role} must not be empty`);
  if (role === 'overview' || role === 'mobile') {
    const { data, info } = await sharp(filename).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
    const corners = [alpha(0, 0), alpha(info.width - 1, 0), alpha(0, info.height - 1), alpha(info.width - 1, info.height - 1)];
    assert.deepEqual(corners, [0, 0, 0, 0], `${planet}/${role} must keep transparent corners`);
  }
  return digest(filename);
}

const references = await Promise.all(componentFiles.map((filename) => readFile(filename, 'utf8')));

for (const planet of planets) {
  await verifySource(planet);
  const variantDigests = [];
  for (const [role, expected] of Object.entries(roles)) {
    const filename = selectedFilename(planet, role);
    variantDigests.push(await verifySelected(planet, role, expected));
    for (const component of references) {
      assert.match(component, new RegExp(`selected/${filename.replace('.', '\\.')}(?:\\?url)?`), `Static import missing for ${filename}`);
    }
  }
  assert.equal(new Set(variantDigests).size, variantDigests.length, `${planet} variants must not be mechanically copied`);
}

console.log('Planet asset contracts passed: 5 PNG masters, 15 WebP variants, alpha, dimensions, variant identity, and static imports.');
