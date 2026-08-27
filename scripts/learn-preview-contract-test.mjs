import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { closeServer, freePorts, listen, stopProcessTree, waitForHttp } from './lib/dev-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const [sessionPort, sitePort] = await freePorts(2);
const sessionOrigin = `http://127.0.0.1:${sessionPort}`;
const siteOrigin = `http://127.0.0.1:${sitePort}`;
let publicationRecords = [];
const sessionServer = createServer(async (request, response) => {
  if (request.url === '/api/learn/publications') {
    if ((request.headers.cookie ?? '').includes('publication-error=1')) {
      response.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unavailable' }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      entries: publicationRecords.filter((entry) => entry.visibility === 'public')
        .map(({ slug, published_at }) => ({ slug, published_at })),
    }));
    return;
  }
  if (request.url === '/api/learn/admin/publications') {
    if (!(request.headers.cookie ?? '').includes('preview-token=1')) {
      response.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    if (request.method === 'PATCH') {
      const payload = JSON.parse(await requestBody(request));
      const previous = publicationRecords.find((entry) => entry.slug === payload.slug);
      const now = new Date().toISOString();
      const entry = previous
        ? { ...previous, visibility: payload.visibility, updated_at: now }
        : {
            slug: payload.slug,
            visibility: 'public',
            published_at: now,
            last_revised_at: payload.revised_at ?? null,
            updated_at: now,
          };
      publicationRecords = [...publicationRecords.filter((candidate) => candidate.slug !== entry.slug), entry];
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ entry, created: !previous }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ entries: publicationRecords }));
    return;
  }
  if (request.url !== '/api/auth/session') {
    response.writeHead(404).end();
    return;
  }
  if ((request.headers.cookie ?? '').includes('preview-error=1')) {
    response.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unavailable' }));
    return;
  }
  const authenticated = (request.headers.cookie ?? '').includes('preview-token=1');
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify({
    authenticated,
    username: authenticated ? 'local-preview' : null,
  }));
});
let site;

try {
  await listen(sessionServer, sessionPort);
  site = spawn(process.execPath, [astro, 'dev', '--host', '127.0.0.1', '--port', String(sitePort), '--ignore-lock'], {
    cwd: root,
    env: {
      ...process.env,
      ASTRO_DEV_BACKGROUND: '0',
      FEED_API_URL: sessionOrigin,
      PUBLIC_FEED_API_URL: sessionOrigin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  site.stdout.on('data', (chunk) => { output += chunk; });
  site.stderr.on('data', (chunk) => { output += chunk; });
  await waitForHttp(`${siteOrigin}/`, { child: site, getOutput: () => output });

  for (const adminPath of ['/feed/admin/', '/learn/admin/']) {
    const unauthenticatedAdmin = await fetch(`${siteOrigin}${adminPath}`, { redirect: 'manual' });
    assert.ok([301, 302, 303, 307, 308].includes(unauthenticatedAdmin.status), adminPath);
    assert.equal(unauthenticatedAdmin.headers.get('location'), '/feed/', adminPath);
    const unavailableAdmin = await fetch(`${siteOrigin}${adminPath}`, { headers: { Cookie: 'preview-error=1' } });
    assert.equal(unavailableAdmin.status, 503, adminPath);
    const authenticatedAdmin = await fetch(`${siteOrigin}${adminPath}`, { headers: { Cookie: 'preview-token=1' } });
    assert.equal(authenticatedAdmin.status, 200, adminPath);
  }

  const previewUrl = `${siteOrigin}/learn/preview/domain-dns-http/`;
  const unauthenticated = await fetch(previewUrl, { redirect: 'manual' });
  assert.ok([301, 302, 303, 307, 308].includes(unauthenticated.status));
  assert.equal(unauthenticated.headers.get('location'), '/feed/');
  assert.equal(unauthenticated.headers.get('cache-control'), 'private, no-store');
  assert.equal(unauthenticated.headers.get('pragma'), 'no-cache');
  assert.equal(unauthenticated.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.doesNotMatch(await unauthenticated.text(), /域名、DNS 与 HTTP/);

  const unavailable = await fetch(previewUrl, {
    headers: { Cookie: 'preview-error=1' },
  });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('cache-control'), 'private, no-store');
  assert.doesNotMatch(await unavailable.text(), /域名、DNS 与 HTTP/);

  const authenticated = await fetch(previewUrl, {
    headers: { Cookie: 'preview-token=1' },
  });
  assert.equal(authenticated.status, 200);
  assert.equal(authenticated.headers.get('cache-control'), 'private, no-store');
  assert.equal(authenticated.headers.get('pragma'), 'no-cache');
  assert.equal(authenticated.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  const authenticatedBody = await authenticated.text();
  assert.match(authenticatedBody, /PRIVATE PREVIEW/);
  assert.match(authenticatedBody, /域名、DNS 与 HTTP/);
  assert.match(authenticatedBody, /浏览器如何找到 catstarry\.xyz/);
  assert.match(authenticatedBody, /<meta name="robots" content="noindex,nofollow,noarchive"/);
  assert.doesNotMatch(authenticatedBody, /Publish locally/, 'production-like preview must not expose a writable Publish capability');
  assert.match(authenticatedBody, /data-learn-chapter-nav/);
  assert.equal((authenticatedBody.match(/<h1/g) ?? []).length, 1, 'Preview must render exactly one page H1');

  const gitDraft = await fetch(`${siteOrigin}/learn/preview/git-recovery-reflog-reset/`, {
    headers: { Cookie: 'preview-token=1' },
  });
  assert.equal(gitDraft.status, 200);
  const gitDraftBody = await gitDraft.text();
  assert.match(gitDraftBody, /PRIVATE PREVIEW/);
  assert.match(gitDraftBody, /Git 出问题时先找证据：Reflog、Reset 与安全恢复/);
  assert.match(gitDraftBody, /STOP/);

  const missing = await fetch(`${siteOrigin}/learn/preview/not-a-real-note/`, {
    headers: { Cookie: 'preview-token=1' },
  });
  assert.equal(missing.status, 404);
  assert.doesNotMatch(await missing.text(), /域名、DNS 与 HTTP/);

  const publicDraft = await fetch(`${siteOrigin}/learn/notes/domain-dns-http/`);
  assert.equal(publicDraft.status, 404);
  assert.doesNotMatch(await publicDraft.text(), /域名、DNS 与 HTTP/);

  const publishThroughAdmin = await fetch(`${siteOrigin}/learn/admin/lifecycle`, {
    method: 'PATCH',
    headers: { Cookie: 'preview-token=1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'domain-dns-http',
      visibility: 'public',
      title: '域名、DNS 与 HTTP：浏览器如何找到 catstarry.xyz',
      excerpt: 'runtime publication fixture',
      revised_at: null,
    }),
  });
  assert.equal(publishThroughAdmin.status, 200);
  const publicRuntime = await fetch(`${siteOrigin}/learn/notes/domain-dns-http/`);
  assert.equal(publicRuntime.status, 200, 'runtime Public must become readable without rebuilding Astro');
  const publicRuntimeBody = await publicRuntime.text();
  assert.match(publicRuntimeBody, /data-learn-chapter-nav/);
  const firstH2Anchor = publicRuntimeBody.match(/<h2 id="([^"]+)"/)?.[1];
  assert.ok(firstH2Anchor, 'published fixture must render an H2 anchor');
  assert.ok(publicRuntimeBody.includes(`href="#${firstH2Anchor}"`), 'chapter navigation must use rendered H2 anchors');
  assert.equal((publicRuntimeBody.match(/<h1/g) ?? []).length, 1, 'Public Note must render exactly one page H1');

  publicationRecords = publicationRecords.map((entry) => ({ ...entry, visibility: 'hidden' }));
  assert.equal((await fetch(`${siteOrigin}/learn/notes/domain-dns-http/`)).status, 404);
  assert.equal((await fetch(`${siteOrigin}/learn/`, { headers: { Cookie: 'publication-error=1' } })).status, 503);

  for (const [slug, title] of [
    ['vibe-coding-mission', 'Vibe Coding：与 AI 协作的学习任务'],
    ['site-context-and-terms', 'catstarry.xyz 项目上下文与术语'],
    ['content-canvas-and-accessibility', 'Content 画布与可访问性'],
    ['english-reading-resources', '英语：阅读技术文档与日常输入'],
    ['typing-foundation', '打字：把想法稳定地转成输出'],
  ]) {
    const withdrawn = await fetch(`${siteOrigin}/learn/notes/${slug}/`, { headers: { Cookie: 'publication-error=1' } });
    assert.equal(withdrawn.status, 200, slug);
    const withdrawnBody = await withdrawn.text();
    assert.match(withdrawnBody, /此笔记已退出当前 Learn corpus；页面暂时保留用于历史链接。/, slug);
    assert.match(withdrawnBody, new RegExp(title), slug);
  }

  const learnHome = await fetch(`${siteOrigin}/learn/`);
  assert.equal(learnHome.status, 200);
  const learnHomeBody = await learnHome.text();
  assert.match(learnHomeBody, /暂时还没有公开的学习笔记。/);
  for (const title of [
    '域名、DNS 与 HTTP',
    'Git 出问题时先找证据',
    'Vibe Coding：与 AI 协作的学习任务',
  ]) assert.doesNotMatch(learnHomeBody, new RegExp(title));

  const adminSource = await readFile(path.join(root, 'src', 'pages', 'learn', 'admin.astro'), 'utf8');
  assert.match(adminSource, /LearnLifecycleAdmin/);
  assert.match(adminSource, /href="\/feed\/admin\/"/);
  const adminComponent = await readFile(path.join(root, 'src', 'components', 'learn', 'LearnLifecycleAdmin.tsx'), 'utf8');
  assert.match(adminComponent, /learn\/preview\/\$\{encodeURIComponent\(entry\.slug\)\}/);
  assert.match(adminComponent, />预览<\/a>/);
  assert.match(adminComponent, /\? 'Show' : 'Publish'/);
  const previewSource = await readFile(path.join(root, 'src', 'pages', 'learn', 'preview', '[slug].astro'), 'utf8');
  assert.doesNotMatch(previewSource, /LOCAL_LEARN_PUBLISH/);
  const noteViewSource = await readFile(path.join(root, 'src', 'components', 'learn', 'LearnNoteView.astro'), 'utf8');
  assert.match(noteViewSource, /chapters\.length >= 2/);
  assert.match(noteViewSource, /heading\.depth === 2/);
  const learnCssSource = await readFile(path.join(root, 'src', 'components', 'learn', 'learn.css'), 'utf8');
  assert.match(learnCssSource, /min-inline-size:\s*var\(--interaction-hit-size\)/);
  const learnRouteSource = await readFile(path.join(root, 'workers', 'feed-api', 'src', 'routes', 'learn.ts'), 'utf8');
  assert.doesNotMatch(learnRouteSource, /completeSection|requestPublication|learn_section_completed/);
  console.log('Learn preview contract passed.');
} catch (error) {
  if (site && site.exitCode === null) console.error(siteOutput(site));
  throw error;
} finally {
  await stopProcessTree(site);
  await closeServer(sessionServer);
}

function siteOutput(child) {
  return child.stdout ? 'Astro dev process output captured.' : 'Astro dev process output unavailable.';
}

function requestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.once('end', () => resolve(body));
    request.once('error', reject);
  });
}
