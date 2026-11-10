import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';
import { parse } from '@babel/parser';

// Render real component handlers with controllable promises, without a browser or network.
function componentHarness(filename, exportName = 'default') {
  const cells = [];
  const effects = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
      return [cells[index], (value) => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = { current: initial };
      return cells[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!cells[index] || deps.some((value, i) => value !== cells[index].deps[i])) {
        effects.push(() => {
          cells[index]?.cleanup?.();
          cells[index] = { deps, cleanup: effect() };
        });
      }
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  };
  const req = createRequire(new URL(`../${filename}`, import.meta.url));
  const source = readFileSync(filename, 'utf8')
    + (exportName === 'default' ? '' : `\nexport { ${exportName} };`);
  const code = transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'automatic' }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => name === 'react' ? hooks : req(name), module, module.exports,
  );
  return {
    render(props) {
      cursor = 0;
      const tree = module.exports[exportName](props);
      while (effects.length) effects.shift()();
      return tree;
    },
    unmount() { for (const cell of cells) cell?.cleanup?.(); },
  };
}

function elements(node) {
  if (!node || typeof node !== 'object') return [];
  const children = node.props?.children;
  return [node, ...(Array.isArray(children) ? children : [children]).flatMap(elements)];
}
const find = (tree, predicate) => elements(tree).find(predicate);
const form = (tree) => find(tree, (node) => node.type === 'form');
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const tick = () => new Promise((done) => setImmediate(done));
const submit = { preventDefault() {} };
const originalGlobals = { fetch: globalThis.fetch, window: globalThis.window, document: globalThis.document };
let reloads = 0;
let closes = 0;
globalThis.window = { confirm: () => true, location: { reload() { reloads += 1; } } };
globalThis.document = { activeElement: null, body: { style: {} }, addEventListener() {}, removeEventListener() {} };
try {
  const props = { apiBase: '', onClose() { closes += 1; }, onAuthExpired() {}, onAuthenticated() {} };
  const composer = componentHarness('src/components/feed/FeedApp.tsx', 'PublishDialog');
  let tree = composer.render(props);
  find(tree, (node) => node.type === 'textarea').props.onChange({ target: { value: 'preserved draft' } });
  tree = composer.render(props);
  const pending = deferred();
  globalThis.fetch = () => pending.promise;
  const publishing = form(tree).props.onSubmit(submit);
  tree = composer.render(props);
  find(tree, (node) => node.props?.className === 'feed-close').props.onClick();
  assert.equal(closes, 0, 'in-flight publish must block the dialog close handler');
  assert.equal(find(tree, (node) => node.type === 'fieldset').props.disabled, true);
  composer.unmount();
  pending.resolve(Response.json({ post: {} }));
  await publishing;
  assert.equal(reloads, 0, 'unmounted composer must not reload a newer page');

  const retryComposer = componentHarness('src/components/feed/FeedApp.tsx', 'PublishDialog');
  tree = retryComposer.render(props);
  find(tree, (node) => node.type === 'textarea').props.onChange({ target: { value: 'original retry body' } });
  tree = retryComposer.render(props);
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(init);
    if (requests.length === 1) throw new Error('lost response');
    if (requests.length === 2) return Response.json({}, { status: 401 });
    return Response.json({ post: {} });
  };
  await form(tree).props.onSubmit(submit);
  tree = retryComposer.render(props);
  assert.equal(find(tree, (node) => node.type === 'fieldset').props.disabled, true, 'unknown outcome freezes editing');
  await form(tree).props.onSubmit(submit);
  tree = retryComposer.render(props);
  assert.equal(form(tree).props.hidden, true, '401 switches to inline login without unmounting the composer');
  find(tree, (node) => node.type?.name === 'LoginForm').props.onLoggedIn({ authenticated: true, username: 'owner' });
  tree = retryComposer.render(props);
  assert.equal(find(tree, (node) => node.type === 'textarea').props.value, 'original retry body');
  await form(tree).props.onSubmit(submit);
  assert.equal(new Set(requests.map((request) => request.body)).size, 1);
  assert.equal(new Set(requests.map((request) => request.headers['Idempotency-Key'])).size, 1,
    'reauthentication after an unknown result must preserve the original submission identity');
  assert.equal(reloads, 1);
  retryComposer.unmount();

  const blog = componentHarness('src/components/blog/BlogLifecycleAdmin.tsx');
  const blogProps = { initial: ['a', 'b'].map((slug) => ({ slug, title: slug, state: 'published' })) };
  const blogPending = deferred();
  let writes = 0;
  globalThis.fetch = () => { writes += 1; return blogPending.promise; };
  tree = blog.render(blogProps);
  const buttons = elements(tree).filter((node) => node.type === 'button');
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.equal(writes, 1, 'Blog operations must serialize before React rerenders');
  tree = blog.render(blogProps);
  assert.ok(elements(tree).filter((node) => node.type === 'button').every((node) => node.props.disabled));
  blogPending.resolve(Response.json({ entry: { slug: 'a', title: 'a', state: 'withdrawn' } }));
  await tick();
  tree = blog.render(blogProps);
  assert.ok(elements(tree).filter((node) => node.type === 'button').every((node) => !node.props.disabled));
  blog.unmount();

  const entry = (id, visibility) => ({ id, kind: 'native_post', visibility,
    occurred_at: new Date().toISOString(), payload: { type: 'note', content: id } });
  const admin = componentHarness('src/components/feed/FeedAdmin.tsx');
  const adminProps = { apiBase: '', initial: { items: [entry('initial', 'public')], cursor: 'old-cursor', has_more: true } };
  const morePending = deferred();
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return urls.length === 1 ? morePending.promise
      : Response.json({ items: [entry('filtered', 'private')], cursor: null, has_more: false });
  };
  tree = admin.render(adminProps);
  find(tree, (node) => node.type === 'select').props.onChange({ target: { value: 'private' } });
  tree = admin.render(adminProps);
  find(tree, (node) => node.type === 'button' && node.props.children === '加载更多').props.onClick();
  assert.equal(new URL(urls[0], 'https://test.invalid').searchParams.get('visibility'), null,
    'unapplied filter edits must not change pagination');
  tree = admin.render(adminProps);
  form(tree).props.onSubmit(submit);
  await tick();
  morePending.resolve(Response.json({ items: [entry('stale-public', 'public')], cursor: 'stale', has_more: true }));
  await tick();
  tree = admin.render(adminProps);
  assert.deepEqual(elements(tree).filter((node) => node.type === 'article').map((node) => node.key), ['filtered']);
  assert.equal(find(tree, (node) => node.type === 'button' && node.props.children === '加载更多'), undefined);
  admin.unmount();
} finally {
  Object.assign(globalThis, originalGlobals);
}

const homeSource = readFileSync('src/components/home/home-runtime.ts', 'utf8');
const homeFunctions = new Map(['recoverCatCompanion', 'enterAboutFromCat', 'activateCat'].map((name) => [name, null]));
function collect(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && homeFunctions.has(node.id?.name)) {
    homeFunctions.set(node.id.name, homeSource.slice(node.start, node.end));
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') collect(value);
  }
}
collect(parse(homeSource, { sourceType: 'module', plugins: ['typescript'] }));
assert.ok([...homeFunctions.values()].every(Boolean));
let time = 0;
let nextTimer = 0;
const timers = new Map();
const destinations = [];
function advance(target) {
  for (;;) {
    const next = [...timers].filter(([, timer]) => timer.time <= target).sort((a, b) => a[1].time - b[1].time)[0];
    if (!next) break;
    timers.delete(next[0]); time = next[1].time; next[1].fn();
  }
  time = target;
}
const cat = new Function('setTimeout', 'clearTimeout', 'navigateToFocus', `
  let catState='burst', catPhysics=null, chargeTimer,catBurstTimer,catRecoverTimer;
  const cat={focus(){}},focusTrigger=cat,reduce={matches:false},catZone={classList:{contains(){return true;}}};
  const body={classList:{add(){},remove(){}}},document={getElementById(){return {};}};
  const P={transition:{catRecoverMs:2750,catBurstMs:1140,catChargeMs:3800}},homeCopy={cat:{hint:'',chargedHint:''}};
  function syncCatState(){} function beginCatPhysics(){} function resetCatToRest(){catState='rest';} function recordCatBurstOrigin(){}
  ${[...homeFunctions.values()].join('\n')}
  return {recoverCatCompanion,activateCat,state:()=>catState};
`)((fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, time: time + delay }); return id; },
  (id) => timers.delete(id), (destination) => destinations.push(destination));
cat.recoverCatCompanion(); advance(2000); cat.activateCat({ direct: true }); advance(3200);
assert.deepEqual(destinations, ['about'], 'reactivation must cancel the old recovery timer');
console.log('State transition regressions passed (component handlers and controlled Home timers).');
