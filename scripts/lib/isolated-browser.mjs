import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const profileCleanupOptions = {
  recursive: true,
  force: true,
  maxRetries: 20,
  retryDelay: 250,
};

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
        await stopBrowserProcessTree(processHandle, profile);
        await waitForExit(processHandle);
        await rm(profile, profileCleanupOptions);
      },
    };
  } catch (error) {
    await stopBrowserProcessTree(processHandle, profile);
    await waitForExit(processHandle);
    await rm(profile, profileCleanupOptions);
    throw error;
  }
}

async function stopBrowserProcessTree(processHandle, profile) {
  if (process.platform !== 'win32') {
    if (processHandle.exitCode !== null) return;
    if (!processHandle.killed) processHandle.kill();
    return;
  }
  if (processHandle.exitCode === null) {
    if (!processHandle.killed) processHandle.kill();
    await runWindowsCommand('taskkill.exe', ['/PID', String(processHandle.pid), '/T', '/F']);
  }
  const escapedProfile = profile.replaceAll("'", "''");
  await runWindowsCommand('pwsh.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `$profile = '${escapedProfile}'; Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('chrome.exe', 'msedge.exe') -and $_.CommandLine -and $_.CommandLine.Contains($profile) } | ForEach-Object { & taskkill.exe /PID $_.ProcessId /T /F | Out-Null }`,
  ]);
}

function runWindowsCommand(executable, args) {
  return new Promise((resolve) => {
    const child = spawn(executable, args, { stdio: 'ignore', windowsHide: true });
    const timeout = setTimeout(() => {
      child.kill();
      resolve();
    }, 5_000);
    child.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.once('error', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
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
    try {
      const port = Number((await readFile(activePort, 'utf8')).split(/\r?\n/)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    if (processHandle.exitCode !== null && (process.platform !== 'win32' || processHandle.exitCode !== 0)) {
      throw new Error(`Isolated browser exited early (${processHandle.exitCode})`);
    }
    await delay(100);
  }
  if (processHandle.exitCode !== null) throw new Error(`Isolated browser exited early (${processHandle.exitCode})`);
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
