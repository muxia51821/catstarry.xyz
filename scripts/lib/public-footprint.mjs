const EVENT_BY_SOURCE = {
  blog: 'blog_published',
  projects: 'project_updated',
};

export function createFootprintCandidate(source, payload) {
  if (!(source in EVENT_BY_SOURCE)) throw new Error(`Unsupported footprint source: ${source}`);
  const sourceRef = requiredSlug(payload.source_ref, 'source_ref');
  const sourceVersion = requiredSlug(payload.source_version, 'source_version');
  const title = requiredText(payload.title, 'title', 200);
  const summary = optionalText(payload.summary, 'summary', 2_000);
  const link = requiredInternalLink(payload.link, source);
  const occurredAt = new Date(payload.occurred_at ?? Date.now());
  if (!Number.isFinite(occurredAt.getTime())) throw new Error('occurred_at must be a valid timestamp');

  const idempotencyKey = `${source}:${sourceRef}:${sourceVersion}`;
  if (idempotencyKey.length > 128) throw new Error('footprint identity must not exceed 128 characters');

  return {
    source_module: source,
    source_ref: sourceRef,
    source_version: sourceVersion,
    event_type: EVENT_BY_SOURCE[source],
    snapshot_json: JSON.stringify({ title, ...(summary ? { summary } : {}), link }),
    occurred_at: occurredAt.toISOString(),
    idempotency_key: idempotencyKey,
  };
}

export function assertEligibleSignal(source, environment) {
  if (source === 'blog') {
    if (environment.DEPLOYMENT_ENVIRONMENT !== 'production' || environment.DEPLOYMENT_STATUS !== 'success') {
      throw new Error('Blog footprints require a successful production deployment signal');
    }
    return;
  }
  if (environment.EXPLICIT_FOOTPRINT_CONFIRMATION !== 'true') {
    throw new Error(`${source} footprints require EXPLICIT_FOOTPRINT_CONFIRMATION=true`);
  }
}

export async function sendFootprint(candidate, options) {
  const apiBase = requiredHttpsUrl(options.apiBase, options.allowLocalhost === true);
  const token = requiredText(options.token, 'FOOTPRINT_INGEST_TOKEN', 4_096);
  const response = await (options.fetchImpl ?? fetch)(`${apiBase}/api/feed/internal/footprints`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(candidate),
  });
  if (!response.ok) throw new Error(`Footprint ingestion failed (${response.status}): ${await response.text()}`);
  return response.json();
}

function requiredSlug(value, name) {
  const text = requiredText(value, name, 128);
  if (!/^[a-z0-9]+(?:[-/:.][a-z0-9]+)*$/.test(text)) {
    throw new Error(`${name} must be stable lowercase ASCII`);
  }
  return text;
}

function requiredText(value, name, maximum) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) {
    throw new Error(`${name} must be a non-empty string no longer than ${maximum} characters`);
  }
  return value.trim();
}

function optionalText(value, name, maximum) {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredText(value, name, maximum);
}

function requiredInternalLink(value, source) {
  const link = requiredText(value, 'link', 2_048);
  const prefix = source === 'blog' ? '/blog/' : source === 'learn' ? '/learn/' : '/projects/';
  if (!link.startsWith(prefix) || link.startsWith('//')) throw new Error(`link must stay under ${prefix}`);
  return link;
}

function requiredHttpsUrl(value, allowLocalhost) {
  const url = new URL(requiredText(value, 'FEED_API_URL', 2_048));
  const local = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(allowLocalhost && local && url.protocol === 'http:')) {
    throw new Error('FEED_API_URL must use HTTPS (or explicit local test mode)');
  }
  return url.toString().replace(/\/$/, '');
}
