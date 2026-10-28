import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

let generation = 0;
let reloadRequests = 0;
let scriptRequested;
let releaseScript;
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/script.js') {
    response.setHeader('Content-Type', 'text/javascript');
    releaseScript = () => response.end('window.scriptLoaded = true;');
    scriptRequested();
  } else if (request.url === '/abort') {
    request.socket.destroy();
  } else if (request.url === '/redirect') {
    response.writeHead(302, { Location: '/ready' });
    response.end();
  } else if (request.url === '/never') {
    // Keep the first document incomplete while it initiates its own reload.
    return;
  } else {
    if (request.url === '/missing') response.statusCode = 404;
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><title>Navigation fixture</title>
      <body data-generation="${++generation}">
      ${request.url === '/reload-once' && ++reloadRequests === 1
        ? '<img src="/never"><script>location.reload()</script>' : ''}
      ${request.url === '/slow' ? '<script defer src="/script.js"></script>' : ''}
      <p id="destination">${request.url}</p></body>`);
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let cdp;
let loadEvents = 0;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target, (event) => {
    if (event.method === 'Page.lifecycleEvent' && event.params.name === 'load') loadEvents++;
  });
  await cdp.navigate(`${origin}/ready`);
  const firstGeneration = await cdp.evaluate('document.body.dataset.generation');
  await cdp.navigate(`${origin}/ready`);
  assert.notEqual(await cdp.evaluate('document.body.dataset.generation'), firstGeneration,
    'same-URL navigation must wait for the replacement document');

  const requested = new Promise((resolve) => { scriptRequested = resolve; });
  let settled = false;
  const navigation = cdp.navigate(`${origin}/slow`, 'delayed script').finally(() => { settled = true; });
  // Observe a real outstanding resource rather than guessing how long navigation takes.
  await Promise.race([requested, navigation.then(() => { throw new Error('Navigation returned before script request'); })]);
  await delay(100);
  assert.equal(settled, false, 'neither the previous complete page nor the new DOM is sufficient');
  releaseScript();
  await navigation;
  assert.equal(await cdp.evaluate('window.scriptLoaded'), true);
  assert.equal(await cdp.evaluate('document.readyState'), 'complete');

  const timeOrigin = await cdp.evaluate('performance.timeOrigin');
  await cdp.navigate(`${origin}/slow#destination`);
  assert.equal(await cdp.evaluate('performance.timeOrigin'), timeOrigin,
    'hash navigation must not wait for a new document');
  assert.equal(await cdp.evaluate('location.hash'), '#destination');

  await cdp.navigate(`${origin}/redirect`);
  assert.equal(await cdp.evaluate('location.pathname'), '/ready', 'HTTP redirect must complete at its destination');
  await cdp.navigate(`${origin}/reload-once`, 'reload before first load');
  assert.equal(reloadRequests, 2, 'a replacement document must finish even if the first document never loaded');
  assert.equal(await cdp.evaluate('document.readyState'), 'complete');
  await cdp.navigate(`${origin}/missing`);
  assert.equal(await cdp.evaluate('document.querySelector("p").textContent'), '/missing',
    'HTTP error pages are loaded documents, not transport failures');

  await assert.rejects(cdp.navigate(`${origin}/abort`, 'aborted document'), /aborted document.*net::ERR_/);
  await cdp.navigate(`${origin}/ready`, 'recovery after failure');
  scriptRequested = () => {};
  await assert.rejects(cdp.navigate(`${origin}/slow`, 'blocked load', 500), /blocked load.*Timed out/);
  await cdp.send('Page.stopLoading');
  await cdp.navigate(`${origin}/ready`, 'recovery after timeout');
  assert.ok(loadEvents > 0, 'navigation tracking must preserve caller lifecycle events');
  console.log('Browser navigation passed: replacement document, delayed load, hash, redirect, 404, failure, timeout and recovery.');
} finally {
  releaseScript?.();
  cdp?.close();
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
