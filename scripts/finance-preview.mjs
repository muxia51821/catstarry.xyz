import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.FINANCE_PREVIEW_PORT ?? '8788');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('FINANCE_PREVIEW_PORT must be a valid TCP port');

const state = {
  role: null,
  holdings: {
    total_market_value: 12600,
    market_data_complete: true,
    holdings: [
      { ticker: '510300', ticker_name: '沪深300ETF', quantity: 100, avg_cost: 66, price: 72, market_value: 7200, pnl: 600, position_category: 'A股宽基指数底仓', fetched_at: '2026-07-25T10:00:00.000Z' },
      { ticker: '513100', ticker_name: '纳斯达克100ETF', quantity: 100, avg_cost: 33, price: 36, market_value: 3600, pnl: 300, position_category: '美股ETF（A股跨境ETF）', fetched_at: '2026-07-25T10:00:00.000Z' },
      { ticker: '518880', ticker_name: '黄金ETF', quantity: 100, avg_cost: 16, price: 18, market_value: 1800, pnl: 200, position_category: '黄金ETF', fetched_at: '2026-07-25T10:00:00.000Z' },
    ],
    positions: [
      { position_category: 'A股宽基指数底仓', current_ratio: 7200 / 12600, target_ratio: .15, lower_ratio: .1, upper_ratio: .2, suggestedChange: -.35, status: 'above_upper' },
      { position_category: '美股ETF（A股跨境ETF）', current_ratio: 3600 / 12600, target_ratio: .2, lower_ratio: .15, upper_ratio: .25, suggestedChange: -.085714, status: 'above_upper' },
      { position_category: '黄金ETF', current_ratio: 1800 / 12600, target_ratio: .1, lower_ratio: .05, upper_ratio: .15, suggestedChange: .0, status: 'normal' },
    ],
    market_overview: { label: '上证指数', current_value: 3452.17, previous_close: 3433.93, change: 18.24, change_pct: .5312, market_status: 'closed', market_time: '2026-07-30 15:00', trading_date: '2026-07-30' },
  },
  trades: [{ id: 1, trade_date: '2026-07-24', ticker: '510300', ticker_name: '沪深300ETF', direction: 'buy', quantity: 100, price: 12, position_category: 'A股宽基指数底仓', reason: '历史交易理由仅在审计与导出中保留。', created_by: 'local-preview' }],
  pe: [
    { ticker: 'CSI300_PE', display_name: '沪深 300 PE-TTM', pe_ttm: 12.5, temperature: { zone: 'normal', suggestion: 'normal_dca' } },
    { ticker: 'CSI500_PE', display_name: '中证 500 PE-TTM', pe_ttm: 22.8 },
    { ticker: 'CSI1000_PE', display_name: '中证 1000 PE-TTM', pe_ttm: 31.4 },
    { ticker: 'STAR50_PE', display_name: '科创 50 PE-TTM', pe_ttm: 48.2 },
    { ticker: 'NASDAQ100_PE', display_name: '纳斯达克 100 PE', pe_ttm: 36.1 },
  ],
  circuit: null,
  reviews: [{ year: 2026, summary: '本地预览用年度复盘。', calculation: { dietz: { returnRate: .08 } }, confirmed_at: null, confirmed_by: null }],
  monthly: [{ id: 1, year_month: '2026-06', muxia_invest: 5000, cati_invest: 0, end_total: 12000, summary: '本地预览数据' }, { id: 2, year_month: '2026-07', muxia_invest: 5000, cati_invest: 0, end_total: 12600, summary: '本地预览数据' }],
  assetSnapshots: [{ snapshot_date: '2026-06-30', total_value: 12000 }, { snapshot_date: '2026-07-31', total_value: 12600 }],
  cashFlows: [],
  plan: { initial_capital: 100000, monthly_invest: 5000, months_year1: 7, months_year2plus: 12, rate_low: .03, rate_base: .06, rate_high: .1, bonus1: 50000, bonus2to4: 35000, start_year: 2026, end_year: 2030, updated_at: '2026-07-25T10:00:00.000Z' },
  memos: [{ id: 1, trade_id: 1, memo_date: '2026-07-24', ticker: '510300', ticker_name: '沪深300ETF', trade_quantity: 100, trade_price: 12, position_category: 'A股宽基指数底仓', operation_type: 'buy', reason: '本地预览备忘录。', note: null, stop_loss_triggered: 0, created_at: '2026-07-24T09:00:00.000Z', updated_at: '2026-07-24T09:00:00.000Z' }],
  rules: [{ rule_key: 'risk', value: { single_position_active_cap: .5, loss_pause_ratio: .15, stop_loss_ratio: .3, rebalance_deviation: .05 } }, { rule_key: 'temperature', value: { freeze: 10, low: 12, normal: 16, high: 20 } }],
  rebalances: [{ id: 1, year: 2026, executed_on: '2026-12-20', adjustments: '本地预览调仓', reason: '本地预览', confirmed_at: null, confirmed_by: null }],
  accessLog: [{ id: 1, username: 'local-admin', action: 'login', occurred_at: '2026-07-25T10:00:00.000Z' }],
  importReview: [{ id: 1, batch_id: 'local-preview', row_number: 3, record_kind: 'trade', status: 'pending', raw: { ticker: 'BAD' } }],
};

const files = {
  '/': ['finance-site/index.html', 'text/html; charset=utf-8'],
  '/index.html': ['finance-site/index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['finance-site/styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['finance-site/app.js', 'text/javascript; charset=utf-8'],
  '/fonts/Geist-Variable.ttf': ['finance-site/fonts/Geist-Variable.ttf', 'font/ttf'],
  '/fonts/JetBrainsMono-Variable.ttf': ['finance-site/fonts/JetBrainsMono-Variable.ttf', 'font/ttf'],
  '/fonts/HarmonyOS-Sans-SC.ttf': ['finance-site/fonts/HarmonyOS-Sans-SC.ttf', 'font/ttf'],
};

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return null; }
}

function authenticated(response) {
  if (state.role) return true;
  json(response, 401, { message: '请先使用本地预览账户登录。' });
  return false;
}

function admin(response) {
  if (state.role === 'admin') return true;
  json(response, 403, { message: '本地预览仅 admin 可修改。' });
  return false;
}

function nextId(rows) { return Math.max(0, ...rows.map((row) => Number(row.id) || 0)) + 1; }

function listTrades(url) {
  const start = url.searchParams.get('start'); const end = url.searchParams.get('end'); const ticker = url.searchParams.get('ticker')?.trim().toUpperCase(); const direction = url.searchParams.get('direction');
  return state.trades.filter((row) => (!start || row.trade_date >= start) && (!end || row.trade_date <= end) && (!ticker || row.ticker === ticker) && (!direction || row.direction === direction)).sort((left, right) => right.trade_date.localeCompare(left.trade_date) || right.id - left.id);
}

function listAccess(url) {
  const start = url.searchParams.get('start'); const end = url.searchParams.get('end'); const username = url.searchParams.get('username')?.trim(); const action = url.searchParams.get('action')?.trim(); const endTime = end?.length === 10 ? `${end}T23:59:59.999Z` : end;
  return state.accessLog.filter((row) => (!start || row.occurred_at >= start) && (!endTime || row.occurred_at <= endTime) && (!username || row.username === username) && (!action || row.action === action)).sort((left, right) => right.occurred_at.localeCompare(left.occurred_at) || right.id - left.id);
}

export function startFinancePreview(previewPort = port) {
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${previewPort}`);
  const { pathname } = url;
  if (pathname === '/api/auth/session') return json(response, 200, state.role ? { authenticated: true, username: `local-${state.role}`, role: state.role } : { authenticated: false, username: null, role: null });
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await readJson(request);
    const username = String(body?.username ?? '').trim().toLowerCase();
    if (!username) return json(response, 400, { message: '请输入用户名。' });
    state.role = username.includes('viewer') ? 'viewer' : 'admin';
    state.accessLog.unshift({ id: nextId(state.accessLog), username: `local-${state.role}`, action: 'login', occurred_at: new Date().toISOString() });
    return json(response, 200, { authenticated: true, username: `local-${state.role}`, role: state.role });
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') { state.role = null; return json(response, 200, { authenticated: false }); }
  if (!pathname.startsWith('/api/')) {
    const file = files[pathname];
    if (!file) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(await readFile(resolve(root, file[0])));
    return;
  }
  if (!authenticated(response)) return;
  if (pathname === '/api/holdings') return json(response, 200, state.holdings);
  if (pathname === '/api/trades' && request.method === 'GET') { const rows = listTrades(url); return json(response, 200, { trades: rows.slice(0, 50), items: rows.slice(0, 50), nextCursor: null }); }
  if (pathname === '/api/pe') return json(response, 200, { indexes: state.pe });
  if (pathname === '/api/circuit') return json(response, 200, { active: state.circuit });
  if (pathname === '/api/review') return json(response, 200, { reviews: state.reviews });
  if (pathname === '/api/monthly' && request.method === 'GET') return json(response, 200, { records: state.monthly });
  if (pathname === '/api/assets/series' && request.method === 'GET') return json(response, 200, { view: url.searchParams.get('view') ?? 'month', records: state.assetSnapshots, legacy_monthly_records: [] });
  if (pathname === '/api/cash-flows' && request.method === 'POST') { if (!admin(response)) return; const body = await readJson(request); const row = { id: nextId(state.cashFlows), ...body }; state.cashFlows.unshift(row); return json(response, 201, { cash_flow: row }); }
  if (pathname === '/api/assets/snapshots' && request.method === 'POST') { if (!admin(response)) return; const body = await readJson(request); const row = { snapshot_date: String(body?.snapshot_at ?? '').slice(0, 10), total_value: Number(body?.holdings_value ?? 0) + Number(body?.cash_value ?? 0) }; state.assetSnapshots.push(row); return json(response, 201, { created: true, total_value: row.total_value }); }
  if (pathname === '/api/plan' && request.method === 'GET') return json(response, 200, { plan: state.plan });
  if (pathname === '/api/memos' && request.method === 'GET') return json(response, 200, { memos: state.memos });
  if (pathname === '/api/risk-rules' && request.method === 'GET') return json(response, 200, { rules: state.rules });
  if (pathname === '/api/rebalances') return json(response, 200, { rebalances: state.rebalances });
  if (pathname === '/api/notifications') return json(response, 200, { active_circuit: state.circuit, monthly_confirmation: null, unconfirmed_viewers: [], annual_review_due: false });
  if (pathname === '/api/access-log') { if (!admin(response)) return; const rows = listAccess(url); return json(response, 200, { access_log: rows.slice(0, 50), items: rows.slice(0, 50), nextCursor: null }); }
  if (pathname === '/api/import-review') { if (!admin(response)) return; return json(response, 200, { review: state.importReview }); }
  if (pathname === '/api/trades' && request.method === 'POST') {
    if (!admin(response)) return;
    const body = await readJson(request); const row = { id: nextId(state.trades), ...body, ticker: String(body?.ticker ?? '').trim().toUpperCase(), reason: body?.reason ?? null, created_by: 'local-admin' };
    state.trades.push(row); return json(response, 201, { trade: row });
  }
  const tradeMatch = pathname.match(/^\/api\/trades\/(\d+)$/);
  if (tradeMatch && ['PATCH', 'PUT', 'DELETE'].includes(request.method ?? '')) {
    if (!admin(response)) return;
    const id = Number(tradeMatch[1]); const index = state.trades.findIndex((row) => row.id === id);
    if (index < 0) return json(response, 404, { message: '交易不存在。' });
    if (request.method === 'DELETE') { state.trades.splice(index, 1); return json(response, 200, { deleted: true }); }
    const body = await readJson(request); Object.assign(state.trades[index], body, { id }); return json(response, 200, { trade: state.trades[index] });
  }
  if (pathname === '/api/memos' && request.method === 'POST') {
    if (!admin(response)) return;
    const body = await readJson(request); const trade = state.trades.find((row) => row.id === Number(body?.trade_id));
    if (!trade) return json(response, 404, { message: '交易不存在。' });
    if (state.memos.some((row) => row.trade_id === trade.id)) return json(response, 409, { message: '一笔交易只能关联一条备忘录。' });
    const now = new Date().toISOString(); const memo = { id: nextId(state.memos), trade_id: trade.id, memo_date: trade.trade_date, ticker: trade.ticker, ticker_name: trade.ticker_name || null, trade_quantity: trade.quantity, trade_price: trade.price, position_category: trade.position_category, operation_type: trade.direction, reason: String(body?.reason ?? ''), note: body?.note || null, stop_loss_triggered: body?.stop_loss_triggered ? 1 : 0, created_at: now, updated_at: now };
    state.memos.unshift(memo); return json(response, 201, { memo });
  }
  const memoMatch = pathname.match(/^\/api\/memos\/(\d+)$/);
  if (memoMatch && ['PATCH', 'PUT', 'DELETE'].includes(request.method ?? '')) {
    if (!admin(response)) return;
    const id = Number(memoMatch[1]); const memo = state.memos.find((row) => row.id === id);
    if (!memo) return json(response, 404, { message: '备忘录不存在。' });
    if (request.method === 'DELETE') { state.memos = state.memos.filter((row) => row.id !== id); return json(response, 200, { deleted: true }); }
    const body = await readJson(request);
    if (Number(body?.trade_id) !== memo.trade_id) return json(response, 409, { message: '关联交易不能修改。' });
    Object.assign(memo, { reason: String(body?.reason ?? ''), note: body?.note || null, stop_loss_triggered: body?.stop_loss_triggered ? 1 : 0, updated_at: new Date().toISOString() });
    return json(response, 200, { memo });
  }
  if (pathname === '/api/monthly' && request.method === 'PUT') {
    if (!admin(response)) return;
    const body = await readJson(request); const index = state.monthly.findIndex((row) => row.year_month === body?.year_month); const row = { id: index < 0 ? nextId(state.monthly) : state.monthly[index].id, ...body };
    if (index < 0) state.monthly.push(row); else state.monthly[index] = row; return json(response, 200, { record: row });
  }
  if (pathname === '/api/plan' && request.method === 'PUT') { if (!admin(response)) return; Object.assign(state.plan, await readJson(request)); return json(response, 200, { plan: state.plan }); }
  if (pathname === '/api/risk-rules' && request.method === 'PUT') return admin(response) ? json(response, 200, { saved: true }) : undefined;
  if (pathname === '/api/import-review/1' && request.method === 'PATCH') { if (!admin(response)) return; state.importReview = []; return json(response, 200, { resolved: true }); }
  if (pathname === '/api/archive') { response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Local Finance preview export.'); return; }
  return json(response, 404, { message: `本地预览未实现 ${request.method} ${pathname}` });
});

server.listen(previewPort, '127.0.0.1', () => {
  const address = server.address(); const openedPort = address && typeof address !== 'string' ? address.port : previewPort;
  console.log(`Finance local preview: http://127.0.0.1:${openedPort}`);
  console.log('Login: use any non-empty username and password. Include "viewer" in the username for read-only mode; all other names use admin mode.');
  console.log('This server is memory-only and never connects to production resources. Press Ctrl+C to stop.');
});
return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = startFinancePreview();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
