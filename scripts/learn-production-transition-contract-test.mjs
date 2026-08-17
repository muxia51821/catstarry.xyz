import assert from 'node:assert/strict';
import { assertLearnProductionTransition } from './lib/learn-publications.mjs';

function entry(slug, links = []) {
  return { slug, links };
}

assert.doesNotThrow(() => {
  assertLearnProductionTransition(
    ['a', 'b'],
    [entry('a', ['b']), entry('b')],
  );
}, 'an unchanged relation-closed public corpus should remain deployable');

assert.throws(() => {
  assertLearnProductionTransition(
    ['a', 'b'],
    [entry('a', ['b'])],
  );
}, /Production Learn public note would disappear from candidate deployment: b/,
'candidate deployment must not remove or terminalize a currently public note');

assert.throws(() => {
  assertLearnProductionTransition(
    ['a'],
    [entry('a', ['b']), entry('b')],
  );
}, /Broken public Learn relation: a -> b/,
'a currently public note must not link a candidate note that is not currently public');

assert.doesNotThrow(() => {
  assertLearnProductionTransition(
    ['a'],
    [entry('a'), entry('hidden-candidate', ['missing-hidden-target'])],
  );
}, 'relations owned only by hidden candidate notes must not block production deployment');

console.log('Learn production transition contract test passed.');
