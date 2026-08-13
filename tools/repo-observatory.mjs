import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOL_DIR, '..');
const OUTPUT_DIR = path.join(ROOT, '.scratch', 'repo-observatory');
const CODE_EXTENSIONS = new Set(['.astro', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const ASSET_EXTENSIONS = new Set(['.avif', '.css', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp', '.woff', '.woff2', '.ttf']);
const SKIP_DIRECTORIES = new Set(['.git', '.astro', '.scratch', '.wrangler', 'dist', 'node_modules', '_archive']);
const MODULES = ['Home', 'Blog', 'Feed', 'Learn', 'Projects', 'Finance', 'Shared', 'Infrastructure', 'Authoring / Tooling'];
const DEPENDENCY_RELATIONS = new Set(['imports', 'renders', 'calls', 'reads', 'writes', 'routes-to', 'configured-by', 'invokes', 'depends-on', 'deployed-with']);

const posix = (value) => value.split(path.sep).join('/');
const relative = (value) => posix(path.relative(ROOT, value));
const unique = (values) => [...new Set(values.filter(Boolean))];
const sortBy = (values, selector) => [...values].sort((a, b) => selector(a).localeCompare(selector(b)));
const evidence = (file, line, detail) => ({ file, line, ...(detail ? { detail } : {}) });

async function walk(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(absolute));
    else result.push(relative(absolute));
  }
  return result;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
}

function stripJsonComments(source) {
  let output = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      output += '\n';
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 1;
      continue;
    }
    output += char;
  }
  return output.replace(/,\s*([}\]])/g, '$1');
}

async function readJsonc(file) {
  return JSON.parse(stripJsonComments(await fs.readFile(path.join(ROOT, file), 'utf8')));
}

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

function lineOf(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function lineContaining(source, fragment) {
  const index = source.indexOf(fragment);
  return index < 0 ? null : lineOf(source, index);
}

function isTestOrGenerated(file) {
  return /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|(?:contract-test|regression|\.test\.|\.spec\.)|worker-configuration\.d\.ts$/.test(file);
}

function isProductionPath(file) {
  if (isTestOrGenerated(file)) return false;
  if (['astro.config.mjs', 'src/content.config.ts'].includes(file)) return true;
  return /^(?:src|shared|workers|finance-site|public)\//.test(file)
    && !/(?:^|\/)wrangler\.jsonc$/.test(file)
    && !/(?:^|\/)migrations\//.test(file)
    && !/(?:^|\/)tsconfig(?:\.worker\.base)?\.json$/.test(file)
    && !/\.md$/.test(file);
}

function modulesForPath(file) {
  const modules = [];
  if (/^src\/(?:pages|components)\/home\/|^src\/pages\/index\.astro$|^src\/content\/copy\/home\.ts$|^src\/styles\/home\.css$/.test(file)) modules.push('Home');
  if (/^src\/(?:pages|components|data)\/blog\/|^src\/styles\/blog\.css$|^src\/lib\/(?:blog|category|useViewCount)\./.test(file)) modules.push('Blog');
  if (/^src\/(?:pages|components)\/feed\/|^src\/styles\/feed\.css$|^src\/lib\/feed-/.test(file)) modules.push('Feed');
  if (/^src\/(?:pages|components|data)\/learn\/|^scripts\/(?:learn-|lib\/learn-)/.test(file)) modules.push('Learn');
  if (/^src\/(?:pages|components|data)\/projects\/|^public\/assets\/projects\/|^scripts\/(?:project-|capture-project)/.test(file)) modules.push('Projects');
  if (/^(?:finance-site|workers\/finance-api)\/|^scripts\/(?:finance-|lib\/finance-)/.test(file)) modules.push('Finance');
  if (/^workers\/feed-api\//.test(file)) modules.push('Infrastructure');
  if (/^workers\/feed-api\/src\/(?:routes\/feed|adapters\/feed-store|routes\/upload)\./.test(file)) modules.push('Feed');
  if (/^workers\/feed-api\/src\/(?:routes\/blog|routes\/views)\./.test(file)) modules.push('Blog');
  if (/^workers\/feed-api\/src\/routes\/learn\./.test(file)) modules.push('Learn');
  if (/^workers\/feed-api\/src\/(?:routes\/activity-signals|adapters\/activity-signal-store|modules\/activity-signals)\./.test(file)) modules.push('Home');
  if (/^shared\/|^src\/layouts\/|^src\/styles\/(?:variables|typography|components|global|main)\.css$|^src\/lib\/(?:safe-json|batch-results)\./.test(file)) modules.push('Shared');
  if (/^(?:workers\/|wrangler\.jsonc$|\.github\/workflows\/)|\/migrations\//.test(file)) modules.push('Infrastructure');
  if (/^(?:scripts|tools)\/|^package(?:-lock)?\.json$/.test(file)) modules.push('Authoring / Tooling');
  if (/^docs\/design\/assets\//.test(file)) modules.push('Authoring / Tooling');
  if (/^public\/blog\//.test(file)) modules.push('Blog');
  return unique(modules.length ? modules : ['Shared']);
}

function moduleForRoute(route, scope = 'site') {
  if (scope === 'finance' || route.startsWith('/api/') && route.match(/(?:holdings|market|trades|monthly|plan|cash-flows|assets|risk|circuit|review|notifications|access-log|import-review|archive|memos|rebalances|workbook-review)/)) return ['Finance', 'Infrastructure'];
  if (route === '/') return ['Home'];
  if (route.startsWith('/blog') || route === '/api/views') return route.startsWith('/api') ? ['Blog', 'Infrastructure'] : ['Blog'];
  if (route.startsWith('/feed') || route.startsWith('/api/feed') || route.startsWith('/api/auth')) return route.startsWith('/api') ? ['Feed', 'Infrastructure'] : ['Feed'];
  if (route.startsWith('/learn') || route.startsWith('/api/learn')) return route.startsWith('/api') ? ['Learn', 'Infrastructure'] : ['Learn'];
  if (route.startsWith('/projects')) return ['Projects'];
  if (route === '/activity-signals.json') return ['Home', 'Infrastructure'];
  return scope === 'worker' ? ['Infrastructure'] : ['Shared'];
}

function fileType(file) {
  const extension = path.posix.extname(file).toLowerCase();
  if (/^src\/pages\//.test(file) || file === 'finance-site/index.html') return ['page', file.endsWith('.astro') ? 'astro' : 'html'];
  if (/^src\/(?:components|layouts)\//.test(file)) return ['component', file.includes('/layouts/') ? 'layout' : extension.slice(1)];
  if (/^src\/(?:data|content)\//.test(file) || file === 'src/content.config.ts') return ['content/data source', extension.slice(1) || 'collection-config'];
  if (/\/migrations\/.*\.sql$/.test(file)) return ['migration', 'd1-sql'];
  if (/^scripts\//.test(file) || file === 'tools/repo-observatory.mjs') return ['script', 'source-file'];
  if (/^\.github\/workflows\//.test(file)) return ['workflow', 'github-actions'];
  if (/(?:^|\/)wrangler\.jsonc$/.test(file) || ['astro.config.mjs', 'tsconfig.json', 'tsconfig.worker.base.json', 'package.json'].includes(file)) return ['configuration', path.posix.basename(file)];
  if (ASSET_EXTENSIONS.has(extension)) return ['asset', extension === '.css' ? 'stylesheet' : extension.slice(1)];
  return ['library', extension.slice(1) || 'file'];
}

function astroRoute(file) {
  if (!file.startsWith('src/pages/')) return null;
  let route = file.slice('src/pages'.length).replace(/\.(?:astro|[cm]?[jt]sx?)$/, '');
  route = route.replace(/\/index$/, '/').replace(/\[\.\.\.([^\]]+)\]/g, '*$1').replace(/\[([^\]]+)\]/g, ':$1');
  route = route.replace(/\/+/g, '/');
  if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
  return route || '/';
}

function resolveImport(fromFile, specifier, filesSet) {
  if (!specifier.startsWith('.')) return null;
  const clean = specifier.split('?')[0].split('#')[0];
  const base = posix(path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean)));
  const candidates = [base];
  for (const extension of ['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.md', '.mdx', '.svg', '.png', '.jpg', '.jpeg', '.webp']) candidates.push(`${base}${extension}`);
  for (const extension of ['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']) candidates.push(`${base}/index${extension}`);
  return candidates.find((candidate) => filesSet.has(candidate)) ?? null;
}

function routePatternFromLine(line) {
  const routes = [];
  for (const match of line.matchAll(/pathname\s*(?:===|!==)\s*['"]([^'"]+)['"]/g)) routes.push(match[1]);
  for (const match of line.matchAll(/pathname\.startsWith\(['"]([^'"]+)['"]\)/g)) routes.push(`${match[1].replace(/\/$/, '')}/*`);
  const regexStart = line.indexOf('/^\\/');
  const regexEnd = line.indexOf('$/.test(pathname)');
  if (regexStart >= 0 && regexEnd > regexStart) {
    const raw = line.slice(regexStart + 2, regexEnd)
      .replaceAll('\\/', '/')
      .replace(/\\d\+/g, ':id')
      .replace(/\(\?:[^)]+\)/g, '*')
      .replace(/\([^)]*\)/g, ':param');
    routes.push(raw);
  }
  return unique(routes.filter((route) => route.startsWith('/')));
}

function pathMatchesPattern(value, pattern) {
  if (value === pattern) return true;
  if (pattern.endsWith('/*')) return value.startsWith(pattern.slice(0, -1));
  const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\:id|\\:param/g, '[^/]+').replace(/\\\*/g, '.*')}$`);
  return regex.test(value);
}

function callPathsFromLine(line) {
  if (!line.includes('fetch(') && !line.includes('apiFetch(') && !line.includes('fetchJson(')) return [];
  const paths = [];
  for (const match of line.matchAll(/\/(?:api|activity-signals\.json)(?:\/[A-Za-z0-9_.:${}\-]+)*/g)) {
    paths.push(match[0].replace(/\$\{[^}]+\}/g, ':param'));
  }
  return unique(paths);
}

function methodFromLine(line) {
  const match = line.match(/request\.method\s*(?:===|!==)\s*['"]([A-Z]+)['"]/);
  return match?.[1] ?? null;
}

function safeHtmlJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

const files = sortBy(await walk(ROOT), (value) => value);
const filesSet = new Set(files);
const sources = new Map();
for (const file of files) {
  const extension = path.posix.extname(file).toLowerCase();
  if (CODE_EXTENSIONS.has(extension) || ['.json', '.jsonc', '.yml', '.yaml', '.md', '.sql', '.html'].includes(extension)) {
    try { sources.set(file, await fs.readFile(path.join(ROOT, file), 'utf8')); } catch { /* binary or transient */ }
  }
}

const nodes = new Map();
const edges = [];
const edgeKeys = new Set();

function addNode(node) {
  const existing = nodes.get(node.id);
  if (existing) {
    existing.modules = unique([...(existing.modules ?? []), ...(node.modules ?? [])]);
    existing.metadata = { ...(existing.metadata ?? {}), ...(node.metadata ?? {}) };
    return existing;
  }
  const normalized = { modules: ['Shared'], metadata: {}, ...node };
  nodes.set(node.id, normalized);
  return normalized;
}

function addEdge(edge) {
  if (!nodes.has(edge.from) || !nodes.has(edge.to)) return;
  const key = `${edge.from}|${edge.to}|${edge.relation}|${edge.evidence?.file ?? ''}|${edge.evidence?.line ?? ''}`;
  if (edgeKeys.has(key)) return;
  edgeKeys.add(key);
  edges.push({ confidence: 'confirmed', production: false, ...edge });
}

function nodeIdForFile(file) {
  const [type] = fileType(file);
  return `${type}:${file}`;
}

function ensureFileNode(file) {
  const [type, subtype] = fileType(file);
  return addNode({
    id: nodeIdForFile(file),
    type,
    subtype,
    label: file,
    modules: modulesForPath(file),
    metadata: { file, production: isProductionPath(file), testOnly: isTestOrGenerated(file) },
  });
}

const relevantFiles = files.filter((file) =>
  /^(?:src|shared|workers|finance-site|public|scripts|tools|\.github\/workflows)\//.test(file)
  || ['package.json', 'astro.config.mjs', 'wrangler.jsonc', 'tsconfig.json', 'tsconfig.worker.base.json'].includes(file));
for (const file of relevantFiles) ensureFileNode(file);

const packageJson = JSON.parse(sources.get('package.json'));
for (const [name, version] of Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })) {
  addNode({
    id: `library:package:${name}`,
    type: 'library',
    subtype: 'package',
    label: name,
    modules: ['Shared', 'Authoring / Tooling'],
    metadata: { version, productionDependency: Object.hasOwn(packageJson.dependencies ?? {}, name) },
  });
}

for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  addNode({ id: `script:package:${name}`, type: 'script', subtype: 'package-script', label: `npm run ${name}`, modules: ['Authoring / Tooling'], metadata: { command } });
}

for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  const scriptId = `script:package:${name}`;
  const packageLine = lineContaining(sources.get('package.json'), `"${name}"`) ?? 1;
  for (const match of command.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
    const target = `script:package:${match[1]}`;
    if (nodes.has(target)) addEdge({ from: scriptId, to: target, relation: 'invokes', evidence: evidence('package.json', packageLine), production: false });
  }
  for (const match of command.matchAll(/(?:node(?:\s+--[^\s]+)*|python|pwsh)\s+([^\s]+\.(?:mjs|cjs|js|py|ps1))/g)) {
    const targetFile = match[1].replace(/^\.\//, '');
    if (filesSet.has(targetFile)) addEdge({ from: scriptId, to: nodeIdForFile(targetFile), relation: 'invokes', evidence: evidence('package.json', packageLine), production: false });
  }
  const executable = command.trim().split(/\s+/)[0];
  if (nodes.has(`library:package:${executable}`)) addEdge({ from: scriptId, to: `library:package:${executable}`, relation: 'depends-on', evidence: evidence('package.json', packageLine), production: false });
}

const importRecords = [];
for (const [file, source] of sources) {
  if (!CODE_EXTENSIONS.has(path.posix.extname(file).toLowerCase()) || isTestOrGenerated(file) && !file.startsWith('scripts/')) continue;
  const from = nodeIdForFile(file);
  if (!nodes.has(from)) continue;
  const importRegex = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^;'"`]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of source.matchAll(importRegex)) {
    const specifier = match[1] ?? match[2];
    const resolved = resolveImport(file, specifier, filesSet);
    const statementOffset = match[0].search(/\b(?:import|export)\b/);
    const line = lineOf(source, match.index + Math.max(0, statementOffset));
    let target;
    if (resolved) {
      ensureFileNode(resolved);
      target = nodeIdForFile(resolved);
    } else if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:')) {
      const dependency = packageName(specifier);
      target = `library:package:${dependency}`;
      if (!nodes.has(target)) addNode({ id: target, type: 'library', subtype: 'external-package', label: dependency, modules: ['Shared'], metadata: {} });
    }
    if (!target) continue;
    const typeOnly = /\b(?:import|export)\s+type\b/.test(match[0]);
    addEdge({ from, to: target, relation: 'imports', evidence: evidence(file, line, specifier), production: isProductionPath(file), metadata: { typeOnly } });
    importRecords.push({ file, source: match[0], specifier, resolved, target, line });
  }
}

for (const file of files.filter((item) => /^(?:finance-site|src)\/.*\.html$/.test(item))) {
  const source = sources.get(file);
  for (const match of source.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=['"]([^'"]+)['"][^>]*>/gi)) {
    const specifier = match[1];
    if (/^(?:https?:|\/\/|#)/.test(specifier)) continue;
    const resolved = posix(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
    if (!filesSet.has(resolved)) continue;
    ensureFileNode(resolved);
    addEdge({ from: nodeIdForFile(file), to: nodeIdForFile(resolved), relation: specifier.endsWith('.css') ? 'imports' : 'invokes', evidence: evidence(file, lineOf(source, match.index), specifier), production: isProductionPath(file) });
  }
}

for (const record of importRecords) {
  if (!record.resolved || !/\.(?:astro|tsx|jsx)$/.test(record.resolved)) continue;
  const defaultMatch = record.source.match(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/);
  const names = [];
  if (defaultMatch) names.push(defaultMatch[1]);
  const namedMatch = record.source.match(/\{([^}]+)\}/);
  if (namedMatch) names.push(...namedMatch[1].split(',').map((item) => item.trim().split(/\s+as\s+/).at(-1)).filter(Boolean));
  const source = sources.get(record.file);
  for (const name of names) {
    const tag = new RegExp(`<${name}(?:\\s|/?>)`);
    const match = tag.exec(source);
    if (match) addEdge({ from: nodeIdForFile(record.file), to: record.target, relation: 'renders', evidence: evidence(record.file, lineOf(source, match.index)), production: isProductionPath(record.file) });
  }
}

for (const file of files.filter((item) => item.startsWith('src/pages/'))) {
  const route = astroRoute(file);
  const routeId = `route:site:${route}`;
  addNode({ id: routeId, type: 'route', subtype: route.includes(':') || route.includes('*') ? 'dynamic-astro' : 'astro', label: route, modules: moduleForRoute(route), metadata: { scope: 'site', pattern: route, dynamic: route.includes(':') || route.includes('*') } });
  addEdge({ from: routeId, to: nodeIdForFile(file), relation: 'routes-to', evidence: evidence(file, 1), production: true });
}
if (filesSet.has('finance-site/index.html')) {
  addNode({ id: 'route:finance:/', type: 'route', subtype: 'static-page', label: 'Finance /', modules: ['Finance'], metadata: { scope: 'finance', pattern: '/' } });
  addEdge({ from: 'route:finance:/', to: nodeIdForFile('finance-site/index.html'), relation: 'routes-to', evidence: evidence('finance-site/index.html', 1), production: true });
}

const workerConfigs = files.filter((file) => /^(?:workers\/[^/]+\/)?wrangler\.jsonc$/.test(file));
const workerDetails = [];
const bindingByWorker = new Map();
for (const configFile of workerConfigs) {
  const config = await readJsonc(configFile);
  if (!config.main) continue;
  const workerDirectory = path.posix.dirname(configFile);
  const mainFile = posix(path.posix.join(workerDirectory, config.main));
  const workerName = path.posix.basename(workerDirectory);
  const workerId = `worker:${workerName}`;
  const configSource = sources.get(configFile);
  const workerModules = workerName.includes('finance') ? ['Finance', 'Infrastructure'] : ['Feed', 'Blog', 'Learn', 'Home', 'Infrastructure'];
  addNode({ id: workerId, type: 'worker', subtype: 'cloudflare-worker', label: config.name ?? workerName, modules: workerModules, metadata: { main: mainFile, config: configFile, crons: config.triggers?.crons ?? [] } });
  addEdge({ from: workerId, to: nodeIdForFile(configFile), relation: 'configured-by', evidence: evidence(configFile, 1), production: true });
  ensureFileNode(mainFile);
  addEdge({ from: workerId, to: nodeIdForFile(mainFile), relation: 'imports', evidence: evidence(configFile, lineContaining(configSource, '"main"') ?? 1), production: true });
  const bindings = new Map();
  for (const [key, subtype, resourceType, nameKey] of [
    ['d1_databases', 'd1', 'D1 database', 'database_name'],
    ['kv_namespaces', 'kv', 'KV namespace', 'id'],
    ['r2_buckets', 'r2', 'R2 bucket', 'bucket_name'],
  ]) {
    for (const item of config[key] ?? []) {
      const bindingId = `binding:${workerName}:${item.binding}`;
      const line = lineContaining(configSource, `"binding": "${item.binding}"`) ?? 1;
      const resourceName = item[nameKey] ?? `${workerName}:${item.binding}`;
      const resourceId = `${resourceType}:${resourceName}`;
      addNode({ id: bindingId, type: 'binding', subtype, label: item.binding, modules: workerModules, metadata: { worker: workerId, config: configFile } });
      addNode({ id: resourceId, type: resourceType, subtype, label: resourceName, modules: workerModules, metadata: { configuredValue: resourceName } });
      addEdge({ from: workerId, to: bindingId, relation: 'depends-on', evidence: evidence(configFile, line), production: true });
      addEdge({ from: bindingId, to: resourceId, relation: 'configured-by', evidence: evidence(configFile, line), production: true });
      bindings.set(item.binding, { bindingId, resourceId, subtype });
      if (subtype === 'd1') {
        const migrationDirectory = posix(path.posix.join(workerDirectory, item.migrations_dir ?? 'migrations'));
        for (const migration of files.filter((candidate) => candidate.startsWith(`${migrationDirectory}/`) && candidate.endsWith('.sql'))) {
          addEdge({ from: resourceId, to: nodeIdForFile(migration), relation: 'configured-by', evidence: evidence(configFile, lineContaining(configSource, '"migrations_dir"') ?? line), production: true });
        }
      }
    }
  }
  bindingByWorker.set(workerName, bindings);
  workerDetails.push({ workerId, workerName, workerDirectory, mainFile, configFile, bindings });
}

const workerRouteCandidates = [];
for (const detail of workerDetails) {
  const workerFiles = [...sources.keys()].filter((file) => file.startsWith(`${detail.workerDirectory}/src/`) && file.endsWith('.ts') && !isTestOrGenerated(file));
  for (const file of workerFiles) {
    const source = sources.get(file);
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const pattern of routePatternFromLine(line)) {
        if (file.endsWith('/src/index.ts') && pattern.endsWith('/*')) continue;
        const method = methodFromLine(line);
        const methods = [...line.matchAll(/['"]([A-Z]+)['"]/g)].map((match) => match[1]).filter((value) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(value));
        for (const routeMethod of methods.length > 1 && line.includes('includes(request.method)') ? methods : [method]) {
          workerRouteCandidates.push({ workerName: detail.workerName, workerId: detail.workerId, pattern, method: routeMethod, file, line: index + 1, detail: line.trim() });
        }
      }
    }
  }
}

const workerRouteByPattern = [];
for (const candidate of workerRouteCandidates) {
  if (!candidate.method && workerRouteCandidates.some((other) => other.workerName === candidate.workerName && other.pattern === candidate.pattern && other.method)) continue;
  const routeId = `worker route:${candidate.workerName}:${candidate.method ?? 'ANY'}:${candidate.pattern}`;
  if (nodes.has(routeId)) continue;
  const modules = moduleForRoute(candidate.pattern, candidate.workerName.includes('finance') ? 'finance' : 'worker');
  addNode({ id: routeId, type: 'worker route', subtype: candidate.method ? 'http-exact' : candidate.pattern.endsWith('/*') ? 'http-prefix' : 'http', label: `${candidate.method ?? 'ANY'} ${candidate.pattern}`, modules, metadata: { method: candidate.method, pattern: candidate.pattern, worker: candidate.workerId, handlerFile: candidate.file } });
  addEdge({ from: candidate.workerId, to: routeId, relation: 'routes-to', evidence: evidence(candidate.file, candidate.line, candidate.detail), production: true });
  addEdge({ from: routeId, to: nodeIdForFile(candidate.file), relation: 'calls', evidence: evidence(candidate.file, candidate.line), production: true });
  workerRouteByPattern.push({ routeId, workerName: candidate.workerName, pattern: candidate.pattern, method: candidate.method, file: candidate.file });
}

for (const [file, source] of sources) {
  if (!CODE_EXTENSIONS.has(path.posix.extname(file).toLowerCase()) || isTestOrGenerated(file)) continue;
  const lines = source.split(/\r?\n/);
  const apiHelpers = new Map();
  for (const match of source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)[^{]*\{[^}]*?['"](\/(?:api|activity-signals\.json)[^'"]*)['"]/gs)) {
    apiHelpers.set(match[1], match[2].replace(/\$\{[^}]+\}/g, ':param'));
  }
  for (let index = 0; index < lines.length; index += 1) {
    const calledPaths = callPathsFromLine(lines[index]);
    for (const [helper, apiPath] of apiHelpers) {
      if (new RegExp(`(?:fetch|apiFetch|fetchJson)\\s*\\(\\s*${helper}\\s*\\(`).test(lines[index])) calledPaths.push(apiPath);
    }
    for (const calledPath of unique(calledPaths)) {
      const matches = workerRouteByPattern.filter((route) => pathMatchesPattern(calledPath, route.pattern));
      const best = matches.sort((a, b) => b.pattern.length - a.pattern.length)[0];
      if (best) addEdge({ from: nodeIdForFile(file), to: best.routeId, relation: 'calls', evidence: evidence(file, index + 1, lines[index].trim()), production: isProductionPath(file) });
    }
  }
}

for (const detail of workerDetails) {
  const workerFiles = [...sources.keys()].filter((file) => file.startsWith(`${detail.workerDirectory}/src/`) && file.endsWith('.ts') && !isTestOrGenerated(file));
  for (const file of workerFiles) {
    const source = sources.get(file);
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const match of line.matchAll(/\benv\.([A-Z][A-Z0-9_]*)\b/g)) {
        const name = match[1];
        const binding = detail.bindings.get(name);
        if (binding) {
          const context = lines.slice(index, Math.min(lines.length, index + 3)).join(' ');
          const writes = /\.(?:put|delete|batch)\s*\(|\b(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(context);
          const relation = writes ? 'writes' : 'reads';
          addEdge({ from: nodeIdForFile(file), to: binding.bindingId, relation, evidence: evidence(file, index + 1, line.trim()), production: true });
        } else {
          const envId = `environment variable:${name}`;
          addNode({ id: envId, type: 'environment variable', subtype: 'worker-runtime', label: name, modules: modulesForPath(file), metadata: {} });
          addEdge({ from: nodeIdForFile(file), to: envId, relation: 'reads', evidence: evidence(file, index + 1), production: true });
        }
      }
    }
  }
}

for (const [file, source] of sources) {
  if (!/\.(?:astro|[cm]?[jt]sx?|ya?ml)$/.test(file) || isTestOrGenerated(file) && !file.startsWith('scripts/')) continue;
  for (const regex of [/process\.env\.([A-Z][A-Z0-9_]*)/g, /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g]) {
    for (const match of source.matchAll(regex)) {
      const name = match[1];
      const envId = `environment variable:${name}`;
      addNode({ id: envId, type: 'environment variable', subtype: regex.source.startsWith('process') ? 'process' : 'astro', label: name, modules: modulesForPath(file), metadata: {} });
      addEdge({ from: nodeIdForFile(file), to: envId, relation: 'reads', evidence: evidence(file, lineOf(source, match.index)), production: isProductionPath(file) });
    }
  }
}

for (const file of files.filter((item) => item.startsWith('.github/workflows/'))) {
  const workflowId = nodeIdForFile(file);
  const source = sources.get(file);
  for (const match of source.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
    const target = `script:package:${match[1]}`;
    if (nodes.has(target)) addEdge({ from: workflowId, to: target, relation: 'invokes', evidence: evidence(file, lineOf(source, match.index)), production: false });
  }
  for (const match of source.matchAll(/^\s{6}([A-Z][A-Z0-9_]+):/gm)) {
    const envId = `environment variable:${match[1]}`;
    addNode({ id: envId, type: 'environment variable', subtype: 'github-actions', label: match[1], modules: ['Infrastructure', 'Authoring / Tooling'], metadata: {} });
    addEdge({ from: workflowId, to: envId, relation: 'configured-by', evidence: evidence(file, lineOf(source, match.index)), production: false });
  }
}

for (const [file, source] of sources) {
  if (!/\.(?:astro|[cm]?[jt]sx?)$/.test(file) || isTestOrGenerated(file)) continue;
  for (const match of source.matchAll(/getCollection\(\s*['"]([^'"]+)['"]/g)) {
    const collection = match[1];
    const collectionId = `content/data source:collection:${collection}`;
    const collectionFiles = files.filter((item) => item.startsWith(`src/data/${collection}/`));
    addNode({ id: collectionId, type: 'content/data source', subtype: 'astro-collection', label: `${collection} collection`, modules: modulesForPath(`src/data/${collection}/`), metadata: { files: collectionFiles } });
    addEdge({ from: nodeIdForFile(file), to: collectionId, relation: 'reads', evidence: evidence(file, lineOf(source, match.index)), production: isProductionPath(file) });
    for (const collectionFile of collectionFiles) addEdge({ from: collectionId, to: nodeIdForFile(collectionFile), relation: 'reads', evidence: evidence('src/content.config.ts', 1), production: true });
  }
}

for (const edge of edges.filter((item) => item.production && ['imports', 'renders'].includes(item.relation))) {
  const source = nodes.get(edge.from);
  const target = nodes.get(edge.to);
  if (!source || !target) continue;
  const consumers = source.modules.filter((module) => !['Shared', 'Infrastructure', 'Authoring / Tooling'].includes(module));
  target.metadata.consumedBy = unique([...(target.metadata.consumedBy ?? []), ...consumers]);
}

for (const detail of workerDetails) {
  const routeModules = unique(workerRouteByPattern.filter((route) => route.workerName === detail.workerName).flatMap((route) => nodes.get(route.routeId)?.modules ?? []));
  for (const binding of detail.bindings.values()) {
    nodes.get(binding.bindingId).modules = unique([...nodes.get(binding.bindingId).modules, ...routeModules]);
    nodes.get(binding.resourceId).modules = unique([...nodes.get(binding.resourceId).modules, ...routeModules]);
  }
}

const findNode = (type, fileOrLabel) => [...nodes.values()].find((node) => node.type === type && (node.metadata.file === fileOrLabel || node.label === fileOrLabel));
const sourceEvidence = (file, fragment) => {
  const source = sources.get(file) ?? '';
  const line = lineContaining(source, fragment);
  return line ? evidence(file, line, fragment) : null;
};
const findWorkerRoute = (workerName, pattern, method) => workerRouteByPattern.find((route) => route.workerName === workerName && route.pattern === pattern && (!method || route.method === method))?.routeId;
const flowStep = (label, node, ev, status = 'confirmed') => ({ label, ...(node && nodes.has(node) ? { node } : {}), status: node && !nodes.has(node) ? 'unknown' : status, ...(ev ? { evidence: ev } : {}) });

const flows = [
  {
    id: 'flow:feed-public-timeline', name: 'Feed public timeline', modules: ['Feed'], status: 'confirmed',
    steps: [
      flowStep('Browser requests /feed', 'route:site:/feed', evidence('src/pages/feed/index.astro', 1)),
      flowStep('Astro page renders FeedApp island', nodeIdForFile('src/pages/feed/index.astro'), sourceEvidence('src/pages/feed/index.astro', '<FeedApp')),
      flowStep('FeedApp loads the public timeline', nodeIdForFile('src/components/feed/FeedApp.tsx'), sourceEvidence('src/components/feed/FeedApp.tsx', 'loadPublicTimeline(apiBase)')),
      flowStep('GET /api/feed', findWorkerRoute('feed-api', '/api/feed', 'GET'), sourceEvidence('workers/feed-api/src/routes/feed.ts', "pathname === '/api/feed' && request.method === 'GET'")),
      flowStep('Feed Worker reads the catstarry D1 binding', 'binding:feed-api:DB', sourceEvidence('workers/feed-api/src/routes/feed.ts', 'new FeedStore(env.DB)')),
    ], unknowns: [],
  },
  {
    id: 'flow:feed-owner-publishing', name: 'Feed owner publishing', modules: ['Feed'], status: 'confirmed',
    steps: [
      flowStep('Owner opens publishing controls in FeedApp', nodeIdForFile('src/components/feed/FeedApp.tsx'), sourceEvidence('src/components/feed/FeedApp.tsx', 'setShowPublish(true)')),
      flowStep('Optional media POST /api/feed/upload', findWorkerRoute('feed-api', '/api/feed/upload'), sourceEvidence('src/components/feed/FeedApp.tsx', '/api/feed/upload')),
      flowStep('Upload route writes MEDIA_BUCKET', 'binding:feed-api:MEDIA_BUCKET', sourceEvidence('workers/feed-api/src/routes/upload.ts', 'env.MEDIA_BUCKET')),
      flowStep('Publish POST /api/feed', findWorkerRoute('feed-api', '/api/feed', 'POST'), sourceEvidence('src/components/feed/FeedApp.tsx', "fetch(`${apiBase}/api/feed`")),
      flowStep('Feed store writes catstarry D1', 'binding:feed-api:DB', sourceEvidence('workers/feed-api/src/adapters/feed-store.ts', 'INSERT INTO')),
    ], unknowns: [],
  },
  {
    id: 'flow:blog-article-views', name: 'Blog article + view tracking', modules: ['Blog'], status: 'confirmed',
    steps: [
      flowStep('Browser requests dynamic Blog article route', 'route:site:/blog/*slug', evidence('src/pages/blog/[...slug].astro', 1)),
      flowStep('Article page renders view components', nodeIdForFile('src/pages/blog/[...slug].astro'), sourceEvidence('src/pages/blog/[...slug].astro', '<ViewTracker')),
      flowStep('View hook calls /api/views', nodeIdForFile('src/lib/useViewCount.ts'), sourceEvidence('src/lib/useViewCount.ts', '/api/views')),
      flowStep('Feed Worker dispatches /api/views to the view handler', findWorkerRoute('feed-api', '/api/views'), sourceEvidence('workers/feed-api/src/index.ts', "pathname === '/api/views'")),
      flowStep('View route records counts in catstarry D1', 'binding:feed-api:DB', sourceEvidence('workers/feed-api/src/routes/views.ts', 'env.DB')),
      flowStep('View route uses VIEW_KV for visitor dedupe', 'binding:feed-api:VIEW_KV', sourceEvidence('workers/feed-api/src/routes/views.ts', 'env.VIEW_KV')),
    ], unknowns: [],
  },
  {
    id: 'flow:learn-public-note', name: 'Learn public note', modules: ['Learn'], status: 'confirmed',
    steps: [
      flowStep('Browser requests dynamic public note route', 'route:site:/learn/notes/:slug', evidence('src/pages/learn/notes/[slug].astro', 1)),
      flowStep('Astro reads the Learn content collection', nodeIdForFile('src/pages/learn/notes/[slug].astro'), sourceEvidence('src/pages/learn/notes/[slug].astro', "getCollection('learn')")),
      flowStep('Page renders LearnNoteView', nodeIdForFile('src/pages/learn/notes/[slug].astro'), sourceEvidence('src/pages/learn/notes/[slug].astro', '<LearnNoteView')),
    ], unknowns: [],
  },
  {
    id: 'flow:learn-private-preview', name: 'Learn private preview', modules: ['Learn'], status: 'confirmed',
    steps: [
      flowStep('Browser requests server-rendered preview route', 'route:site:/learn/preview/:slug', evidence('src/pages/learn/preview/[slug].astro', 1)),
      flowStep('Preview checks /api/auth/session with the request cookie', findWorkerRoute('feed-api', '/api/auth/session'), sourceEvidence('src/pages/learn/preview/[slug].astro', '/api/auth/session')),
      flowStep('Authenticated preview reads the Learn collection', nodeIdForFile('src/pages/learn/preview/[slug].astro'), sourceEvidence('src/pages/learn/preview/[slug].astro', "getCollection('learn')")),
    ], unknowns: [],
  },
  {
    id: 'flow:projects', name: 'Projects', modules: ['Projects'], status: 'confirmed',
    steps: [
      flowStep('Browser requests /projects', 'route:site:/projects', evidence('src/pages/projects/index.astro', 1)),
      flowStep('Projects page imports the project data module', nodeIdForFile('src/pages/projects/index.astro'), sourceEvidence('src/pages/projects/index.astro', 'project-data')),
      flowStep('Project data module reads src/data/projects/index.json', nodeIdForFile('src/components/projects/project-data.ts'), sourceEvidence('src/components/projects/project-data.ts', 'src/data/projects/index.json') ?? sourceEvidence('src/components/projects/project-data.ts', '../../data/projects/index.json')),
      flowStep('Page renders ProjectCard entries', findNode('component', 'src/components/projects/ProjectCard.astro')?.id, sourceEvidence('src/pages/projects/index.astro', '<ProjectCard')),
    ], unknowns: [],
  },
  {
    id: 'flow:finance-initial-load', name: 'Finance initial application load', modules: ['Finance'], status: 'confirmed',
    steps: [
      flowStep('Browser loads the static Finance application', 'route:finance:/', evidence('finance-site/index.html', 1)),
      flowStep('Finance app requests initial API data', nodeIdForFile('finance-site/app.js'), sourceEvidence('finance-site/app.js', '/api/holdings')),
      flowStep('Finance Worker handles GET /api/holdings', findWorkerRoute('finance-api', '/api/holdings', 'GET'), sourceEvidence('workers/finance-api/src/routes/dashboard.ts', "pathname === '/api/holdings'")),
      flowStep('Dashboard route reads finance D1', 'binding:finance-api:DB', sourceEvidence('workers/finance-api/src/routes/dashboard.ts', 'env.DB')),
    ], unknowns: [],
  },
  {
    id: 'flow:finance-market-refresh', name: 'Finance market refresh', modules: ['Finance', 'Infrastructure'], status: 'confirmed',
    steps: [
      flowStep('Wrangler Cron invokes Finance scheduled handler', 'worker:finance-api', sourceEvidence('workers/finance-api/src/index.ts', 'async scheduled')),
      flowStep('Scheduled handler calls refreshMarketData', nodeIdForFile('workers/finance-api/src/index.ts'), sourceEvidence('workers/finance-api/src/index.ts', 'refreshMarketData(env)')),
      flowStep('Refresh uses configured provider or built-in quote sources', nodeIdForFile('workers/finance-api/src/tasks/refresh-market-data.ts'), sourceEvidence('workers/finance-api/src/tasks/refresh-market-data.ts', 'MARKET_PROVIDER_URL')),
      flowStep('Refresh writes finance D1 snapshots', 'binding:finance-api:DB', sourceEvidence('workers/finance-api/src/tasks/refresh-market-data.ts', 'env.DB.batch')),
    ], unknowns: [],
  },
];

for (const flow of flows) {
  if (flow.steps.some((step) => step.status === 'unknown' || !step.evidence)) {
    flow.status = 'partial';
    flow.unknowns = flow.steps.filter((step) => step.status === 'unknown' || !step.evidence).map((step) => `Static evidence is incomplete for: ${step.label}`);
  }
}

const adjacency = new Map();
for (const edge of edges.filter((item) => item.production && DEPENDENCY_RELATIONS.has(item.relation))) {
  if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
  adjacency.get(edge.from).push(edge.to);
}
const reachable = new Set();
const queue = [...nodes.values()].filter((node) => ['configuration', 'page', 'worker', 'route', 'worker route', 'workflow'].includes(node.type)).map((node) => node.id);
for (const script of [...nodes.values()].filter((node) => node.type === 'script' && node.subtype === 'package-script')) queue.push(script.id);
while (queue.length) {
  const current = queue.shift();
  if (reachable.has(current)) continue;
  reachable.add(current);
  queue.push(...(adjacency.get(current) ?? []));
}

const findings = [];
function addFinding(finding) {
  findings.push({ id: `finding:${String(findings.length + 1).padStart(3, '0')}`, ...finding });
}

const homeAssetEdges = edges.filter((edge) => edge.production && edge.relation === 'imports' && edge.evidence?.file === 'src/components/home/HomeExperience.astro' && edge.evidence.detail?.includes('docs/design/assets'));
if (homeAssetEdges.length) addFinding({
  category: 'confirmed dependency', confidence: 'confirmed', title: 'Home production component imports selected assets from docs/design',
  description: `${homeAssetEdges.length} direct imports make docs/design/assets part of the Home production build dependency chain despite its documentation-oriented path.`,
  nodes: unique(homeAssetEdges.flatMap((edge) => [edge.from, edge.to])), evidence: homeAssetEdges.slice(0, 4).map((edge) => edge.evidence),
});

const incoming = new Map();
for (const edge of edges.filter((item) => item.production && ['imports', 'renders', 'reads', 'calls'].includes(item.relation))) {
  if (!incoming.has(edge.to)) incoming.set(edge.to, []);
  incoming.get(edge.to).push(edge);
}
for (const [target, targetEdges] of [...incoming].filter(([, value]) => unique(value.map((edge) => edge.from)).length >= 4).sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
  addFinding({
    category: 'high fan-in / shared dependency', confidence: 'confirmed', title: `${nodes.get(target).label} has high production fan-in`,
    description: `${unique(targetEdges.map((edge) => edge.from)).length} production nodes directly depend on this node. Changes deserve broad regression coverage.`,
    nodes: [target, ...unique(targetEdges.map((edge) => edge.from)).slice(0, 8)], evidence: targetEdges.slice(0, 5).map((edge) => edge.evidence),
  });
}

for (const edge of edges.filter((item) => item.production && ['imports', 'renders'].includes(item.relation))) {
  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (!from || !to) continue;
  const domainFrom = from.modules.filter((module) => !['Shared', 'Infrastructure', 'Authoring / Tooling'].includes(module));
  const domainTo = to.modules.filter((module) => !['Shared', 'Infrastructure', 'Authoring / Tooling'].includes(module));
  const crossesDomain = domainFrom.length && domainTo.length && !domainFrom.some((module) => domainTo.includes(module));
  const crossesAuthoringBoundary = domainFrom.length && to.modules.includes('Authoring / Tooling') && to.metadata.production;
  if (crossesDomain || crossesAuthoringBoundary) addFinding({
    category: 'unexpected cross-module dependency', confidence: 'inferred', title: `${from.label} crosses into ${to.label}`,
    description: `A confirmed ${edge.relation} edge crosses the inferred module boundary ${domainFrom.join(', ') || from.modules.join(', ')} → ${domainTo.join(', ') || to.modules.join(', ')}. Review whether this boundary is intentional; no production change is proposed.`,
    nodes: [edge.from, edge.to], evidence: [edge.evidence],
  });
}

for (const node of [...nodes.values()].filter((item) => item.metadata.production && item.type === 'library' && CODE_EXTENSIONS.has(path.posix.extname(item.metadata.file ?? '')) && !reachable.has(item.id) && !item.metadata.testOnly).slice(0, 30)) {
  addFinding({
    category: 'candidate dead code', confidence: 'candidate', title: `${node.label} is not reachable from a detected production entry point`,
    description: 'The static graph found no route, page, Worker, or package-script path to this file. Dynamic imports, framework conventions, or scanner limitations may still make it live; do not delete automatically.',
    nodes: [node.id], evidence: [evidence(node.metadata.file, 1)],
  });
}

const documentationSources = [...sources.entries()].filter(([file]) => /^(?:README\.md|docs\/.*\.md)$/.test(file));
for (const node of [...nodes.values()].filter((item) => item.type === 'script' && item.subtype === 'package-script')) {
  const referenced = edges.some((edge) => edge.to === node.id && edge.from !== node.id);
  const documented = documentationSources.some(([, source]) => source.includes(node.label));
  if (!referenced && !documented && !['dev', 'build', 'preview', 'inspect:repo'].includes(node.label.replace('npm run ', ''))) addFinding({
    category: 'possibly orphaned script', confidence: 'candidate', title: `${node.label} has no detected workflow, package-script, or documentation consumer`,
    description: 'This may be a legitimate manually invoked helper. The finding only records the absence of a statically detected consumer.',
    nodes: [node.id], evidence: [evidence('package.json', lineContaining(sources.get('package.json'), `"${node.label.replace('npm run ', '')}"`) ?? 1)],
  });
}

const httpHelpers = ['workers/feed-api/src/lib/http.ts', 'workers/finance-api/src/lib/http.ts'].filter((file) => filesSet.has(file));
if (httpHelpers.length === 2) {
  const exported = httpHelpers.map((file) => unique([...sources.get(file).matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)].map((match) => match[1])));
  const overlap = exported[0].filter((name) => exported[1].includes(name));
  if (overlap.length >= 2) addFinding({
    category: 'duplicated responsibility', confidence: 'inferred', title: 'Feed and Finance Workers expose overlapping HTTP helper responsibilities',
    description: `Both Worker-local HTTP helpers export ${overlap.join(', ')}. They may intentionally remain isolated; this is evidence for review, not an extraction recommendation.`,
    nodes: httpHelpers.map(nodeIdForFile), evidence: httpHelpers.map((file) => evidence(file, 1)),
  });
}

const configuredEnvNames = new Set([...nodes.values()].filter((node) => node.type === 'environment variable' && node.subtype === 'github-actions').map((node) => node.label));
for (const node of [...nodes.values()].filter((item) => item.type === 'environment variable' && item.subtype !== 'github-actions')) {
  const productionReaders = edges.filter((edge) => edge.to === node.id && edge.production);
  if (!productionReaders.length) continue;
  const documented = documentationSources.some(([, source]) => source.includes(node.label));
  if (!configuredEnvNames.has(node.label) && !documented && !['LOCALAPPDATA', 'ProgramFiles'].includes(node.label)) addFinding({
    category: 'configuration drift candidate', confidence: 'candidate', title: `${node.label} is read by code but absent from detected workflow configuration and deployment docs`,
    description: 'The variable may be supplied outside version control or only in local tooling. Confirm its source before treating this as drift.',
    nodes: [node.id], evidence: productionReaders.slice(0, 3).map((edge) => edge.evidence),
  });
}

const nodeList = sortBy([...nodes.values()], (node) => node.id);
const edgeList = sortBy(edges, (edge) => `${edge.from}|${edge.to}|${edge.relation}|${edge.evidence?.file}|${edge.evidence?.line}`);
const moduleSummaries = MODULES.map((module) => {
  const moduleNodes = nodeList.filter((node) => node.modules.includes(module));
  const moduleIds = new Set(moduleNodes.map((node) => node.id));
  const outgoing = edgeList.filter((edge) => moduleIds.has(edge.from) && !moduleIds.has(edge.to) && edge.production && DEPENDENCY_RELATIONS.has(edge.relation));
  const downstream = edgeList.filter((edge) => moduleIds.has(edge.to) && !moduleIds.has(edge.from) && edge.production && DEPENDENCY_RELATIONS.has(edge.relation));
  return {
    name: module,
    productionFiles: moduleNodes.filter((node) => node.metadata.production && node.metadata.file).map((node) => node.metadata.file),
    entryPoints: moduleNodes.filter((node) => ['route', 'page', 'worker', 'worker route'].includes(node.type)).map((node) => node.id),
    dependencies: unique(outgoing.map((edge) => edge.to)),
    downstreamDependencies: unique(downstream.map((edge) => edge.from)),
    workerApiDependencies: unique(outgoing.filter((edge) => ['worker', 'worker route', 'binding', 'D1 database', 'KV namespace', 'R2 bucket'].includes(nodes.get(edge.to)?.type)).map((edge) => edge.to)),
    contentDataDependencies: unique(outgoing.filter((edge) => nodes.get(edge.to)?.type === 'content/data source').map((edge) => edge.to)),
    sharedDependencies: unique(outgoing.filter((edge) => nodes.get(edge.to)?.modules.includes('Shared')).map((edge) => edge.to)),
  };
});

const counts = Object.fromEntries([...new Set(nodeList.map((node) => node.type))].sort().map((type) => [type, nodeList.filter((node) => node.type === type).length]));
const repository = { root: '.', head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), generatedAt: new Date().toISOString() };
const architecture = {
  schemaVersion: '0.1.0',
  repository,
  schema: {
    nodeTypes: [...new Set(nodeList.map((node) => node.type))].sort(),
    edgeRelations: [...DEPENDENCY_RELATIONS],
    confidence: ['confirmed', 'inferred', 'candidate'],
    evidence: { file: 'repository-relative path', line: '1-based source line', detail: 'optional matched source fragment' },
  },
  stats: { nodes: nodeList.length, edges: edgeList.length, productionEdges: edgeList.filter((edge) => edge.production).length, findings: findings.length, flows: flows.length, packageScripts: Object.keys(packageJson.scripts ?? {}).length, scriptFiles: nodeList.filter((node) => node.type === 'script' && node.subtype === 'source-file').length, byNodeType: counts },
  modules: moduleSummaries,
  flows,
  nodes: nodeList,
  edges: edgeList,
  limitations: [
    'Imports and JSX/Astro renders use conservative static pattern matching; computed dynamic imports and runtime-generated component names are not resolved.',
    'Worker HTTP routes are derived from pathname comparisons, prefixes, and simple regular expressions; complex router abstractions would require a parser extension.',
    'Binding reads/writes are classified from nearby method and SQL tokens. A binding name in configuration alone never counts as runtime use.',
    'Reachability cannot prove code is dead. Candidate dead code may be reached by framework conventions, generated code, runtime strings, or external callers.',
    'HTML and script call detection recognizes literal /api paths; URLs assembled entirely from runtime fragments remain unknown.',
    'Documentation is consulted only to avoid false orphan/configuration findings. Documentation references never create production dependency edges.',
    'The scanner excludes .scratch, build output, dependency directories, generated Worker declarations, and test-only files from production reachability.',
  ],
};
const findingsDocument = {
  schemaVersion: '0.1.0', repository,
  summary: Object.fromEntries(['confirmed', 'inferred', 'candidate'].map((confidence) => [confidence, findings.filter((finding) => finding.confidence === confidence).length])),
  findings,
};

function viewerHtml() {
  const data = safeHtmlJson({ architecture, findings: findingsDocument });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Repository Architecture Observatory</title>
  <style>
    :root { color-scheme: light; --bg:#f4f2ed; --panel:#fff; --ink:#1d2528; --muted:#667073; --line:#d9d6cf; --accent:#1747d1; --good:#17653b; --warn:#9a5b00; --candidate:#7852a9; }
    * { box-sizing:border-box } body { margin:0; font:14px/1.55 ui-sans-serif,system-ui,sans-serif; background:var(--bg); color:var(--ink) }
    header { padding:28px clamp(18px,4vw,56px) 20px; background:#11191c; color:#f7f4ec } h1 { margin:0 0 6px; font-size:clamp(24px,4vw,42px) } header p { margin:4px 0; color:#b9c4c7 }
    main { padding:22px clamp(18px,4vw,56px) 56px; max-width:1600px; margin:auto } .toolbar { display:flex; gap:12px; flex-wrap:wrap; position:sticky; top:0; z-index:3; padding:12px 0; background:linear-gradient(var(--bg) 80%,transparent) }
    select,input { min-height:38px; border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:7px 10px; color:inherit } input { min-width:min(360px,100%) }
    section { margin:26px 0 } h2 { margin:0 0 12px; font-size:20px } h3 { margin:0 0 8px } .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px; min-width:0 } .stats strong { display:block; font-size:25px } .muted { color:var(--muted) }
    .pill { display:inline-block; margin:2px 5px 2px 0; padding:2px 7px; border-radius:999px; background:#e9edf8; color:#253e85; font-size:12px } .confirmed { color:var(--good) } .inferred { color:var(--warn) } .candidate { color:var(--candidate) }
    ol.flow { margin:10px 0 0; padding-left:25px } ol.flow li { margin:8px 0; padding-left:4px } a { color:var(--accent); text-decoration-thickness:1px; text-underline-offset:2px }
    details { border-top:1px solid var(--line); padding-top:10px; margin-top:10px } summary { cursor:pointer; font-weight:650 } ul.compact { max-height:230px; overflow:auto; padding-left:20px; word-break:break-word }
    .node-list { display:grid; gap:8px } .node { display:grid; grid-template-columns:minmax(220px,1fr) 2fr; gap:14px } code { font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace; overflow-wrap:anywhere }
    @media (max-width:720px) { .node { grid-template-columns:1fr } header,main { padding-left:16px; padding-right:16px } }
  </style>
</head>
<body>
  <header><h1>Repository Architecture Observatory</h1><p>HEAD <code>${repository.head}</code> · ${repository.branch}</p><p>Generated ${repository.generatedAt}</p></header>
  <main>
    <div class="toolbar"><select id="moduleFilter"><option value="">All modules</option></select><select id="typeFilter"><option value="">All node types</option></select><input id="search" type="search" placeholder="Filter paths, labels, dependencies"></div>
    <section><h2>Snapshot</h2><div class="grid stats" id="stats"></div></section>
    <section><h2>Module summary</h2><div class="grid" id="modules"></div></section>
    <section><h2>Major runtime flows</h2><div class="grid" id="flows"></div></section>
    <section><h2>Maintenance findings</h2><div class="grid" id="findings"></div></section>
    <section><h2>Dependency list</h2><p class="muted" id="nodeCount"></p><div class="node-list" id="nodes"></div></section>
    <section><h2>Known blind spots</h2><ul id="limitations"></ul></section>
  </main>
  <script type="application/json" id="observatory-data">${data}</script>
  <script>
    const data=JSON.parse(document.getElementById('observatory-data').textContent); const a=data.architecture; const byId=new Map(a.nodes.map(n=>[n.id,n]));
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const ev=e=>e?'<a href="../../'+encodeURI(e.file)+'" title="'+esc(e.detail||'')+'">'+esc(e.file)+':'+e.line+'</a>':'';
    const list=(title,ids)=>ids.length?'<details><summary>'+esc(title)+' ('+ids.length+')</summary><ul class="compact">'+ids.map(id=>'<li><code>'+esc(byId.get(id)?.label||id)+'</code></li>').join('')+'</ul></details>':'';
    const modules=[...new Set(a.nodes.flatMap(n=>n.modules))].sort(); const types=[...new Set(a.nodes.map(n=>n.type))].sort();
    document.getElementById('moduleFilter').insertAdjacentHTML('beforeend',modules.map(v=>'<option>'+esc(v)+'</option>').join(''));
    document.getElementById('typeFilter').insertAdjacentHTML('beforeend',types.map(v=>'<option>'+esc(v)+'</option>').join(''));
    document.getElementById('stats').innerHTML=[['Nodes',a.stats.nodes],['Dependency edges',a.stats.edges],['Production edges',a.stats.productionEdges],['Worker routes',a.stats.byNodeType['worker route']||0],['Findings',a.stats.findings],['Flows',a.stats.flows]].map(([k,v])=>'<div class="card"><span class="muted">'+k+'</span><strong>'+v+'</strong></div>').join('');
    document.getElementById('modules').innerHTML=a.modules.map(m=>'<article class="card"><h3>'+esc(m.name)+'</h3><p><strong>'+m.productionFiles.length+'</strong> production files · <strong>'+m.entryPoints.length+'</strong> entry points</p>'+list('Entry points',m.entryPoints)+list('Dependencies',m.dependencies)+list('Downstream consumers',m.downstreamDependencies)+list('Worker / API dependencies',m.workerApiDependencies)+list('Content / data dependencies',m.contentDataDependencies)+list('Shared dependencies',m.sharedDependencies)+'</article>').join('');
    document.getElementById('flows').innerHTML=a.flows.map(f=>'<article class="card"><h3>'+esc(f.name)+'</h3><p class="'+f.status+'">'+esc(f.status)+'</p><ol class="flow">'+f.steps.map(s=>'<li><span class="'+s.status+'">'+esc(s.label)+'</span> '+ev(s.evidence)+'</li>').join('')+'</ol>'+(f.unknowns.length?'<p class="muted">'+f.unknowns.map(esc).join('<br>')+'</p>':'')+'</article>').join('');
    document.getElementById('findings').innerHTML=data.findings.findings.map(f=>'<article class="card"><p><span class="pill">'+esc(f.category)+'</span> <strong class="'+f.confidence+'">'+esc(f.confidence)+'</strong></p><h3>'+esc(f.title)+'</h3><p>'+esc(f.description)+'</p><p>'+f.evidence.map(ev).join(' · ')+'</p></article>').join('')||'<p>No findings.</p>';
    document.getElementById('limitations').innerHTML=a.limitations.map(v=>'<li>'+esc(v)+'</li>').join('');
    function renderNodes(){ const mf=document.getElementById('moduleFilter').value, tf=document.getElementById('typeFilter').value, q=document.getElementById('search').value.toLowerCase(); const filtered=a.nodes.filter(n=>(!mf||n.modules.includes(mf))&&(!tf||n.type===tf)&&(!q||JSON.stringify(n).toLowerCase().includes(q)||a.edges.some(e=>(e.from===n.id||e.to===n.id)&&JSON.stringify(e).toLowerCase().includes(q)))); document.getElementById('nodeCount').textContent=filtered.length+' visible nodes'; document.getElementById('nodes').innerHTML=filtered.slice(0,300).map(n=>{const out=a.edges.filter(e=>e.from===n.id),inc=a.edges.filter(e=>e.to===n.id);return '<article class="card node"><div><h3>'+esc(n.label)+'</h3><span class="pill">'+esc(n.type)+'</span>'+n.modules.map(m=>'<span class="pill">'+esc(m)+'</span>').join('')+'</div><div>'+list('Depends on',out.map(e=>e.to))+list('Used by',inc.map(e=>e.from))+'</div></article>'}).join('')+(filtered.length>300?'<p>Showing first 300 matching nodes.</p>':'')}
    for(const id of ['moduleFilter','typeFilter','search']) document.getElementById(id).addEventListener(id==='search'?'input':'change',renderNodes); renderNodes();
  </script>
</body></html>`;
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(OUTPUT_DIR, 'architecture.json'), `${JSON.stringify(architecture, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(OUTPUT_DIR, 'findings.json'), `${JSON.stringify(findingsDocument, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), viewerHtml(), 'utf8'),
]);

console.log(`Repository observatory generated at ${relative(OUTPUT_DIR)}/`);
console.log(`HEAD ${repository.head}`);
console.log(`Nodes ${architecture.stats.nodes} | edges ${architecture.stats.edges} | production edges ${architecture.stats.productionEdges}`);
console.log(`Routes ${counts.route ?? 0} | components ${counts.component ?? 0} | workers ${counts.worker ?? 0} | Worker routes ${counts['worker route'] ?? 0}`);
console.log(`Bindings ${counts.binding ?? 0} | package scripts ${architecture.stats.packageScripts} | script files ${architecture.stats.scriptFiles} | workflows ${counts.workflow ?? 0} | findings ${findings.length}`);
