import { execFileSync } from 'node:child_process';

const REPOSITORY = 'muxia51821/catstarry.xyz';
const WORKFLOW = 'sync-production-publications.yml';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function command(file, args) {
  return execFileSync(file, args, { encoding: 'utf8' }).trim();
}

function normalizeSha(value, label) {
  const sha = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!SHA_PATTERN.test(sha)) throw new Error(`${label} must be a full commit SHA`);
  return sha;
}

export function classifyPublicationPaths(paths) {
  const changedPublicationPaths = [...new Set(paths.filter((path) => (
    typeof path === 'string' && (path.startsWith('src/data/blog/') || path.startsWith('src/data/learn/'))
  )))].sort();
  const blogPublicationSyncRequired = changedPublicationPaths.some((path) => path.startsWith('src/data/blog/'));
  const learnPublicationSyncRequired = changedPublicationPaths.some((path) => path.startsWith('src/data/learn/'));

  return {
    changedPublicationPaths,
    blogPublicationSyncRequired,
    learnPublicationSyncRequired,
    learnBarrierRequired: learnPublicationSyncRequired,
    dispatchRequired: blogPublicationSyncRequired || learnPublicationSyncRequired,
  };
}

export function createPublicationReleaseScope({ baselineSha, deploySha, changedPaths, baselineSource }) {
  return {
    baselineSha: normalizeSha(baselineSha, 'Publication baseline SHA'),
    deploySha: normalizeSha(deploySha, 'Deployment SHA'),
    baselineSource,
    ...classifyPublicationPaths(changedPaths),
  };
}

function latestSuccessfulPublicationSync() {
  const output = command('gh', [
    'run', 'list',
    '--repo', REPOSITORY,
    '--workflow', WORKFLOW,
    '--limit', '30',
    '--json', 'headSha,status,conclusion,createdAt',
  ]);
  const runs = JSON.parse(output);
  const latest = runs.find((run) => run.status === 'completed' && run.conclusion === 'success' && SHA_PATTERN.test(run.headSha ?? ''));
  if (!latest) {
    throw new Error('No successful production publication sync was found; establish an active publication baseline before release classification');
  }
  return latest.headSha.toLowerCase();
}

export function resolvePublicationReleaseScope({ ref = 'HEAD' } = {}) {
  const deploySha = command('git', ['rev-parse', `${ref}^{commit}`]).toLowerCase();
  const baseline = latestSuccessfulPublicationSync();
  try {
    command('git', ['merge-base', '--is-ancestor', baseline, deploySha]);
  } catch {
    throw new Error(`Publication baseline ${baseline} is not an ancestor of deployment ${deploySha}`);
  }
  const changedPaths = command('git', ['diff', '--name-only', '--no-renames', `${baseline}..${deploySha}`])
    .split(/\r?\n/)
    .filter(Boolean);
  return createPublicationReleaseScope({
    baselineSha: baseline,
    deploySha,
    changedPaths,
    baselineSource: 'latest-successful-sync',
  });
}
