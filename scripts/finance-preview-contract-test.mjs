import assert from 'node:assert/strict';
import { once } from 'node:events';
import { startFinancePreview } from './finance-preview.mjs';

const server = startFinancePreview(0);
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Finance preview did not expose a TCP port');
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const page = await fetch(`${baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /数据面板/);
  const session = await fetch(`${baseUrl}/api/auth/session`).then((response) => response.json());
  assert.equal(session.authenticated, false);
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'preview-admin', password: 'local-only' }) }).then((response) => response.json());
  assert.deepEqual(login, { authenticated: true, username: 'local-admin', role: 'admin' });
  const holdings = await fetch(`${baseUrl}/api/holdings`).then((response) => response.json());
  assert.equal(holdings.total_market_value, 12600);
  const created = await fetch(`${baseUrl}/api/trades`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trade_date: '2026-07-30', ticker: '510500', direction: 'buy', quantity: 1, price: 5, position_category: 'A股宽基指数底仓' }) }).then((response) => response.json());
  assert.equal(created.trade.ticker, '510500');
  const trades = await fetch(`${baseUrl}/api/trades?ticker=510500`).then((response) => response.json());
  assert.equal(trades.items.length, 1);
  console.log('Finance local preview contract passed.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
