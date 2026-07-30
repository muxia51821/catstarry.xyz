import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { homeCopy, homePlanetKeys } from '../src/content/copy/home.ts';

const nonEmpty = (value, label, maxLength = 240) => {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.ok(value.trim().length > 0, `${label} must not be empty`);
  assert.ok(value.length <= maxLength, `${label} exceeds ${maxLength} characters`);
};

nonEmpty(homeCopy.entry.eyebrow, 'entry.eyebrow', 80);
nonEmpty(homeCopy.entry.title, 'entry.title', 80);
nonEmpty(homeCopy.entry.description, 'entry.description', 160);
nonEmpty(homeCopy.entry.action, 'entry.action', 48);

for (const [key, value] of Object.entries(homeCopy.stage)) {
  nonEmpty(value.name ?? value.namePrefix, `stage.${key}.name`, 48);
  if ('nameSuffix' in value) nonEmpty(value.nameSuffix, `stage.${key}.nameSuffix`, 48);
  nonEmpty(value.description, `stage.${key}.description`, 160);
}

assert.deepEqual(homePlanetKeys, ['about', 'feed', 'blog', 'projects', 'learn']);
for (const key of homePlanetKeys) {
  const planet = homeCopy.planets[key];
  nonEmpty(planet.label, `planets.${key}.label`, 32);
  nonEmpty(planet.subtitle, `planets.${key}.subtitle`, 80);
  nonEmpty(planet.focus.kicker, `planets.${key}.focus.kicker`, 80);
  nonEmpty(planet.focus.title, `planets.${key}.focus.title`, 80);
  nonEmpty(planet.focus.description, `planets.${key}.focus.description`, 240);
  assert.ok(Array.isArray(planet.focus.notes) && planet.focus.notes.length > 0 && planet.focus.notes.length <= 4, `planets.${key}.focus.notes must contain 1-4 entries`);
  planet.focus.notes.forEach((note, index) => nonEmpty(note, `planets.${key}.focus.notes[${index}]`, 160));
  if (key === 'about') assert.equal(planet.focus.action, '', 'about focus action must remain empty because it has no route');
  else nonEmpty(planet.focus.action, `planets.${key}.focus.action`, 48);
}

for (const [key, value] of Object.entries({
  focusPlaceholderKicker: homeCopy.focus.placeholderKicker,
  focusBackAction: homeCopy.focus.backAction,
  catHint: homeCopy.cat.hint,
  catChargedHint: homeCopy.cat.chargedHint,
  footer: homeCopy.footer,
  flightIndexAriaLabel: homeCopy.flightIndex.ariaLabel,
  flightIndexEntry: homeCopy.flightIndex.entry,
  flightIndexApproach: homeCopy.flightIndex.approach,
  flightIndexOverview: homeCopy.flightIndex.overview,
  journeyLabel: homeCopy.accessibility.journeyLabel,
  mapLabel: homeCopy.accessibility.mapLabel,
  catZoneLabel: homeCopy.accessibility.catZoneLabel,
  focusLabel: homeCopy.accessibility.focusLabel,
  activityActive: homeCopy.activityStatus.active,
  activityStable: homeCopy.activityStatus.stable,
  activityDormant: homeCopy.activityStatus.dormant,
  activityUnavailable: homeCopy.activityStatus.unavailable,
})) nonEmpty(value, key, 240);

const [experience, runtime] = await Promise.all([
  readFile('src/components/home/HomeExperience.astro', 'utf8'),
  readFile('src/components/home/home-runtime.ts', 'utf8'),
]);
assert.match(experience, /import \{ homeCopy \} from ['"]\.\.\/\.\.\/content\/copy\/home['"]/);
assert.match(runtime, /import \{ homeCopy \} from ['"]\.\.\/\.\.\/content\/copy\/home['"]/);
for (const reference of [
  'homeCopy.entry.',
  'homeCopy.planets.',
  'homeCopy.focus.',
  'homeCopy.cat.',
  'homeCopy.footer',
  'homeCopy.flightIndex.',
  'homeCopy.accessibility.',
]) assert.ok(experience.includes(reference), `HomeExperience must render ${reference} from homeCopy`);
for (const reference of [
  'homeCopy.planets',
  'homeCopy.focus.backAction',
  'homeCopy.cat.',
  'homeCopy.activityStatus',
  'homeCopy.stage.focus.nameSuffix',
]) assert.ok(runtime.includes(reference), `home-runtime must render ${reference} from homeCopy`);
for (const source of [experience, runtime]) assert.doesNotMatch(source, /TODO\(木下替换\)/, 'TODO guidance belongs only in the editable copy source');

console.log('Home copy contract passed.');
