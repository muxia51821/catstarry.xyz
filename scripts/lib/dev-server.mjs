import { once } from 'node:events';
import net from 'node:net';
import { spawn } from 'node:child_process';

export async function freePort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a local port');
  await new Promise((resolve) => probe.close(resolve));
  return address.port;
}

export async function freePorts(count) {
  const ports = [];
  while (ports.length < count) {
    const port = await freePort();
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}

export function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1');
    once(server, 'listening').then(() => resolve(), () => {});
  });
}

export function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}

export async function waitForHttp(url, { child, getOutput, timeoutMs = 90_000, intervalMs = 250 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      const output = getOutput?.() ?? '';
      throw new Error(`Astro exited before ready:${output ? `\n${output}` : ''}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const output = getOutput?.() ?? '';
  throw new Error(`Astro did not become ready: ${lastError?.message ?? 'unknown error'}${output ? `\n${output}` : ''}`);
}

export async function stopProcessTree(child, { timeoutMs = 5_000 } = {}) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    await once(killer, 'exit');
  } else child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
}
