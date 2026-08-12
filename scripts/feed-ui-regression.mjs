import assert from 'node:assert/strict';
import path from 'node:path';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const baseUrl = (process.env.FEED_UI_URL ?? 'http://127.0.0.1:4322').replace(/\/$/, '');
const parsedBaseUrl = new URL(baseUrl);
const isLocalTarget = ['127.0.0.1', 'localhost', '::1'].includes(parsedBaseUrl.hostname);
if (!isLocalTarget && process.env.FEED_UI_ALLOW_REMOTE !== '1') {
  throw new Error('Feed UI regression is restricted to localhost unless FEED_UI_ALLOW_REMOTE=1 is explicitly set.');
}

const username = process.env.FEED_UI_USERNAME;
const password = process.env.FEED_UI_PASSWORD;
if (!username || !password) {
  throw new Error('FEED_UI_USERNAME and FEED_UI_PASSWORD are required for the Feed UI regression test.');
}

const diagnostics = {
  consoleProblems: [],
  exceptions: [],
  requests: [],
  checks: {},
};
let createdText = '';
const createdNativeContents = [];
const createdNativeTitles = [];
let cleanupCompleted = false;

function consoleText(args) {
  return args.map((value) => value.value ?? value.description ?? value.type).join(' ');
}

let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      diagnostics.consoleProblems.push({ type: message.params.type, text: consoleText(message.params.args) });
    }
    if (message.method === 'Network.requestWillBeSent') {
      diagnostics.requests.push({ method: message.params.request.method, url: message.params.request.url });
    }
  });
  const { send, evaluate, waitFor } = cdp;

  async function click(selector) {
    const point = await evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    })()`);
    assert.ok(point, `Missing ${selector}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  }

  async function key(key, modifiers = 0) {
    const keyCode = key === 'Escape' ? 27 : key === 'Tab' ? 9 : 0;
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('DOM.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = (init?.method ?? (typeof input === 'string' ? 'GET' : input.method) ?? 'GET').toUpperCase();
      if (localStorage.getItem('feed-ui-empty') === '1' && url.endsWith('/api/feed?limit=20')) {
        return Promise.resolve(new Response(JSON.stringify({ items: [], cursor: null, has_more: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (window.__feedDelayPagination && url.includes('/api/feed?limit=20&cursor=')) {
        return new Promise((resolve) => setTimeout(() => resolve(nativeFetch(input, init)), 400));
      }
      if (url.endsWith('/api/feed?limit=20')) {
        return new Promise((resolve) => setTimeout(() => resolve(nativeFetch(input, init)), 400));
      }
      return nativeFetch(input, init);
    };
  })();` });
  await send('Network.clearBrowserCookies');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${baseUrl}/feed/` });
  await waitFor(
    `document.readyState === 'complete' && document.querySelector('.feed-owner-actions')?.dataset.sessionReady === 'true'`,
    'Feed application',
    10_000,
  );
  diagnostics.checks.publicSemantics = await evaluate(`(() => ({
    opening: document.querySelector('.feed-header > p')?.textContent?.trim(),
    hasEyebrow: Boolean(document.querySelector('.feed-eyebrow')),
    ownerActions: [...document.querySelectorAll('.feed-owner-actions .feed-owner-action')].map((node) => node.textContent.trim()),
    hasManageRows: Boolean(document.querySelector('.feed-admin-row')),
  }))()`);

  const alreadyAuthenticated = await evaluate(`Boolean(document.querySelector('.feed-owner-publish'))`);
  diagnostics.checks.session = { authenticated: alreadyAuthenticated };
  if (!alreadyAuthenticated) {
    await click('.feed-owner-actions .feed-owner-action');
    await waitFor(`Boolean(document.querySelector('.feed-dialog[aria-label="登录"]'))`, 'login dialog');
    diagnostics.checks.loginModal = await evaluate(`(() => {
      const dialog = document.querySelector('.feed-dialog[aria-label="登录"]');
      const timeline = document.querySelector('.feed-timeline');
      return {
        activeInside: dialog?.contains(document.activeElement) ?? false,
        backgroundInert: timeline?.inert ?? false,
        backgroundHidden: timeline?.getAttribute('aria-hidden') === 'true',
      };
    })()`);
    await key('Tab', 8);
    diagnostics.checks.loginKeyboard = await evaluate(`document.querySelector('.feed-dialog[aria-label="登录"]')?.contains(document.activeElement) ?? false`);
    await evaluate(`(() => {
      const [name, pass] = document.querySelectorAll('.feed-dialog input');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(name, ${JSON.stringify(username)});
      name.dispatchEvent(new Event('input', { bubbles: true }));
      set.call(pass, ${JSON.stringify(password)});
      pass.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await click('.feed-dialog[aria-label="登录"] .feed-button');
    await waitFor(`Boolean(document.querySelector('.feed-owner-publish'))`, 'owner browsing controls');
    diagnostics.checks.loginDoesNotOpenComposer = await evaluate(
      `!document.querySelector('.feed-dialog[aria-label="发布 Feed"]')`,
    );
  }

  await waitFor(`Boolean(document.querySelector('.feed-owner-publish'))`, 'authenticated publish action');
  const publishAlreadyOpen = await evaluate(
    `Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]'))`,
  );
  if (!publishAlreadyOpen) await click('.feed-owner-publish');
  await waitFor(`Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]'))`, 'publish dialog');

  diagnostics.checks.publishModal = await evaluate(`(() => {
    const dialog = document.querySelector('.feed-dialog[aria-label="发布 Feed"]');
    const timeline = document.querySelector('.feed-timeline');
    const button = dialog?.querySelector('.feed-button[type="submit"]');
    return {
      activeInside: dialog?.contains(document.activeElement) ?? false,
      backgroundInert: timeline?.inert ?? false,
      backgroundHidden: timeline?.getAttribute('aria-hidden') === 'true',
      emptyDisabled: button?.disabled ?? null,
    };
  })()`);
  const text = `browser-regression:${crypto.randomUUID()}`;
  createdText = text;
  createdNativeContents.push(text);
  await evaluate(`(() => {
    const textarea = document.querySelector('.feed-dialog[aria-label="发布 Feed"] textarea');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    set.call(textarea, ${JSON.stringify(text)});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const documentNode = await send('DOM.getDocument');
  const fileInput = await send('DOM.querySelector', {
    nodeId: documentNode.root.nodeId,
    selector: '.feed-dialog[aria-label="发布 Feed"] input[type="file"]',
  });
  assert.ok(fileInput.nodeId, 'Publish file input must exist');
  await send('DOM.setFileInputFiles', {
    nodeId: fileInput.nodeId,
    files: [
      path.resolve('public/assets/projects/catstarry-xyz.png'),
      path.resolve('package.json'),
    ],
  });
  await waitFor(
    `[...document.querySelectorAll('.feed-upload-list li')].some((item) => item.textContent.includes('已上传')) && [...document.querySelectorAll('.feed-upload-list li')].some((item) => item.textContent.includes('文件类型不受支持') || item.textContent.includes('上传失败'))`,
    'partial upload result',
    10_000,
  );
  diagnostics.checks.partialUpload = await evaluate(`(() => {
    const items = [...document.querySelectorAll('.feed-upload-list li')];
    const failed = items.find((item) => item.textContent.includes('失败') || item.textContent.includes('不受支持'));
    const success = items.find((item) => item.textContent.includes('已上传'));
    return {
      successPreserved: Boolean(success),
      failedHasRetry: [...(failed?.querySelectorAll('button') ?? [])].some((button) => button.textContent.trim() === '重试'),
      failedHasRemove: [...(failed?.querySelectorAll('button') ?? [])].some((button) => button.textContent.trim() === '移除'),
    };
  })()`);
  await evaluate(`(() => {
    const failed = [...document.querySelectorAll('.feed-upload-list li')].find((item) => item.textContent.includes('失败') || item.textContent.includes('不受支持'));
    [...(failed?.querySelectorAll('button') ?? [])].find((button) => button.textContent.trim() === '移除')?.click();
  })()`);
  await send('DOM.setFileInputFiles', {
    nodeId: fileInput.nodeId,
    files: [path.resolve('public/blog/start-writing/starry-in-bowl.jpg')],
  });
  await waitFor(
    `[...document.querySelectorAll('.feed-upload-list li')].filter((item) => item.textContent.includes('已上传')).length === 2`,
    'two successful image uploads',
    10_000,
  );
  await waitFor(`document.querySelector('.feed-dialog[aria-label="发布 Feed"] .feed-button[type="submit"]')?.disabled === false`, 'enabled publish action');
  diagnostics.checks.publish = await evaluate(`(() => {
    const dialog = document.querySelector('.feed-dialog[aria-label="发布 Feed"]');
    const button = dialog.querySelector('.feed-button[type="submit"]');
    const textarea = dialog.querySelector('textarea');
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      disabled: button.disabled,
      pointerEvents: getComputedStyle(button).pointerEvents,
      hit: hit === button || button.contains(hit),
      textarea: textarea.value,
    };
  })()`);
  await evaluate(`document.querySelector('.feed-dialog[aria-label="发布 Feed"] .feed-button[type="submit"]')?.click()`);
  await waitFor(
    `document.readyState === 'complete' && !document.querySelector('.feed-dialog[aria-label="发布 Feed"]') && Boolean(document.querySelector('.feed-owner-publish'))`,
    'canonical publish refresh',
    10_000,
  );
  diagnostics.checks.postRequests = diagnostics.requests.filter((request) => (
    request.method === 'POST' && /\/api\/feed(?:\?|$)/.test(request.url)
  )).length;
  diagnostics.checks.backgroundRestored = await evaluate(`(() => {
    const timeline = document.querySelector('.feed-timeline');
    return timeline?.inert === false && !timeline?.hasAttribute('aria-hidden');
  })()`);
  await waitFor(`document.querySelectorAll('.feed-media-grid .feed-media-button').length === 2`, 'published multi-image activity');
  diagnostics.checks.multiImage = await evaluate(`(() => {
    const grid = document.querySelector('.feed-media-grid');
    return { count: grid?.querySelectorAll('.feed-media-button').length ?? 0 };
  })()`);
  await click('.feed-media-grid .feed-media-button');
  await waitFor(`Boolean(document.querySelector('.feed-viewer[aria-label="查看 Feed 图片"]'))`, 'native image viewer');
  diagnostics.checks.imageViewer = await evaluate(`(() => {
    const viewer = document.querySelector('.feed-viewer[aria-label="查看 Feed 图片"]');
    return { open: Boolean(viewer), activeInside: viewer?.contains(document.activeElement) ?? false };
  })()`);
  await key('Escape');
  await waitFor(`!document.querySelector('.feed-viewer[aria-label="查看 Feed 图片"]')`, 'viewer Escape close');

  const apiOrigin = new URL(diagnostics.requests.find((request) => request.method === 'POST' && /\/api\/feed(?:\?|$)/.test(request.url)).url).origin;
  const clipText = `browser-clip:${crypto.randomUUID()}`;
  const minimalClipTitle = `最小剪藏:${crypto.randomUUID()}`;
  const imageClipTitle = `这是一条用于验证长中文标题在安静时间线中自然换行且不会挤压明确访问动作的剪藏:${crypto.randomUUID()}`;
  const mediaTexts = {
    landscape: `browser-landscape:${crypto.randomUUID()}`,
    portrait: `browser-portrait:${crypto.randomUUID()}`,
    four: `browser-four-images:${crypto.randomUUID()}`,
    six: `browser-six-images:${crypto.randomUUID()}`,
  };
  createdNativeContents.push(clipText, ...Object.values(mediaTexts));
  createdNativeTitles.push(minimalClipTitle, imageClipTitle);
  diagnostics.checks.representativeSeed = await evaluate(`(async () => {
    const apiOrigin = ${JSON.stringify(apiOrigin)};
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer local-preview-token' };
    const clip = await fetch(apiOrigin + '/api/feed', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ type: 'clip', content: ${JSON.stringify(clipText)}, link_url: 'https://developer.mozilla.org/', link_title: 'MDN Web Docs', link_summary: 'Browser acceptance Clip metadata.' }),
    });
    const minimalClip = await fetch(apiOrigin + '/api/feed', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ type: 'clip', link_url: 'https://example.com/minimal', link_title: ${JSON.stringify(minimalClipTitle)} }),
    });
    const imageClip = await fetch(apiOrigin + '/api/feed', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ type: 'clip', link_url: 'https://example.com/with-image', link_title: ${JSON.stringify(imageClipTitle)}, link_image: 'https://example.com/feed-preview.jpg' }),
    });
    const adminPage = await fetch(apiOrigin + '/api/feed/admin?limit=50', { credentials: 'include' }).then((response) => response.json());
    const publishedMedia = adminPage.items.find((item) => item.kind === 'native_post' && item.payload?.content === ${JSON.stringify(text)});
    const mediaKeys = JSON.parse(publishedMedia?.payload?.media_json ?? '[]');
    const mediaFixtures = [
      [${JSON.stringify(mediaTexts.landscape)}, [mediaKeys[0]]],
      [${JSON.stringify(mediaTexts.portrait)}, [mediaKeys[1]]],
      [${JSON.stringify(mediaTexts.four)}, [mediaKeys[0], mediaKeys[1], mediaKeys[0], mediaKeys[1]]],
      [${JSON.stringify(mediaTexts.six)}, [mediaKeys[0], mediaKeys[1], mediaKeys[0], mediaKeys[1], mediaKeys[0], mediaKeys[1]]],
    ];
    const mediaResponses = [];
    for (const [content, media_keys] of mediaFixtures) mediaResponses.push(await fetch(apiOrigin + '/api/feed', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ type: 'note', content, media_keys }),
    }));
    const manifest = await fetch(apiOrigin + '/api/blog/internal/publications', {
      method: 'POST', headers, body: JSON.stringify({ entries: [{ slug: 'browser-acceptance', title: 'Browser acceptance Blog', summary: 'Public source projection.' }], deployed_at: new Date().toISOString() }),
    });
    const eventKinds = [
      ['blog', 'blog_published', 'browser-acceptance', '/blog/browser-acceptance/'],
      ['learn', 'learn_note_published', 'browser-published', '/learn/notes/browser-published/'],
      ['learn', 'learn_note_revised', 'browser-revised', '/learn/notes/browser-revised/'],
      ['projects', 'project_updated', 'browser-project', '/projects/browser-project/'],
    ];
    const base = Date.now() - 2 * 60 * 60 * 1000;
    const responses = [];
    for (let index = 0; index < 22; index += 1) {
      const [source, eventType, sourceRef, link] = eventKinds[index % eventKinds.length];
      const suffix = String(index).padStart(2, '0');
      responses.push(await fetch(apiOrigin + '/api/feed/internal/footprints', {
        method: 'POST', headers,
        body: JSON.stringify({ source_module: source, source_ref: source === 'blog' ? sourceRef : sourceRef + '-' + suffix, source_version: 'v1', event_type: eventType,
          snapshot_json: JSON.stringify({ title: eventType + ' ' + suffix, summary: 'Browser representative footprint.', link }),
          occurred_at: new Date(base + index * 1000).toISOString(), idempotency_key: 'browser:' + eventType + ':' + suffix }),
      }));
    }
    const hiddenBlog = await fetch(apiOrigin + '/api/feed/internal/footprints', {
      method: 'POST', headers,
      body: JSON.stringify({ source_module: 'blog', source_ref: 'browser-hidden', source_version: 'v1', event_type: 'blog_published',
        snapshot_json: JSON.stringify({ title: 'Browser hidden Blog', summary: 'Browser source-hidden Manage fixture.', link: '/blog/browser-hidden/' }),
        occurred_at: new Date(base - 1000).toISOString(), idempotency_key: 'browser:blog-hidden:v1' }),
    });
    const crossYear = await fetch(apiOrigin + '/api/feed/internal/footprints', {
      method: 'POST', headers,
      body: JSON.stringify({ source_module: 'projects', source_ref: 'browser-cross-year', source_version: 'v1', event_type: 'project_updated',
        snapshot_json: JSON.stringify({ title: 'Cross-year Project', link: '/projects/browser-cross-year/' }),
        occurred_at: '2025-12-30T15:59:00.000Z', idempotency_key: 'browser:project-cross-year:v1' }),
    });
    return { clip: clip.status, minimalClip: minimalClip.status, imageClip: imageClip.status, media: mediaResponses.map((response) => response.status), manifest: manifest.status, hiddenBlog: hiddenBlog.status, crossYear: crossYear.status, footprints: responses.map((response) => response.status) };
  })()`);
  await send('Page.reload');
  await waitFor(`document.readyState === 'complete' && document.querySelector('.feed-owner-actions')?.dataset.sessionReady === 'true' && document.querySelectorAll('.feed-activity').length === 20`, 'representative first page', 10_000);
  diagnostics.checks.firstPage = await evaluate(`(() => ({
    activities: document.querySelectorAll('.feed-activity').length,
    hasEarlier: [...document.querySelectorAll('.feed-timeline-end button')].some((button) => button.textContent.trim() === '更早的内容'),
  }))()`);
  await evaluate(`window.__feedDelayPagination = true`);
  await evaluate(`[...document.querySelectorAll('.feed-timeline-end button')].find((button) => button.textContent.trim() === '更早的内容')?.click()`);
  diagnostics.checks.paginationLoading = await evaluate(`(() => ({
    retained: document.querySelectorAll('.feed-activity').length,
    copy: document.querySelector('.feed-timeline-end button')?.textContent.trim(),
    disabled: document.querySelector('.feed-timeline-end button')?.disabled ?? false,
  }))()`);
  await waitFor(`document.querySelectorAll('.feed-activity').length > 20`, 'delayed pagination completion', 10_000);
  await send('Page.reload');
  await waitFor(`document.readyState === 'complete' && document.querySelectorAll('.feed-activity').length === 20`, 'representative first page reset', 10_000);
  await send('Network.setBlockedURLs', { urls: [`${apiOrigin}/api/feed?limit=20&cursor=*`] });
  await evaluate(`[...document.querySelectorAll('.feed-timeline-end button')].find((button) => button.textContent.trim() === '更早的内容')?.click()`);
  await waitFor(`Boolean(document.querySelector('.feed-pagination-error'))`, 'pagination error state', 10_000);
  diagnostics.checks.paginationError = await evaluate(`(() => ({
    retained: document.querySelectorAll('.feed-activity').length,
    retry: [...document.querySelectorAll('.feed-pagination-error button')].some((button) => button.textContent.trim() === '重试'),
  }))()`);
  await send('Network.setBlockedURLs', { urls: [] });
  await evaluate(`[...document.querySelectorAll('.feed-pagination-error button')].find((button) => button.textContent.trim() === '重试')?.click()`);
  await waitFor(`document.querySelectorAll('.feed-activity').length > 20 && document.querySelector('.feed-timeline-end')?.textContent.includes('止步于此。')`, 'merged same-day pagination', 10_000);
  diagnostics.checks.timelineGrammar = await evaluate(`(() => {
    const clip = [...document.querySelectorAll('.feed-activity--clip')].find((entry) => entry.textContent.includes(${JSON.stringify(clipText)}));
    const note = [...document.querySelectorAll('.feed-activity--note')].find((entry) => entry.textContent.includes(${JSON.stringify(text)}));
    const comment = clip?.querySelector('.feed-content');
    const external = clip?.querySelector('.feed-external-object');
    const activity = document.querySelector('.feed-activity');
    const style = activity ? getComputedStyle(activity) : null;
    const years = [...document.querySelectorAll('.feed-year-label')].map((node) => node.textContent.trim());
    const dates = [...document.querySelectorAll('.feed-date-heading h3')].map((node) => node.textContent.trim());
    const footprintLabels = [...document.querySelectorAll('.feed-footprint .feed-activity-identity')].map((node) => node.textContent.trim());
    const metaGrammar = (entry) => {
      const meta = entry?.querySelector('.feed-activity-meta');
      const identity = meta?.querySelector('.feed-activity-identity');
      const time = meta?.querySelector('.feed-activity-time');
      if (!meta || !identity || !time || identity.parentElement !== meta || time.parentElement !== meta) return false;
      const identityRect = identity.getBoundingClientRect();
      const timeRect = time.getBoundingClientRect();
      return Math.abs(identityRect.top - timeRect.top) <= 2 && identityRect.left < timeRect.left;
    };
    const destinations = Object.fromEntries([...document.querySelectorAll('.feed-footprint')].map((entry) => [
      entry.querySelector('.feed-activity-identity')?.textContent.trim(),
      entry.querySelector('.feed-destination')?.textContent.trim(),
    ]));
    return {
      year: document.querySelector('.feed-year-label')?.textContent?.trim(),
      years,
      datePattern: dates.every((date) => /^\\d{2}\\.\\d{2}$/.test(date)),
      timePattern: [...document.querySelectorAll('.feed-activity-time')].every((node) => /^\\d{2}:\\d{2}$/.test(node.textContent.trim())),
      sameDayMerged: new Set(dates).size === dates.length,
      clipCommentFirst: Boolean(comment && external && (comment.compareDocumentPosition(external) & Node.DOCUMENT_POSITION_FOLLOWING)),
      clipAction: clip?.textContent.includes('访问来源 ↗') ?? false,
      nativeIdentities: { note: note?.querySelector('.feed-activity-identity')?.textContent.trim(), clip: clip?.querySelector('.feed-activity-identity')?.textContent.trim() },
      metaRows: { note: metaGrammar(note), clip: metaGrammar(clip), footprints: [...document.querySelectorAll('.feed-footprint')].every(metaGrammar) },
      footprintLabels: [...new Set(footprintLabels)],
      destinations,
      noCardWall: style ? style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.boxShadow === 'none' && parseFloat(style.borderTopWidth) === 0 : false,
      end: document.querySelector('.feed-timeline-end')?.textContent.includes('止步于此。') ?? false,
    };
  })()`);
  diagnostics.checks.clipVariants = await evaluate(`(() => {
    const entries = [...document.querySelectorAll('.feed-activity--clip')];
    const minimal = entries.find((entry) => entry.textContent.includes(${JSON.stringify(minimalClipTitle)}));
    const withImage = entries.find((entry) => entry.textContent.includes(${JSON.stringify(imageClipTitle)}));
    const image = withImage?.querySelector('.feed-link-image');
    image?.click();
    const titleRect = withImage?.querySelector('h2')?.getBoundingClientRect();
    return {
      minimalHasComment: Boolean(minimal?.querySelector('.feed-content')),
      minimalHasSummary: Boolean(minimal?.querySelector('.feed-supporting-copy')),
      minimalAction: minimal?.querySelector('.feed-destination')?.textContent.trim(),
      previewImagePresent: Boolean(image),
      previewImageOpensViewer: Boolean(document.querySelector('.feed-viewer')),
      longTitleContained: Boolean(titleRect && titleRect.right <= withImage.getBoundingClientRect().right + 1),
    };
  })()`);
  await evaluate(`(() => {
    const destinations = [...document.querySelectorAll('.feed-destination')];
    destinations[0]?.setAttribute('data-focus-target', 'true');
    destinations[1]?.focus();
  })()`);
  await key('Tab', 8);
  diagnostics.checks.destinationFocus = await evaluate(`(() => {
    const destination = document.querySelector('[data-focus-target="true"]');
    const style = destination ? getComputedStyle(destination) : null;
    return { focused: document.activeElement === destination, outlineStyle: style?.outlineStyle, outlineWidth: style?.outlineWidth };
  })()`);
  diagnostics.checks.mediaFailure = await evaluate(`(() => {
    const button = document.querySelector('.feed-media-button');
    const image = button?.querySelector('img');
    if (!button || !image) return null;
    image.src = '/feed-intentionally-missing-media.jpg';
    const rect = button.getBoundingClientRect();
    return { activityRetained: Boolean(button.closest('.feed-activity')), buttonWidth: rect.width, buttonHeight: rect.height, alt: image.alt };
  })()`);
  diagnostics.checks.mediaReality = await evaluate(`(() => {
    const find = (content) => [...document.querySelectorAll('.feed-activity--note')].find((entry) => entry.textContent.includes(content));
    const measure = (content) => {
      const entry = find(content);
      const grid = entry?.querySelector('.feed-media-grid');
      const images = [...(grid?.querySelectorAll('img') ?? [])];
      return { count: images.length, columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0, intrinsic: images.map((image) => [image.naturalWidth, image.naturalHeight]) };
    };
    return {
      landscape: measure(${JSON.stringify(mediaTexts.landscape)}),
      portrait: measure(${JSON.stringify(mediaTexts.portrait)}),
      four: measure(${JSON.stringify(mediaTexts.four)}),
      six: measure(${JSON.stringify(mediaTexts.six)}),
    };
  })()`);

  await evaluate(`document.querySelector('.feed-owner-publish')?.click()`);
  await waitFor(`Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]'))`, 'second publish dialog');
  await evaluate(`(() => {
    window.__feedConfirmCalls = 0;
    window.confirm = () => { window.__feedConfirmCalls += 1; return false; };
    const textarea = document.querySelector('.feed-dialog[aria-label="发布 Feed"] textarea');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    set.call(textarea, 'unsaved browser draft');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await key('Escape');
  await delay(100);
  diagnostics.checks.unsavedProtection = await evaluate(`(() => ({
    stillOpen: Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]')),
    content: document.querySelector('.feed-dialog[aria-label="发布 Feed"] textarea')?.value,
    confirmCalls: window.__feedConfirmCalls,
  }))()`);
  await evaluate(`window.confirm = () => true`);
  await key('Escape');
  await waitFor(`!document.querySelector('.feed-dialog[aria-label="发布 Feed"]')`, 'Escape modal close');
  diagnostics.checks.escapeClose = true;
  await send('Page.reload');
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('.feed-owner-publish')) && Boolean(document.querySelector('.feed-media-grid'))`, 'owner session and timeline recovery after reload', 10_000);

  diagnostics.checks.viewports = [];
  for (const { width, height } of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 430, height: 932 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await delay(100);
    diagnostics.checks.viewports.push(await evaluate(`(() => {
      const action = document.querySelector('.feed-owner-actions');
      const rect = action?.getBoundingClientRect();
      return {
        width: ${width},
        height: ${height},
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        actionVisible: Boolean(rect && rect.width > 0 && rect.height > 0 && rect.right <= innerWidth && rect.bottom <= innerHeight),
        multiImageColumns: document.querySelector('.feed-media-grid') ? getComputedStyle(document.querySelector('.feed-media-grid')).gridTemplateColumns.split(' ').length : 0,
      };
    })()`));
  }

  await send('Page.navigate', { url: `${baseUrl}/feed/admin/` });
  await waitFor(`document.readyState === 'complete'`, 'admin page', 10_000);
  diagnostics.checks.adminReturn = await evaluate(`(() => {
    const link = [...document.querySelectorAll('a')].find((node) => node.textContent?.trim() === '← 返回 Feed');
    if (!link) return null;
    const rect = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    return {
      href: link.getAttribute('href'),
      visible: style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0,
      focusable: link.tabIndex >= 0,
    };
  })()`);
  diagnostics.checks.manageSemantics = await evaluate(`(() => {
    const native = [...document.querySelectorAll('.feed-admin-row')].find((row) => row.querySelector('.feed-eyebrow')?.textContent.includes('碎碎念'));
    const footprint = [...document.querySelectorAll('.feed-admin-row')].find((row) => row.querySelector('.feed-eyebrow')?.textContent.includes('系统足迹'));
    const actions = (row) => [...(row?.querySelectorAll('button') ?? [])].map((button) => button.textContent.trim());
    return { nativeActions: actions(native), footprintActions: actions(footprint) };
  })()`);
  const footprintTitleForVisibility = await evaluate(`(() => {
    const row = [...document.querySelectorAll('.feed-admin-row')].find((entry) => entry.querySelector('.feed-eyebrow')?.textContent.includes('系统足迹') && entry.querySelector('button')?.textContent.trim() === '隐藏');
    return row?.querySelector('p')?.textContent ?? null;
  })()`);
  assert.ok(footprintTitleForVisibility, 'Manage must expose a public Footprint for hide/restore verification');
  await evaluate(`(() => {
    const title = ${JSON.stringify(footprintTitleForVisibility)};
    const row = [...document.querySelectorAll('.feed-admin-row')].find((entry) => entry.querySelector('p')?.textContent === title);
    [...(row?.querySelectorAll('button') ?? [])].find((button) => button.textContent.trim() === '隐藏')?.click();
  })()`);
  await waitFor(`[...document.querySelectorAll('.feed-admin-row')].some((entry) => entry.querySelector('p')?.textContent === ${JSON.stringify(footprintTitleForVisibility)} && entry.querySelector('.feed-eyebrow')?.textContent.includes('仅我可见'))`, 'Footprint hide', 10_000);
  await evaluate(`(() => {
    const title = ${JSON.stringify(footprintTitleForVisibility)};
    const row = [...document.querySelectorAll('.feed-admin-row')].find((entry) => entry.querySelector('p')?.textContent === title);
    [...(row?.querySelectorAll('button') ?? [])].find((button) => button.textContent.trim() === '恢复')?.click();
  })()`);
  await waitFor(`[...document.querySelectorAll('.feed-admin-row')].some((entry) => entry.querySelector('p')?.textContent === ${JSON.stringify(footprintTitleForVisibility)} && !entry.querySelector('.feed-eyebrow')?.textContent.includes('仅我可见'))`, 'Footprint restore', 10_000);
  diagnostics.checks.footprintHideRestore = true;

  const postRequest = diagnostics.requests.find((request) => (
    request.method === 'POST' && /\/api\/feed(?:\?|$)/.test(request.url)
  ));
  assert.ok(postRequest, 'Published Feed request must be observable for cleanup');
  diagnostics.checks.cleanup = await evaluate(`(async () => {
    const list = await fetch(${JSON.stringify(`${apiOrigin}/api/feed/admin?limit=50`)}, { credentials: 'include' });
    if (!list.ok) return { ok: false, stage: 'list', status: list.status };
    const page = await list.json();
    const contents = ${JSON.stringify(createdNativeContents)};
    const titles = ${JSON.stringify(createdNativeTitles)};
    const entries = page.items.filter((item) => item.kind === 'native_post' && (contents.includes(item.payload?.content) || titles.includes(item.payload?.link_title)));
    if (entries.length !== contents.length + titles.length) return { ok: false, stage: 'find', count: entries.length };
    const statuses = [];
    for (const entry of entries) statuses.push((await fetch(${JSON.stringify(`${apiOrigin}/api/feed/`)} + encodeURIComponent(entry.id), { method: 'DELETE', credentials: 'include' })).status);
    return { ok: statuses.every((status) => status === 204), stage: 'delete', statuses };
  })()`);
  await evaluate(`(() => {
    const select = document.querySelectorAll('.feed-admin-filters select')[1];
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    set.call(select, 'blog');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await delay(50);
  await click('.feed-admin-filters .feed-button');
  await waitFor(`[...document.querySelectorAll('.feed-admin-row')].some((row) => row.textContent.includes('Browser hidden Blog'))`, 'source-hidden Blog Manage row', 10_000);
  diagnostics.checks.sourceHiddenManage = await evaluate(`(() => {
    const row = [...document.querySelectorAll('.feed-admin-row')].find((entry) => entry.textContent.includes('Browser hidden Blog'));
    const state = row?.querySelector('.feed-eyebrow')?.textContent ?? '';
    return { sourceHidden: state.includes('随来源隐藏'), ordinaryPublic: state.includes(' · 公开') };
  })()`);
  cleanupCompleted = diagnostics.checks.cleanup.ok;

  await send('Network.setBlockedURLs', { urls: [`${apiOrigin}/api/feed?limit=20`] });
  await send('Page.navigate', { url: `${baseUrl}/feed/` });
  await waitFor(`document.querySelector('.feed-state[role="status"]')?.textContent.includes('正在读取时间线…')`, 'initial loading state', 10_000);
  diagnostics.checks.initialLoading = true;
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('.feed-state--error'))`, 'initial Feed error state', 10_000);
  diagnostics.checks.initialError = await evaluate(`(() => ({
    alert: document.querySelector('.feed-state--error')?.getAttribute('role'),
    retry: [...document.querySelectorAll('.feed-state--error button')].some((button) => button.textContent.trim() === '重试'),
    activities: document.querySelectorAll('.feed-activity').length,
  }))()`);
  await send('Network.setBlockedURLs', { urls: [] });
  await evaluate(`document.querySelector('.feed-state--error button')?.click()`);
  await waitFor(`!document.querySelector('.feed-state--error') && document.querySelectorAll('.feed-activity').length > 0`, 'initial error retry recovery', 10_000);
  diagnostics.checks.initialErrorRecovered = true;
  await evaluate(`localStorage.setItem('feed-ui-empty', '1')`);
  await send('Page.reload');
  await waitFor(`document.querySelector('.feed-state')?.textContent.includes('还没有公开活动。')`, 'empty timeline state', 10_000);
  diagnostics.checks.empty = await evaluate(`(() => ({
    activities: document.querySelectorAll('.feed-activity').length,
    opening: document.querySelector('.feed-header > p')?.textContent.trim(),
    ownerActions: [...document.querySelectorAll('.feed-owner-actions .feed-owner-action')].map((node) => node.textContent.trim()),
  }))()`);
  await evaluate(`localStorage.removeItem('feed-ui-empty')`);

  console.log(JSON.stringify({
    ...diagnostics,
    requests: { count: diagnostics.requests.length },
  }, null, 2));
  assert.deepEqual(diagnostics.checks.loginModal ?? { activeInside: true, backgroundInert: true, backgroundHidden: true }, {
    activeInside: true,
    backgroundInert: true,
    backgroundHidden: true,
  });
  assert.equal(diagnostics.checks.loginKeyboard ?? true, true, 'keyboard focus must remain in the login modal');
  assert.equal(diagnostics.checks.initialLoading, true);
  assert.equal(diagnostics.checks.loginDoesNotOpenComposer ?? true, true, 'login must enter owner browsing without opening the composer');
  assert.deepEqual(diagnostics.checks.publicSemantics, { opening: '碎碎念、剪藏，以及一路积累下来的创作足迹。', hasEyebrow: false, ownerActions: ['管理'], hasManageRows: false });
  assert.deepEqual(diagnostics.checks.publishModal, {
    activeInside: true,
    backgroundInert: true,
    backgroundHidden: true,
    emptyDisabled: true,
  });
  assert.deepEqual(diagnostics.checks.publish, {
    disabled: false,
    pointerEvents: 'auto',
    hit: true,
    textarea: text,
  });
  assert.equal(diagnostics.checks.postRequests, 1, 'valid publish must send exactly one POST');
  assert.deepEqual(diagnostics.checks.partialUpload, { successPreserved: true, failedHasRetry: true, failedHasRemove: true });
  assert.deepEqual(diagnostics.checks.multiImage, { count: 2 });
  assert.deepEqual(diagnostics.checks.imageViewer, { open: true, activeInside: true });
  assert.equal(diagnostics.checks.representativeSeed.clip, 201);
  assert.equal(diagnostics.checks.representativeSeed.minimalClip, 201);
  assert.equal(diagnostics.checks.representativeSeed.imageClip, 201);
  assert.equal(diagnostics.checks.representativeSeed.media.every((status) => status === 201), true);
  assert.equal([200, 201].includes(diagnostics.checks.representativeSeed.crossYear), true);
  assert.equal(diagnostics.checks.representativeSeed.manifest, 200);
  assert.equal([200, 201].includes(diagnostics.checks.representativeSeed.hiddenBlog), true);
  assert.equal(diagnostics.checks.representativeSeed.footprints.every((status) => status === 200 || status === 201), true);
  assert.deepEqual(diagnostics.checks.firstPage, { activities: 20, hasEarlier: true });
  assert.deepEqual(diagnostics.checks.paginationLoading, { retained: 20, copy: '正在加载…', disabled: true });
  assert.deepEqual(diagnostics.checks.paginationError, { retained: 20, retry: true });
  assert.equal(diagnostics.checks.timelineGrammar.datePattern && diagnostics.checks.timelineGrammar.timePattern && diagnostics.checks.timelineGrammar.sameDayMerged, true);
  assert.deepEqual(diagnostics.checks.timelineGrammar.years, ['2026', '2025']);
  assert.equal(diagnostics.checks.timelineGrammar.clipCommentFirst && diagnostics.checks.timelineGrammar.clipAction && diagnostics.checks.timelineGrammar.noCardWall && diagnostics.checks.timelineGrammar.end, true);
  assert.deepEqual(diagnostics.checks.timelineGrammar.nativeIdentities, { note: 'NOTE', clip: 'CLIP' });
  assert.deepEqual(diagnostics.checks.timelineGrammar.metaRows, { note: true, clip: true, footprints: true });
  assert.deepEqual(diagnostics.checks.timelineGrammar.footprintLabels.sort(), ['BLOG · 发布', 'LEARN · 更新', 'PROJECT · 更新'].sort());
  assert.deepEqual(diagnostics.checks.timelineGrammar.destinations, { 'BLOG · 发布': '阅读文章 →', 'LEARN · 更新': '查看内容 →', 'PROJECT · 更新': '查看项目 →' });
  assert.deepEqual(diagnostics.checks.clipVariants, { minimalHasComment: false, minimalHasSummary: false, minimalAction: '访问来源 ↗', previewImagePresent: true, previewImageOpensViewer: false, longTitleContained: true });
  assert.deepEqual(diagnostics.checks.destinationFocus, { focused: true, outlineStyle: 'solid', outlineWidth: '2px' });
  assert.equal(diagnostics.checks.mediaFailure.activityRetained && diagnostics.checks.mediaFailure.buttonWidth > 0 && diagnostics.checks.mediaFailure.buttonHeight > 0 && diagnostics.checks.mediaFailure.alt === 'Feed 附图', true);
  assert.deepEqual({
    landscape: diagnostics.checks.mediaReality.landscape.count,
    portrait: diagnostics.checks.mediaReality.portrait.count,
    four: diagnostics.checks.mediaReality.four.count,
    six: diagnostics.checks.mediaReality.six.count,
  }, { landscape: 1, portrait: 1, four: 4, six: 6 });
  assert.deepEqual({ four: diagnostics.checks.mediaReality.four.columns, six: diagnostics.checks.mediaReality.six.columns }, { four: 2, six: 2 });
  assert.equal(diagnostics.checks.backgroundRestored, true, 'modal close must restore the page background');
  assert.deepEqual(diagnostics.checks.unsavedProtection, { stillOpen: true, content: 'unsaved browser draft', confirmCalls: 1 });
  assert.equal(diagnostics.checks.escapeClose, true);
  assert.equal(diagnostics.checks.viewports.every((item) => item.noHorizontalOverflow && item.actionVisible && item.multiImageColumns === 2), true);
  assert.deepEqual(diagnostics.checks.adminReturn, { href: '/feed/', visible: true, focusable: true });
  assert.equal(diagnostics.checks.manageSemantics.nativeActions.includes('删除'), true);
  assert.equal(diagnostics.checks.manageSemantics.footprintActions.includes('删除'), false);
  assert.equal(diagnostics.checks.footprintHideRestore, true);
  assert.deepEqual(diagnostics.checks.sourceHiddenManage, { sourceHidden: true, ordinaryPublic: false });
  assert.equal(diagnostics.checks.cleanup.ok, true);
  assert.deepEqual(diagnostics.checks.initialError, { alert: 'alert', retry: true, activities: 0 });
  assert.equal(diagnostics.checks.initialErrorRecovered, true);
  assert.deepEqual(diagnostics.checks.empty, { activities: 0, opening: '碎碎念、剪藏，以及一路积累下来的创作足迹。', ownerActions: ['管理', '＋ 发布'] });
  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
} finally {
  if (cdp && createdText && !cleanupCompleted) {
    await cdp.evaluate(`(async () => {
      try {
        const origins = ${JSON.stringify(diagnostics.requests
          .filter((request) => request.method === 'POST' && /\/api\/feed(?:\?|$)/.test(request.url))
          .map((request) => new URL(request.url).origin))};
        for (const origin of [...new Set(origins)]) {
          const list = await fetch(origin + '/api/feed/admin?limit=50', { credentials: 'include' });
          if (!list.ok) continue;
          const page = await list.json();
          const contents = ${JSON.stringify(createdNativeContents)};
          const titles = ${JSON.stringify(createdNativeTitles)};
          for (const entry of page.items.filter((item) => item.kind === 'native_post' && (contents.includes(item.payload?.content) || titles.includes(item.payload?.link_title)))) {
            await fetch(origin + '/api/feed/' + encodeURIComponent(entry.id), { method: 'DELETE', credentials: 'include' });
          }
        }
      } catch {}
    })()`).catch(() => null);
  }
  cdp?.close();
  await browser?.close();
}
