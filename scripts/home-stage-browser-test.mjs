import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { connectCdp, delay } from './lib/cdp-session.mjs';
import { freePort, stopProcessTree, waitForHttp } from './lib/dev-server.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const site = spawn(process.execPath, [path.join('node_modules', 'astro', 'bin', 'astro.mjs'), 'dev', '--host', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, ASTRO_DEV_BACKGROUND: '0' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let output = '';
site.stdout.on('data', (chunk) => { output += chunk; });
site.stderr.on('data', (chunk) => { output += chunk; });
let browser;
let cdp;

try {
  await waitForHttp(origin, { child: site, getOutput: () => output, timeoutMs: 60_000 });
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target);
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  const snapshot = async (url) => {
    await cdp.send('Page.navigate', { url });
    await cdp.waitFor('document.readyState === "complete"', `load ${url}`, 15_000);
    await delay(250);
    return cdp.evaluate('({ y: scrollY, search: location.search, height: document.documentElement.scrollHeight })');
  };
  const entry = await snapshot(`${origin}/`);
  assert.equal(entry.search, '');
  assert.ok(entry.y < 10, `normal Home must remain at Entry; received ${entry.y}`);

  const unknown = await snapshot(`${origin}/?stage=unknown`);
  assert.equal(unknown.search, '?stage=unknown');
  assert.ok(unknown.y < 10, `unknown stage must remain at Entry; received ${unknown.y}`);

  const overview = await snapshot(`${origin}/?stage=overview`);
  assert.equal(overview.search, '?stage=overview');
  assert.ok(overview.y > 100, `overview deep-link must move beyond Entry; received ${overview.y}`);
  assert.ok(overview.y < overview.height, 'overview target must use runtime journey bounds');

  const reloaded = await snapshot(`${origin}/?stage=overview`);
  assert.ok(reloaded.y > 100, `overview reload must preserve the initial stage; received ${reloaded.y}`);

  for (const reducedMotion of [false, true]) {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] });
    for (const width of [320, 390, 768, 1440]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
      await snapshot(`${origin}/?stage=overview`);
      await cdp.waitFor(`document.querySelectorAll('.planet[data-planet-state="ready"]').length === 5`, 'interactive overview');
      const labels = await cdp.evaluate(`Array.from(document.querySelectorAll('.planet-label'), (label) => {
        const style = getComputedStyle(label);
        const box = label.getBoundingClientRect();
        const rgba = style.color.match(/[\\d.]+/g).map(Number);
        let opacity = rgba.length === 4 ? rgba[3] : 1;
        for (let element = label; element; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
        return {
          name: label.firstChild.textContent,
          fontSize: parseFloat(style.fontSize) * box.height / label.offsetHeight,
          opacity,
          inView: box.left >= 0 && box.right <= document.documentElement.clientWidth && box.top >= 0 && box.bottom <= innerHeight,
        };
      })`);
      for (const label of labels) {
        const context = `${label.name} at ${width}px (reduced motion: ${reducedMotion})`;
        assert.ok(label.fontSize >= 11.9, `${context}: rendered label must be at least 12px, received ${label.fontSize}`);
        assert.ok(label.opacity >= 0.6, `${context}: label must remain readable without hover, received opacity ${label.opacity}`);
        assert.ok(label.inView, `${context}: label must stay inside the viewport`);
      }
    }
  }
  console.log('Home initial stage browser contract passed.');
} catch (error) {
  console.error(output);
  throw error;
} finally {
  cdp?.close();
  await browser?.close();
  await stopProcessTree(site);
}

