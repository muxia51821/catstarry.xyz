import { setTimeout as sleep } from 'node:timers/promises';

async function smokeUrlOnce(url, timeoutMs) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { status: response.status };
  } catch (error) {
    return { error };
  }
}

async function smokeUrl(url, timeoutMs, maxAttempts, retryDelayMs) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { status, error } = await smokeUrlOnce(url, timeoutMs);
    if (error === undefined) {
      if (status !== 200) {
        throw new Error(`HTTP ${status}`);
      }
      return { status: 200 };
    }
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
    if (attempt < maxAttempts) {
      console.log(`smoke attempt ${attempt}/${maxAttempts} failed: ${url} (${message}${cause ? `; cause: ${cause}` : ''})`);
      await sleep(retryDelayMs);
    } else {
      throw new Error(cause ? `${message} (cause: ${cause})` : message);
    }
  }
}

export async function runProductionSmoke(urls, { timeoutMs = 30000, maxAttempts = 3, retryDelayMs = 3000 } = {}) {
  const settled = await Promise.allSettled(
    urls.map((url) => smokeUrl(url, timeoutMs, maxAttempts, retryDelayMs)),
  );

  const failures = [];
  for (let index = 0; index < urls.length; index++) {
    const url = urls[index];
    const result = settled[index];
    if (result.status === 'rejected') {
      const reason = result.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      failures.push(`${url}: ${message}`);
    } else if (result.value.status !== 200) {
      failures.push(`${url}: HTTP ${result.value.status}`);
    } else {
      console.log(`HTTP 200: ${url}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`production smoke failed:\n  - ${failures.join('\n  - ')}`);
  }
}
