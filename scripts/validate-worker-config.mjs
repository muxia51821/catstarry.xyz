import { readFile } from 'node:fs/promises';

const configs = [
  {
    path: 'workers/feed-api/wrangler.jsonc',
    expected: {
      name: 'catstarry-feed-api-staging',
      database: 'catstarry-db',
      d1Binding: 'DB',
      kvBindings: ['VIEW_KV', 'AUTH_KV'],
      r2Bindings: ['MEDIA_BUCKET', 'HOME_PROJECTIONS'],
      crons: ['0 * * * *'],
    },
  },
  {
    path: 'workers/finance-api/wrangler.jsonc',
    expected: {
      name: 'finance-api',
      database: 'finance-db',
      d1Binding: 'DB',
      kvBindings: ['FINANCE_AUTH_KV'],
      r2Bindings: [],
      crons: ['*/15 * * * *', '30 7 * * 1-5'],
    },
  },
];

function fail(message) {
  throw new Error(`Worker configuration validation failed: ${message}`);
}

function hasAccountIdentifier(value) {
  return typeof value === 'string' &&
    (/^REPLACE_WITH_[A-Z0-9_]+$/.test(value) || /^[0-9a-f]{32}$/i.test(value));
}

for (const { path, expected } of configs) {
  const config = JSON.parse(await readFile(path, 'utf8'));
  if (config.name === 'feed-api') {
    fail(`${path} must not use the legacy production Worker name feed-api`);
  }
  if (config.name !== expected.name) fail(`${path} must name ${expected.name}`);
  if (config.compatibility_date !== '2026-07-22') {
    fail(`${path} must use the Phase 5 compatibility date`);
  }
  if (config.observability?.enabled !== true) {
    fail(`${path} must enable observability`);
  }
  if (config.compatibility_flags?.includes('nodejs_compat')) {
    fail(`${path} must not add nodejs_compat without a Worker dependency need`);
  }
  if ('vars' in config || 'secrets' in config) {
    fail(`${path} must not store variables or secrets in versioned Worker config`);
  }

  const d1 = config.d1_databases?.[0];
  if (d1?.binding !== expected.d1Binding || d1.database_name !== expected.database) {
    fail(`${path} must bind ${expected.d1Binding} to ${expected.database}`);
  }
  if (!hasAccountIdentifier(d1.database_id)) {
    fail(`${path} needs a UUID or an explicit D1 ID placeholder`);
  }

  const kvBindings = (config.kv_namespaces ?? []).map(({ binding }) => binding).sort();
  if (JSON.stringify(kvBindings) !== JSON.stringify([...expected.kvBindings].sort())) {
    fail(`${path} has an unexpected KV binding set`);
  }
  for (const namespace of config.kv_namespaces ?? []) {
    if (!hasAccountIdentifier(namespace.id)) {
      fail(`${path} has an invalid KV identifier for ${namespace.binding}`);
    }
  }

  const r2Bindings = (config.r2_buckets ?? []).map(({ binding }) => binding).sort();
  if (JSON.stringify(r2Bindings) !== JSON.stringify([...expected.r2Bindings].sort())) {
    fail(`${path} has an unexpected R2 binding set`);
  }
  if (expected.name === 'feed-api') {
    const buckets = new Map((config.r2_buckets ?? []).map(({ binding, bucket_name }) => [binding, bucket_name]));
    if (buckets.get('MEDIA_BUCKET') !== 'catstarry-media') fail(`${path} must use catstarry-media`);
    if (buckets.get('HOME_PROJECTIONS') !== 'home-projections') fail(`${path} must use home-projections`);
  }

  const crons = config.triggers?.crons ?? [];
  if (JSON.stringify(crons) !== JSON.stringify(expected.crons)) {
    fail(`${path} has an unexpected cron schedule`);
  }
}

console.log('Worker configuration contracts are valid.');
