import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function launchIsolatedBrowser() {
  const executable = findBrowserExecutable();
  const profile = await mkdtemp(path.join(os.tmpdir(), 'catstarry-browser-'));
  const processHandle = spawn(executable, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--no-sandbox',
    '--window-size=1440,900',
    'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });

  try {
    const port = await waitForDebugPort(profile, processHandle);
    const targets = await waitForTargets(port);
    const target = targets.find((candidate) => candidate.type === 'page');
    if (!target) throw new Error('Isolated browser exposed no page target');
    return {
      target,
      async close() {
        if (!processHandle.killed) processHandle.kill();
        await waitForExit(processHandle);
        await rm(profile, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (!processHandle.killed) processHandle.kill();
    await waitForExit(processHandle);
    await rm(profile, { recursive: true, force: true });
    throw error;
  }
}

function findBrowserExecutable() {
  const candidates = [
    process.env.TEST_BROWSER_PATH,
    process.env.CHROME_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const executable = candidates.find((candidate) => existsSync(candidate));
  if (!executable) throw new Error('No Chromium browser found. Set TEST_BROWSER_PATH to Chrome or Edge.');
  return executable;
}

async function waitForDebugPort(profile, processHandle) {
  const activePort = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error(`Isolated browser exited early (${processHandle.exitCode})`);
    try {
      const port = Number((await readFile(activePort, 'utf8')).split(/\r?\n/)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    await delay(100);
  }
  throw new Error('Timed out waiting for isolated browser debugging port');
}

async function waitForTargets(port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return response.json();
    } catch {}
    await delay(100);
  }
  throw new Error('Timed out waiting for isolated browser targets');
}

function waitForExit(processHandle) {
  if (processHandle.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3_000);
    processHandle.once('exit', () => { clearTimeout(timeout); resolve(); });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
