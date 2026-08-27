import { resolvePublicationReleaseScope } from './lib/publication-release-scope.mjs';

const json = process.argv.includes('--json');

try {
  const scope = resolvePublicationReleaseScope();
  if (json) {
    console.log(JSON.stringify(scope));
  } else {
    console.log(`Publication baseline: ${scope.baselineSha} (${scope.baselineSource})`);
    console.log(`Current HEAD SHA: ${scope.deploySha}`);
    console.log(`Blog manifest sync: ${scope.blogPublicationSyncRequired ? 'required' : 'not required'}`);
    console.log(`Learn manifest sync: ${scope.learnPublicationSyncRequired ? 'required' : 'not required'}`);
    console.log(`Learn lifecycle barrier: ${scope.learnBarrierRequired ? 'required' : 'not required'}`);
    console.log(`Publication dispatch: ${scope.dispatchRequired ? 'required' : 'not required'}`);
    if (scope.changedPublicationPaths.length) {
      console.log(`Changed publication paths: ${scope.changedPublicationPaths.join(', ')}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
