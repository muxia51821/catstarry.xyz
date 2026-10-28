const DEFAULT_TIMEOUT_MS = 5_000;

export async function connectCdp(target, onEvent = () => {}) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await withTimeout(new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  }), DEFAULT_TIMEOUT_MS, 'CDP socket connection');

  let commandId = 0;
  const pending = new Map();
  const loadedDocuments = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      clearTimeout(item.timeout);
      if (message.error) item.reject(new Error(`${item.method}: ${message.error.message}`));
      else item.resolve(message.result);
      return;
    }
    if (message.method === 'Page.lifecycleEvent' && message.params.name === 'load') {
      loadedDocuments.set(message.params.frameId, message.params.loaderId);
    }
    if (message.method === 'Page.frameDetached') loadedDocuments.delete(message.params.frameId);
    if (message.method) onEvent(message);
  });

  socket.addEventListener('close', () => {
    for (const item of pending.values()) {
      clearTimeout(item.timeout);
      item.reject(new Error(`CDP socket closed while waiting for ${item.method}`));
    }
    pending.clear();
  });

  function send(method, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('CDP socket is not open'));
    const id = ++commandId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      pending.set(id, { method, resolve, reject, timeout });
    });
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  }

  async function waitFor(expression, label, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        if (await evaluate(expression)) return;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
      }
      await delay(100);
    }
    throw new Error(`Timed out waiting for ${label}`);
  }

  async function navigate(url, label = url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;
    const remaining = () => {
      const milliseconds = deadline - Date.now();
      if (milliseconds <= 0) throw new Error(`Timed out waiting for ${label} (${url})`);
      return milliseconds;
    };
    try {
      await send('Page.enable', {}, remaining());
      await send('Page.setLifecycleEventsEnabled', { enabled: true }, remaining());
      const previous = (await send('Page.getFrameTree', {}, remaining())).frameTree.frame;
      const navigation = await send('Page.navigate', { url }, remaining());
      if (navigation.errorText) throw new Error(navigation.errorText);
      if (navigation.isDownload) throw new Error('Navigation started a download');
      // Same-document navigation has no new loader. A dev-server reload may
      // replace the requested document before it loads, so follow the current
      // document while excluding the one that existed before this navigation.
      if (!navigation.loaderId) return;
      while (true) {
        if (socket.readyState !== WebSocket.OPEN) throw new Error('CDP socket closed during navigation');
        const current = (await send('Page.getFrameTree', {}, remaining())).frameTree.frame;
        if (current.id === navigation.frameId && current.loaderId !== previous.loaderId
          && loadedDocuments.get(current.id) === current.loaderId) return;
        await delay(Math.min(25, remaining()));
      }
    } catch (error) {
      throw new Error(`Navigation failed for ${label} (${url}): ${error.message}`, { cause: error });
    }
  }

  return {
    send,
    evaluate,
    waitFor,
    navigate,
    close() {
      if (socket.readyState === WebSocket.OPEN) socket.close();
    },
  };
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), timeoutMs)),
  ]);
}

export function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
