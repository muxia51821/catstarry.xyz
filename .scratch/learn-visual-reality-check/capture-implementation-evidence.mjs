import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectCdp, delay } from '../../scripts/lib/cdp-session.mjs';
import { launchIsolatedBrowser } from '../../scripts/lib/isolated-browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'implementation-evidence');
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const [sessionPort, sitePort] = await freePorts(2);
const sessionOrigin = `http://127.0.0.1:${sessionPort}`;
const siteOrigin = `http://127.0.0.1:${sitePort}`;
const consoleProblems = [];
const failedRequests = [];
const observations = {};
let site;
let browser;
let cdp;

const sessionServer = createServer((request, response) => {
  if (request.url !== '/api/auth/session') return response.writeHead(404).end();
  const authenticated = (request.headers.cookie ?? '').includes('preview-token=1');
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify({ authenticated, username: authenticated ? 'implementation-evidence' : null }));
});

try {
  await mkdir(outputRoot, { recursive: true });
  await listen(sessionServer, sessionPort);
  site = spawn(process.execPath, [astro, 'dev', '--host', '127.0.0.1', '--port', String(sitePort)], {
    cwd: root,
    env: { ...process.env, ASTRO_DEV_BACKGROUND: '0', ASTRO_TELEMETRY_DISABLED: '1', FEED_API_URL: sessionOrigin, PUBLIC_FEED_API_URL: sessionOrigin },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let siteOutput = '';
  site.stdout.on('data', (chunk) => { siteOutput += chunk; });
  site.stderr.on('data', (chunk) => { siteOutput += chunk; });
  await waitForHttp(`${siteOrigin}/`, site, () => siteOutput);

  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') consoleProblems.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') consoleProblems.push(message.params.args.map((value) => value.value ?? value.description).join(' '));
    if (message.method === 'Network.loadingFailed' && message.params.errorText !== 'net::ERR_ABORTED') failedRequests.push(message.params.errorText);
  });
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { media: '', features: [] });

  const viewport = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const navigate = async (pathname) => {
    await send('Page.navigate', { url: `${siteOrigin}${pathname}` });
    await waitFor(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)}`, `${pathname} load`, 15_000);
    await delay(280);
  };
  const screenshot = async (name, selector) => {
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize;
    let clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
    if (selector) {
      const box = await evaluate(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) return null; const r=n.getBoundingClientRect(); return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}; })()`);
      if (!box) throw new Error(`Missing screenshot selector: ${selector}`);
      const padding = 16;
      clip = { x: Math.max(0, box.x - padding), y: Math.max(0, box.y - padding), width: Math.min(size.width, box.width + padding * 2), height: Math.min(size.height, box.height + padding * 2), scale: 1 };
    }
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip }, 15_000);
    await writeFile(path.join(outputRoot, name), Buffer.from(image.data, 'base64'));
  };
  const viewportScreenshot = async (name) => {
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 15_000);
    await writeFile(path.join(outputRoot, name), Buffer.from(image.data, 'base64'));
  };
  const point = (selector) => evaluate(`(() => { const n=document.querySelector(${JSON.stringify(selector)}); if(!n)return null; const r=n.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  const noOverflow = () => evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`);

  if (process.argv.includes('--graph-optical-only')) {
    await viewport(1440, 1000);
    await navigate('/learn/');
    await waitFor(`document.querySelectorAll('.learn-graph__edges line').length > 0`, 'desktop graph edges');
    await evaluate(`document.querySelector('astro-dev-toolbar')?.remove()`);
    await screenshot('knowledge-map-resting.png', '.learn-knowledge-map');

    await viewport(390, 844, true);
    await navigate('/learn/');
    await waitFor(`document.querySelectorAll('.learn-graph__edges line').length > 0`, 'mobile graph edges');
    await evaluate(`document.querySelector('astro-dev-toolbar')?.remove()`);
    await screenshot('knowledge-map-mobile-portrait.png', '.learn-knowledge-map');

    observations.graphOpticalCorrection = await evaluate(`(() => ({
      nodes: document.querySelectorAll('[data-graph-node]').length,
      relations: document.querySelectorAll('.learn-graph__edges line').length,
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      consoleProblems: ${JSON.stringify(consoleProblems)},
      failedRequests: ${JSON.stringify(failedRequests)},
    }))()`);
    console.log(JSON.stringify(observations, null, 2));
  } else {
  await viewport(1440, 1000);
  await navigate('/learn/');
  await waitFor(`document.querySelectorAll('.learn-graph__edges line').length > 0`, 'desktop graph edges');
  observations.homeDesktop = await evaluate(`(() => {
    const opening=document.querySelector('.learn-opening').getBoundingClientRect();
    const map=document.querySelector('.learn-knowledge-map').getBoundingClientRect();
    const recent=document.querySelector('.learn-recent').getBoundingClientRect();
    const graph=getComputedStyle(document.querySelector('.learn-graph'));
    const mottoCn=document.querySelector('.learn-opening__motto-cn').getBoundingClientRect();
    const mottoLatin=document.querySelector('.learn-opening__motto-latin').getBoundingClientRect();
    return {
      motto: document.querySelector('.learn-opening__motto')?.textContent.trim(),
      mottoTwoLineLockup: mottoLatin.top >= mottoCn.bottom,
      openingHeight: opening.height,
      mapHeight: map.height,
      recentTop: recent.top,
      tracks: document.querySelectorAll('[data-track-link]').length,
      nodes: document.querySelectorAll('[data-graph-node]').length,
      edges: document.querySelectorAll('.learn-graph__edges line').length,
      recentRows: document.querySelectorAll('.learn-recent .learn-note-row').length,
      searchPosition: getComputedStyle(document.querySelector('.learn-search')).position,
      graphBackground: graph.backgroundColor,
      graphRadius: graph.borderRadius,
      legacyCards: document.querySelectorAll('.learn-note-card,.learn-track-card,.learn-graph__count').length,
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  })()`);
  await screenshot('home-desktop-1440x1000.png');
  await viewportScreenshot('home-desktop-1440x1000-viewport.png');
  await screenshot('knowledge-map-resting.png', '.learn-knowledge-map');

  const node = await point('[data-graph-node="vibe-coding-mission"]');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: node.x, y: node.y, pointerType: 'mouse' });
  await delay(160);
  observations.nodeHover = await evaluate(`(() => ({
    color:getComputedStyle(document.querySelector('[data-graph-node="vibe-coding-mission"]')).color,
    dot:getComputedStyle(document.querySelector('[data-graph-node="vibe-coding-mission"] .learn-graph__dot')).width,
    activeEdges:document.querySelectorAll('.learn-graph__edges .is-active').length,
  }))()`);
  await screenshot('knowledge-map-node-hover.png', '.learn-knowledge-map');
  await evaluate(`document.querySelector('[data-graph-node="vibe-coding-mission"]').focus()`);
  observations.nodeFocus = await evaluate(`(() => { const s=getComputedStyle(document.activeElement); return {outline:s.outlineWidth,activeEdges:document.querySelectorAll('.learn-graph__edges .is-active').length}; })()`);
  await screenshot('knowledge-map-node-focus.png', '.learn-knowledge-map');

  const trackBefore = await evaluate(`document.querySelector('[data-track-link="programming"]').getBoundingClientRect().width`);
  const trackPoint = await point('[data-track-link="programming"]');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: trackPoint.x, y: trackPoint.y, pointerType: 'mouse' });
  await delay(120);
  observations.trackHover = await evaluate(`(() => ({
    width:document.querySelector('[data-track-link="programming"]').getBoundingClientRect().width,
    countOpacity:getComputedStyle(document.querySelector('[data-track-link="programming"] .learn-track-directory__count')).opacity,
    activeTrack:document.querySelector('[data-learn-graph]').dataset.activeTrack,
    activeEdges:document.querySelectorAll('.learn-graph__edges .is-active').length,
  }))()`);
  observations.trackHover.widthBefore = trackBefore;
  await screenshot('knowledge-map-track-hover.png', '.learn-knowledge-map');

  await evaluate(`(() => { const i=document.querySelector('#learn-search-input'); i.focus(); i.value='项目基础'; i.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await delay(100);
  observations.search = await evaluate(`(() => ({
    expanded:document.querySelector('#learn-search-input').getAttribute('aria-expanded'),
    results:document.querySelectorAll('.learn-search__suggestions a').length,
    graphVisible:document.querySelector('.learn-graph').getClientRects().length>0,
    recentVisible:document.querySelector('.learn-recent').getClientRects().length>0,
  }))()`);
  await screenshot('home-search-active.png');

  await viewport(390, 844, true);
  await navigate('/learn/');
  await waitFor(`document.querySelectorAll('.learn-graph__edges line').length > 0`, 'mobile graph edges');
  observations.homeMobile = await evaluate(`(() => ({
    nodes:document.querySelectorAll('[data-graph-node]').length,
    edges:document.querySelectorAll('.learn-graph__edges line').length,
    graphHeight:document.querySelector('.learn-graph').getBoundingClientRect().height,
    labelsVisible:[...document.querySelectorAll('.learn-graph__label')].every(n=>n.getClientRects().length>0),
    noOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth,
  }))()`);
  await screenshot('home-mobile-390x844.png');
  await screenshot('knowledge-map-mobile-portrait.png', '.learn-knowledge-map');

  const trackViewports = [[1760,1000],[1440,1000],[1000,900],[768,900],[390,844]];
  observations.track = [];
  for (const [width,height] of trackViewports) {
    await viewport(width,height,width<640);
    await navigate('/learn/track/programming/');
    observations.track.push({ width, rows:await evaluate(`document.querySelectorAll('.learn-note-row').length`), noOverflow:await noOverflow() });
    await screenshot(`track-programming-${width}.png`);
  }

  await viewport(1440,1000);
  await navigate('/learn/notes/vibe-coding-mission/');
  observations.noteRelated = await evaluate(`(() => ({
    bodyWidth:document.querySelector('.learn-note-body').getBoundingClientRect().width,
    related:document.querySelectorAll('.learn-related li').length,
    relatedSticky:getComputedStyle(document.querySelector('.learn-related')).position,
    directory:document.querySelectorAll('.learn-directory-tree,[data-tree-open]').length,
    tags:document.querySelectorAll('.learn-detail-page__tags').length,
    sourceLinks:[...document.links].filter(a=>a.textContent.includes('公开来源')).length,
    noOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth,
  }))()`);
  await screenshot('note-desktop-related.png');

  for (const [width,height] of [[1760,1000],[1000,900],[768,900]]) {
    await viewport(width,height,width<640);
    await navigate('/learn/notes/vibe-coding-mission/');
    await screenshot(`note-vibe-${width}.png`);
  }
  await viewport(1440,1000);
  await navigate('/learn/notes/vibe-coding-mission/');

  const wiki = await point('[data-wikilink-trigger]');
  await send('Input.dispatchMouseEvent', { type:'mouseMoved', x:wiki.x, y:wiki.y, pointerType:'mouse' });
  await delay(120);
  observations.wikilinkHover = await evaluate(`!document.querySelector('.learn-wikilink__preview').hidden`);
  await screenshot('wikilink-hover-preview.png', '.learn-note-body');
  await evaluate(`document.querySelector('[data-wikilink-trigger]').focus()`);
  observations.wikilinkFocus = await evaluate(`!document.querySelector('.learn-wikilink__preview').hidden`);
  const wikiHref = await evaluate(`document.querySelector('[data-wikilink-trigger]').getAttribute('href')`);
  await evaluate(`document.querySelector('[data-wikilink-trigger]').click()`);
  await waitFor(`location.pathname === ${JSON.stringify(wikiHref)}`, 'wikilink direct navigation', 10_000);
  observations.wikilinkDirect = await evaluate(`location.pathname`);

  await navigate('/learn/notes/vibe-coding-mission/');
  await evaluate(`document.querySelector('[data-wikilink-trigger]').focus()`);
  await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter' });
  await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter' });
  await waitFor(`location.pathname === ${JSON.stringify(wikiHref)}`, 'wikilink Enter navigation', 10_000);
  observations.wikilinkEnter = await evaluate(`location.pathname`);

  await navigate('/learn/notes/typing-foundation/');
  observations.noteZeroRelations = await evaluate(`({related:document.querySelectorAll('.learn-related').length,bodyWidth:document.querySelector('.learn-note-body').getBoundingClientRect().width})`);
  await screenshot('note-desktop-zero-relations.png');

  await viewport(390,844,true);
  await navigate('/learn/notes/vibe-coding-mission/');
  observations.noteMobile = await evaluate(`(() => { const r=document.querySelector('.learn-related').getBoundingClientRect(); const a=document.querySelector('.learn-note-body').getBoundingClientRect(); return {relatedAfterArticle:r.top>a.bottom,noOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth}; })()`);
  await screenshot('note-mobile-related.png');
  const mobileWikiHref = await evaluate(`document.querySelector('[data-wikilink-trigger]').getAttribute('href')`);
  await evaluate(`document.querySelector('[data-wikilink-trigger]').click()`);
  await waitFor(`location.pathname === ${JSON.stringify(mobileWikiHref)}`, 'wikilink mobile navigation', 10_000);
  observations.wikilinkMobile = await evaluate(`location.pathname`);

  await send('Network.setCookie', { url:siteOrigin, name:'preview-token', value:'1' });
  await viewport(1440,1000);
  await navigate('/learn/admin/');
  observations.admin = await evaluate(`(() => ({rows:document.querySelectorAll('.learn-admin-row').length,states:[...document.querySelectorAll('.learn-admin-row__state')].map(n=>n.textContent.trim()),buttons:document.querySelectorAll('button').length,previewLinks:document.querySelectorAll('.learn-admin-row__preview').length,noOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth}))()`);
  await screenshot('admin-desktop-readonly.png');
  await viewport(390,844,true);
  await navigate('/learn/admin/');
  await screenshot('admin-mobile-readonly.png');

  await viewport(1440,1000);
  await navigate('/learn/preview/domain-dns-http/');
  observations.previewDraft = await evaluate(`(() => ({banner:document.querySelector('.learn-preview-chrome strong')?.textContent.trim(),bodyWidth:document.querySelector('.learn-note-body').getBoundingClientRect().width,noOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth,codeBlocks:document.querySelectorAll('pre').length}))()`);
  await screenshot('preview-draft-longform-desktop.png');
  await viewport(390,844,true);
  await navigate('/learn/preview/domain-dns-http/');
  await screenshot('preview-draft-longform-mobile.png');

  await viewport(390,844,true);
  await navigate('/learn/');
  await evaluate(`document.documentElement.style.fontSize='200%'`);
  observations.zoom200 = { noOverflow:await noOverflow(), nodes:await evaluate(`document.querySelectorAll('[data-graph-node]').length`) };
  await send('Emulation.setEmulatedMedia', { media:'', features:[{name:'prefers-reduced-motion',value:'reduce'}] });
  observations.reducedMotion = await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`);

  observations.crossTrack = await evaluate(`null`);
  await viewport(1440,1000);
  await navigate('/learn/');
  observations.crossTrack = await evaluate(`(() => {
    const relations=JSON.parse(document.querySelector('[data-learn-graph]').dataset.relations);
    const notes=new Map([...document.querySelectorAll('[data-graph-node]')].map(n=>[n.dataset.graphNode,n.dataset.track]));
    return relations.filter(r=>notes.get(r.source)!==notes.get(r.target));
  })()`);

  await navigate('/learn/');
  await evaluate(`(() => {
    document.querySelector('.learn-knowledge-map')?.remove();
    document.querySelector('.learn-recent')?.remove();
    const empty=document.createElement('p');
    empty.className='learn-empty-corpus';
    empty.textContent='暂时还没有公开的学习笔记。';
    document.querySelector('.learn-opening')?.after(empty);
    document.documentElement.dataset.evidenceFixture='empty';
  })()`);
  observations.emptyControlled = { noOverflow:await noOverflow(), copy:await evaluate(`document.querySelector('.learn-empty-corpus')?.textContent`) };
  await viewportScreenshot('home-empty-controlled-1440x1000.png');

  await navigate('/learn/');
  await evaluate(`(() => {
    const keep=new Set(['site-context-and-terms','vibe-coding-mission']);
    for(const node of document.querySelectorAll('[data-graph-node]')) if(!keep.has(node.dataset.graphNode)) node.remove();
    for(const label of document.querySelectorAll('.learn-graph__region-label')) if(label.textContent.trim()!=='Programming') label.remove();
    for(const link of document.querySelectorAll('[data-track-link]')) if(link.dataset.trackLink!=='programming') link.remove();
    for(const row of [...document.querySelectorAll('.learn-recent .learn-note-row')].slice(2)) row.remove();
    for(const edge of document.querySelectorAll('.learn-graph__edges line')) if(!keep.has(edge.dataset.source)||!keep.has(edge.dataset.target)) edge.remove();
    document.documentElement.dataset.evidenceFixture='sparse';
  })()`);
  await viewport(1439,1000);
  await delay(100);
  await viewport(1440,1000);
  await delay(120);
  observations.sparseControlled = { nodes:await evaluate(`document.querySelectorAll('[data-graph-node]').length`), edges:await evaluate(`document.querySelectorAll('.learn-graph__edges line').length`), noOverflow:await noOverflow() };
  await viewportScreenshot('home-sparse-controlled-1440x1000.png');

  observations.consoleProblems = consoleProblems;
  observations.failedRequests = failedRequests;
  await writeFile(path.join(outputRoot,'implementation-reality.json'),JSON.stringify(observations,null,2));
  console.log(JSON.stringify(observations,null,2));
  }
} finally {
  cdp?.close();
  await browser?.close();
  await stopProcessTree(site);
  await new Promise((resolve) => sessionServer.close(resolve));
}

async function freePorts(count) {
  const ports=[];
  while(ports.length<count){
    const server=net.createServer();
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    const address=server.address();
    await new Promise((resolve)=>server.close(resolve));
    if(address&&typeof address!=='string'&&!ports.includes(address.port))ports.push(address.port);
  }
  return ports;
}
function listen(server,port){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}
async function waitForHttp(url,child,getOutput){const deadline=Date.now()+90_000;while(Date.now()<deadline){if(child.exitCode!==null)throw new Error(getOutput());try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await delay(250);}throw new Error(`Astro dev did not become ready: ${getOutput()}`);}
async function stopProcessTree(child){if(!child||child.exitCode!==null)return;if(process.platform==='win32'){const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});await once(killer,'exit');}else child.kill('SIGTERM');}
