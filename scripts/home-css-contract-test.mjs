import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [astro, runtime, client, homeCss, variablesCss] = await Promise.all([
  readFile('src/components/home/HomeExperience.astro', 'utf8'),
  readFile('src/components/home/home-runtime.ts', 'utf8'),
  readFile('src/components/home/home-client.ts', 'utf8'),
  readFile('src/styles/home.css', 'utf8'),
  readFile('src/styles/variables.css', 'utf8'),
]);
const productionSources = { astro, runtime, client, homeCss };
const canonicalSources = await Promise.all([
  readFile('src/styles/components.css', 'utf8'),
  readFile('src/styles/typography.css', 'utf8'),
]);
const canonicalCss = canonicalSources.join('\n');

for (const [name, source] of Object.entries(productionSources)) {
  assert.doesNotMatch(source, /data-state\b/, `${name} must not use legacy data-state vocabulary`);
}
assert.match(runtime, /dataset\.hasState/, 'runtime must project HAS state via data-has-state');

for (const [name, source] of Object.entries(productionSources)) {
  assert.doesNotMatch(source, /\.(home-planet|has-beacon|leopard-cat)\b/, `${name} must not reference canonical class names`);
}
assert.doesNotMatch(canonicalCss, /\.(home-space-stage|home-star-layer|home-star-map|home-planet|has-beacon|leopard-cat|star-map-index|about-expanded|cursor-meteor|planet-focus)/, 'canonical styles must not contain Home selector implementations');

assert.match(astro, /<main data-canvas="home">/, 'HomeExperience must declare data-canvas="home"');
assert.match(variablesCss, /\[data-canvas="home"\]/, 'variables.css must keep the [data-canvas="home"] block');

for (const state of ['active', 'stable', 'dormant', 'unavailable']) {
  assert.ok(homeCss.includes(`data-has-state="${state}"`), `home.css must style data-has-state="${state}"`);
}

assert.match(homeCss, /\.planet\[data-planet-state="ready"\]/, 'home.css must style .planet[data-planet-state="ready"]');
assert.doesNotMatch(homeCss, /\.planet\.ready\b/, 'home.css must not use legacy .planet.ready class');
assert.match(runtime, /planet\.dataset\.planetState = "ready"/, 'runtime must project planet ready state via dataset');
assert.match(runtime, /dataset\.planetState === "ready"/, 'runtime must read planet ready state via dataset');

for (const state of ['reveal', 'charged', 'burst', 'recovering']) {
  assert.ok(homeCss.includes(`data-cat-state="${state}"`), `home.css must style data-cat-state="${state}"`);
}
assert.doesNotMatch(homeCss, /\.about-zone\.(revealed|charged|burst|recovering)\b/, 'home.css must not use legacy .about-zone state classes');
assert.match(homeCss, /\.about-zone\.ready\b/, 'home.css must keep .about-zone.ready as the interaction switch');
assert.match(runtime, /CAT_STATE_ATTR/, 'runtime must translate cat state via CAT_STATE_ATTR');
assert.match(runtime, /syncCatState/, 'runtime must sync cat state via syncCatState');
assert.match(runtime, /setCatReveal/, 'runtime must project cat reveal fallback via setCatReveal');
assert.match(runtime, /catZone\.dataset\.catState/, 'runtime must write cat state to data-cat-state');

assert.doesNotMatch(runtime, /(?:document\.)?body\.dataset\.(catState|hasState|planetState|state)\b/, 'runtime must not write component-local state back to body');

assert.match(variablesCss, /--klein-400:/, 'variables.css must keep the canonical --klein-400 definition');
assert.match(variablesCss, /--klein-500:/, 'variables.css must keep the canonical --klein-500 definition');
assert.match(homeCss, /var\(--klein-400\)/, 'home.css must consume --klein-400 from canonical');
assert.match(homeCss, /var\(--klein-500\)/, 'home.css must consume --klein-500 from canonical');

for (const declaration of [
  '--planet-ready-rim-opacity: 0.3',
  '--planet-hover-halo-opacity: 0.24',
  '--planet-hover-halo-blur: 56px',
]) {
  assert.ok(homeCss.includes(declaration), `home.css must define ${declaration}`);
  assert.ok(variablesCss.includes(declaration), `variables.css must define ${declaration}`);
}

assert.match(homeCss, /font-family:\s*Inter/, 'home.css must keep the independent Inter first-frame font');
assert.doesNotMatch(variablesCss, /Inter/, 'variables.css must not depend on the Inter stack');

assert.match(homeCss, /--home-warm-dust-rgb: 217 184 132/, 'home.css must keep --home-warm-dust-rgb');
assert.match(homeCss, /--home-warm-terrain-rgb: 126 98 71/, 'home.css must keep --home-warm-terrain-rgb');
assert.match(homeCss, /--home-warm-dust-opacity: 0.11/, 'home.css must keep --home-warm-dust-opacity');
assert.doesNotMatch(homeCss, /--warm-(0|1|2|dust)\b/, 'home.css must not keep legacy --warm-* tokens');
assert.match(runtime, /"--home-warm-dust-opacity"/, 'runtime must inject the --home-warm-dust-opacity token');

assert.match(homeCss, /\.planet-focus\b/, 'home.css must provide the production .planet-focus implementation');
assert.match(astro, /id="planet-focus"/, 'HomeExperience must render the #planet-focus layer');
assert.match(runtime, /getElementById\("planet-focus"\)/, 'runtime must consume the #planet-focus layer');

for (const prefix of ['--has-', '--leopardcat-', '--star-map-', '--interaction-', '--cursor-meteor-', '--planet-focus-']) {
  assert.match(variablesCss, new RegExp(prefix), `variables.css must keep the canonical ${prefix.slice(2)}* design-contract tokens`);
}

console.log('Home CSS contract passed.');
