import { createHash } from 'node:crypto';
import { access, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const planetsRoot = path.join(root, 'docs', 'design', 'assets', 'planets');
const sourceDir = path.join(planetsRoot, 'source');
const selectedDir = path.join(planetsRoot, 'selected');

const planets = ['about', 'blog', 'feed', 'learn', 'projects'];
const roles = {
  overview: { width: 1254, height: 1254 },
  focus: { width: 1120, height: 840 },
  mobile: { width: 640, height: 640 },
};

// Keep these boxes synchronized with docs/design/assets/planets/derive-variants.py.
const focusCrops = {
  about: { left: 60, top: 210, width: 1120, height: 840 },
  blog: { left: 40, top: 160, width: 1120, height: 840 },
  feed: { left: 70, top: 210, width: 1120, height: 840 },
  learn: { left: 40, top: 180, width: 1120, height: 840 },
  projects: { left: 50, top: 130, width: 1120, height: 840 },
};

const webpOptions = {
  quality: 88,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
};

function selectedFilename(planet, role) {
  return `planet-${planet}-${role}.webp`;
}

function allSelectedFilenames() {
  return planets.flatMap((planet) => Object.keys(roles).map((role) => selectedFilename(planet, role)));
}

async function requireFile(filename) {
  try {
    await access(filename);
  } catch {
    throw new Error(`Required asset is missing: ${filename}`);
  }
}

async function inspectBuffer(buffer, filename, expected, requireTransparentCorners) {
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'webp') throw new Error(`${filename} is not WebP`);
  if (metadata.width !== expected.width || metadata.height !== expected.height) {
    throw new Error(`${filename} is ${metadata.width}x${metadata.height}; expected ${expected.width}x${expected.height}`);
  }
  if (!metadata.hasAlpha) throw new Error(`${filename} lost its alpha channel`);
  if (buffer.length === 0) throw new Error(`${filename} is empty`);
  if (!requireTransparentCorners) return;

  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
  const corners = [alpha(0, 0), alpha(info.width - 1, 0), alpha(0, info.height - 1), alpha(info.width - 1, info.height - 1)];
  if (corners.some((value) => value !== 0)) {
    throw new Error(`${filename} must keep transparent corners; received ${corners.join(', ')}`);
  }
}

async function sourceMetadata(filename) {
  const metadata = await sharp(filename).metadata();
  if (metadata.format !== 'png') throw new Error(`${path.basename(filename)} must be a PNG master`);
  if (metadata.width !== 1024 || metadata.height !== 1024) {
    throw new Error(`${path.basename(filename)} is ${metadata.width}x${metadata.height}; expected 1024x1024`);
  }
  if (!metadata.hasAlpha) throw new Error(`${path.basename(filename)} must retain an alpha channel`);
}

async function generateVariants(planet) {
  const source = path.join(sourceDir, `${planet}-overview.png`);
  await requireFile(source);
  await sourceMetadata(source);

  const overview = await sharp(source)
    .resize({
      width: roles.overview.width,
      height: roles.overview.height,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .webp(webpOptions)
    .toBuffer();
  const focus = await sharp(overview)
    .extract(focusCrops[planet])
    .webp(webpOptions)
    .toBuffer();
  const mobile = await sharp(overview)
    .resize({
      width: roles.mobile.width,
      height: roles.mobile.height,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .webp(webpOptions)
    .toBuffer();

  await inspectBuffer(overview, selectedFilename(planet, 'overview'), roles.overview, true);
  await inspectBuffer(focus, selectedFilename(planet, 'focus'), roles.focus, false);
  await inspectBuffer(mobile, selectedFilename(planet, 'mobile'), roles.mobile, true);

  return new Map([
    [selectedFilename(planet, 'overview'), overview],
    [selectedFilename(planet, 'focus'), focus],
    [selectedFilename(planet, 'mobile'), mobile],
  ]);
}

async function verifyDistinctVariants(generated) {
  for (const planet of planets) {
    const hashes = Object.keys(roles).map((role) => createHash('sha256')
      .update(generated.get(selectedFilename(planet, role)))
      .digest('hex'));
    if (new Set(hashes).size !== hashes.length) {
      throw new Error(`${planet} variants are mechanically identical`);
    }
  }
}

const generated = new Map();
for (const planet of planets) {
  console.log(`Generating ${planet} variants...`);
  for (const [filename, buffer] of await generateVariants(planet)) generated.set(filename, buffer);
}
console.log('Validating generated variants...');
await verifyDistinctVariants(generated);

const filenames = allSelectedFilenames();
for (const filename of filenames) await requireFile(path.join(selectedDir, filename));

// Staging all 15 buffers in memory avoids Windows file-handle contention from Sharp.
// No selected file is written until every replacement has passed validation above.
const originals = new Map(await Promise.all(filenames.map(async (filename) => [
  filename,
  await readFile(path.join(selectedDir, filename)),
])));

try {
  console.log('Replacing selected variants...');
  for (const filename of filenames) {
    await writeFile(path.join(selectedDir, filename), generated.get(filename));
  }
} catch (error) {
  for (const filename of filenames) {
    try {
      await writeFile(path.join(selectedDir, filename), originals.get(filename));
    } catch {
      // Continue restoring every available original; throw the original failure below.
    }
  }
  throw error;
}

for (const filename of filenames) {
  if ((await stat(path.join(selectedDir, filename))).size === 0) {
    throw new Error(`Selected asset write failed: ${filename}`);
  }
}
console.log(`Exported ${filenames.length} planet variants to ${selectedDir}`);
