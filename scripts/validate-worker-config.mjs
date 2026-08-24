import { readFile } from 'node:fs/promises';
import { parse as parseJsonc } from 'jsonc-parser';

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
      name: 'catstarry-finance-api-staging',
      database: 'finance-db',
      d1Binding: 'DB',
      kvBindings: ['FINANCE_AUTH_KV'],
      r2Bindings: [],
      crons: ['*/15 * * * *', '0,20 8,9,12 * * 1-5'],
    },
  },
];

function fail(message) {
  throw new Error(`Worker configuration validation failed: ${message}`);
}

async function readConfig(path) {
  const errors = [];
  const config = parseJsonc(await readFile(path, 'utf8'), errors, { allowTrailingComma: true });
  if (errors.length > 0 || !config || typeof config !== 'object' || Array.isArray(config)) {
    fail(`${path} must be a valid JSONC object`);
  }
  return config;
}

function hasAccountIdentifier(value) {
  return typeof value === 'string' &&
    (/^REPLACE_WITH_[A-Z0-9_]+$/.test(value) || /^[0-9a-f]{32}$/i.test(value) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

for (const { path, expected } of configs) {
  const config = await readConfig(path);
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
  if (path.includes('feed-api')) {
    const buckets = new Map((config.r2_buckets ?? []).map(({ binding, bucket_name }) => [binding, bucket_name]));
    if (buckets.get('MEDIA_BUCKET') !== 'catstarry-media') fail(`${path} must use catstarry-media`);
    if (buckets.get('HOME_PROJECTIONS') !== 'home-projections') fail(`${path} must use home-projections`);
  }

  const crons = config.triggers?.crons ?? [];
  if (JSON.stringify(crons) !== JSON.stringify(expected.crons)) {
    fail(`${path} has an unexpected cron schedule`);
  }
}

const financeSite = await readConfig('finance-site/wrangler.jsonc');
if (financeSite.name !== 'catstarry-finance-staging') fail('finance-site must use its staging Pages project name');
if (financeSite.compatibility_date !== '2026-07-22') fail('finance-site compatibility date is out of baseline');
if (financeSite.pages_build_output_dir !== '.') fail('finance-site must deploy only its own directory');

const site = await readConfig('wrangler.jsonc');
if (site.name !== 'catstarry-site-staging') fail('root site config must use the staging Worker name');
if (site.compatibility_date !== '2026-07-22') fail('root site compatibility date is out of baseline');
if (site.observability?.enabled !== true) fail('root site must enable observability');
if ('vars' in site || 'secrets' in site) fail('root site config must not store variables or secrets');
const siteServices = site.services ?? [];
if (siteServices.length !== 1 || siteServices[0]?.binding !== 'FEED_API' || siteServices[0]?.service !== 'catstarry-feed-api-staging') {
  fail('root site must bind FEED_API to catstarry-feed-api-staging');
}

console.log('Worker configuration contracts are valid.');
