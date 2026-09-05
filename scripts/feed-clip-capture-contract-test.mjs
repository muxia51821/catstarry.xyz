import assert from 'node:assert/strict';

import {
  captureClipArticle,
  parsePublicWebUrl,
} from '../workers/feed-api/src/modules/clip-capture.ts';

const ARTICLE_TEXT = '这是正文证据。'.repeat(120);

function htmlResponse(html, init = {}) {
  return new Response(html, {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...init.headers },
  });
}

function articleHtml({ title = 'Readable title', image = '/cover.jpg', description = 'Metadata only evidence', body = ARTICLE_TEXT } = {}) {
  return `<!doctype html><html><head>
    <title>Document title</title>
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="article:published_time" content="2026-09-01T08:00:00Z">
  </head><body><article><h1>${title}</h1><p>${body}</p></article></body></html>`;
}

for (const value of [
  '', 'not a URL', 'ftp://example.com/article', 'https://user:pass@example.com/article',
  'http://localhost/article', 'http://a.localhost/article', 'http://127.0.0.1/article',
  'http://10.0.0.1/article', 'http://172.16.0.1/article', 'http://192.168.1.1/article',
  'http://169.254.1.1/article', 'http://100.64.0.1/article', 'http://192.0.2.1/article',
  'http://[::]/article', 'http://[::1]/article', 'http://[fd00::1]/article',
  'http://[fe80::1]/article', 'http://[2001:db8::1]/article',
  'https://example.com:8443/article', 'http://example.com:8080/article',
]) {
  assert.equal(parsePublicWebUrl(value), null, `unsafe URL must be rejected: ${value}`);
}
assert.equal(parsePublicWebUrl('https://example.com/article')?.href, 'https://example.com/article');
assert.equal(parsePublicWebUrl('http://example.com:80/article')?.href, 'http://example.com/article');
assert.equal(parsePublicWebUrl('https://[2606:4700:4700::1111]/article')?.hostname, '[2606:4700:4700::1111]');

{
  const calls = [];
  const result = await captureClipArticle('https://origin.example/start', async (input, init) => {
    calls.push({ url: String(input), init });
    if (calls.length === 1) return new Response(null, { status: 302, headers: { Location: '/article/final' } });
    return htmlResponse(articleHtml());
  });
  assert.equal(result.status, 'article');
  assert.equal(result.originalUrl, 'https://origin.example/start');
  assert.equal(result.finalUrl, 'https://origin.example/article/final');
  assert.equal(result.title, 'Readable title');
  assert.equal(result.metadataDescription, 'Metadata only evidence');
  assert.equal(result.image, 'https://origin.example/cover.jpg');
  assert.ok(result.article?.textContent.length >= 500, 'normal static article must produce sufficient evidence');
  assert.equal(result.article?.publishedTime, '2026-09-01T08:00:00Z');
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ init }) => init.redirect === 'manual'));
  assert.equal(calls[0].init.signal, calls[1].init.signal, 'one total timeout signal must cover all hops');
}

{
  let calls = 0;
  const result = await captureClipArticle('https://public.example/start', async () => {
    calls += 1;
    return new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } });
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'fetch_failed');
  assert.equal(calls, 1, 'private redirect target must be rejected before the next fetch');
}

{
  const calls = [];
  const result = await captureClipArticle('https://first.example/start', async (input) => {
    calls.push(String(input));
    return calls.length === 1
      ? new Response(null, { status: 301, headers: { Location: 'https://second.example/article' } })
      : htmlResponse(articleHtml());
  });
  assert.equal(result.status, 'article');
  assert.deepEqual(calls, ['https://first.example/start', 'https://second.example/article']);
}

{
  let calls = 0;
  const result = await captureClipArticle('https://redirect.example/0', async (input) => {
    calls += 1;
    return new Response(null, { status: 302, headers: { Location: new URL(String(input)).pathname === '/5' ? '/6' : `/${calls}` } });
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'fetch_failed');
  assert.equal(calls, 6, 'initial request plus five redirects is the hard maximum');
}

{
  const metadataOnly = await captureClipArticle('https://example.com/card', async () => htmlResponse(`
    <html><head><title>Card title</title><meta name="description" content="Card description"></head>
    <body><main>Short shell</main></body></html>`));
  assert.equal(metadataOnly.status, 'metadata');
  assert.equal(metadataOnly.reason, 'article_unavailable');
  assert.equal(metadataOnly.title, 'Card title');
  assert.equal(metadataOnly.metadataDescription, 'Card description');
  assert.equal(metadataOnly.article, null);
}

{
  const challenge = await captureClipArticle('https://example.com/challenge', async () => htmlResponse(`
    <html><head><title>Checking your browser</title></head><body>Enable JavaScript to continue.</body></html>`));
  assert.equal(challenge.status, 'metadata');
  assert.equal(challenge.article, null, 'challenge/tiny shell must not become article evidence');
}

{
  const challengeBody = 'Verify you are human. Just a moment while we check your browser. '.repeat(30);
  const longChallenge = await captureClipArticle('https://example.com/long-challenge', async () => htmlResponse(`
    <html><head><title>Just a moment</title></head><body><article><h1>Verify you are human</h1><p>${challengeBody}</p></article></body></html>`));
  assert.equal(longChallenge.status, 'metadata');
  assert.equal(longChallenge.article, null, 'a long challenge page must not become article evidence');
}

{
  const realArticle = await captureClipArticle('https://example.com/challenge-analysis', async () => htmlResponse(`
    <html><head><title>How Just a moment challenge pages work</title></head><body><article><h1>How challenge pages work</h1><p>Verify you are human is a common challenge message.</p><p>${ARTICLE_TEXT}</p></article></body></html>`));
  assert.equal(realArticle.status, 'article');
  assert.ok(realArticle.article, 'an article discussing challenge pages must remain article evidence');
}

{
  const malformed = await captureClipArticle('https://example.com/broken', async () => htmlResponse(
    `<html><head><meta property="og:title" content="Broken but useful"></head><body><article><h1>Broken</h1><p>${ARTICLE_TEXT}`,
  ));
  assert.equal(malformed.status, 'article', 'DOM parser and Readability must tolerate malformed HTML');
}

{
  const result = await captureClipArticle('https://example.com/plain', async () => new Response('plain', {
    headers: { 'Content-Type': 'text/plain' },
  }));
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: 'failed', reason: 'non_html' });
}

{
  const oversized = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(700_000));
      controller.enqueue(new Uint8Array(400_000));
      controller.close();
    },
  });
  const result = await captureClipArticle('https://example.com/large', async () => new Response(oversized, {
    headers: { 'Content-Type': 'text/html', 'Content-Length': '12' },
  }));
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: 'failed', reason: 'content_too_large' });
}

{
  const declaredLarge = await captureClipArticle('https://example.com/declared-large', async () => htmlResponse('small', {
    headers: { 'Content-Length': String(2 * 1024 * 1024) },
  }));
  assert.deepEqual({ status: declaredLarge.status, reason: declaredLarge.reason }, { status: 'failed', reason: 'content_too_large' });
}

console.log('Feed Clip capture contract passed.');
