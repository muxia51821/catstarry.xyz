import { execFileSync } from 'node:child_process';

import { normalizePublicationReleaseIdentity } from '../../shared/publication-release.ts';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

export function gitPublicationReleaseIdentity(ref = 'HEAD') {
  if (git('rev-parse', '--is-shallow-repository') === 'true') {
    throw new Error('Publication release identity requires complete Git history; shallow repositories are not supported');
  }
  const sha = git('rev-parse', `${ref}^{commit}`).toLowerCase();
  const generation = Number(git('rev-list', '--count', sha));
  const release = normalizePublicationReleaseIdentity({ sha, generation });
  if (!release) throw new Error('Unable to derive a valid publication release identity from Git');
  return release;
}

export function deployedPublicationReleaseIdentity() {
  const release = gitPublicationReleaseIdentity('HEAD');
  const expectedSha = process.env.DEPLOYED_SHA?.trim().toLowerCase();
  if (!expectedSha || expectedSha !== release.sha) {
    throw new Error('DEPLOYED_SHA must exactly match the checked-out publication release');
  }
  return release;
}
