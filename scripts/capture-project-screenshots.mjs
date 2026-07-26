import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const indexPath = 'src/data/projects/index.json';
const projects = JSON.parse(await readFile(indexPath, 'utf8'));
const pending = projects.filter((project) => !project.screenshot);
if (!pending.length) {
  console.log('All public project screenshots are already configured.');
  process.exit(0);
}

await mkdir('public/assets/projects', { recursive: true });
let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target);
  const { send, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  for (const project of pending) {
    const url = new URL(project.screenshotUrl ?? project.url);
    if (url.protocol !== 'https:') throw new Error(`Project screenshot URL must use HTTPS: ${project.url}`);
    let navigation;
    try {
      navigation = await send('Page.navigate', { url: url.href }, 15_000);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Timed out waiting for Page.navigate')) throw error;
      await send('Page.stopLoading').catch(() => undefined);
    }
    if (navigation?.errorText) throw new Error(`Could not navigate to ${url.href}: ${navigation.errorText}`);
    await waitFor(`document.readyState !== 'loading'`, `${project.projectId} page`, 15_000);
    await delay(1_500);
    let pageState = await cdp.evaluate(`({ title: document.title, text: document.body?.innerText?.slice(0, 20000) ?? '' })`);
    let snapshotServer;
    if (!pageState.title && !pageState.text) {
      snapshotServer = await serveFetchedSnapshot(url);
      await send('Page.navigate', { url: snapshotServer.url }, 15_000);
      await waitFor(`document.readyState !== 'loading'`, `${project.projectId} fetched snapshot`, 15_000);
      await delay(1_500);
      pageState = await cdp.evaluate(`({ title: document.title, text: document.body?.innerText?.slice(0, 20000) ?? '' })`);
    }
    if (/Error 1014|CNAME Cross-User Banned/i.test(`${pageState.title}\n${pageState.text}`)) {
      throw new Error(`Refusing to capture an upstream error page for ${project.projectId}`);
    }
    if (!`${pageState.title}\n${pageState.text}`.toLowerCase().includes(project.name.toLowerCase())) {
      throw new Error(`Screenshot page does not identify ${project.name}: ${JSON.stringify({ title: pageState.title, text: pageState.text.slice(0, 240) })}`);
    }
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 15_000);
    const filename = `${project.projectId}.png`;
    await writeFile(path.join('public', 'assets', 'projects', filename), Buffer.from(result.data, 'base64'));
    await snapshotServer?.close();
    project.screenshot = `/assets/projects/${filename}`;
    console.log(`Captured ${project.projectId} from ${url.hostname}`);
  }

  await writeFile(indexPath, `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
} finally {
  cdp?.close();
  await browser?.close();
}

async function serveFetchedSnapshot(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; catstarry-project-capture/1.0)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Could not fetch HTML snapshot for ${url.href} (${response.status})`);
  }
  const source = await response.text();
  const html = source.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}<base href="${url.href}">`);
  const server = createServer((_request, localResponse) => {
    localResponse.setHeader('Content-Type', 'text/html; charset=utf-8');
    localResponse.end(html);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('HTML snapshot server did not expose a TCP port');
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
