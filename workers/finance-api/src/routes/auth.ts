import { compare } from 'bcryptjs';

import { getFinanceSession, getSessionToken, hasRole, type FinanceRole, type FinanceSessionStatus } from '../../../../shared/auth';
import { apiError, json, readJson } from '../lib/http';

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const MAX_PASSWORD_BYTES = 72;

export type FinanceEnv = Env & {
  FINANCE_SITE_ORIGIN?: string;
  MARKET_PROVIDER_URL?: string;
  MARKET_PROVIDER_TOKEN?: string;
};

interface UserRecord {
  password_hash: string;
  role: FinanceRole;
}

export async function handleFinanceAuth(request: Request, env: FinanceEnv, pathname: string): Promise<Response> {
  if (pathname === '/api/auth/login' && request.method === 'POST') return login(request, env);
  if (pathname === '/api/auth/logout' && request.method === 'POST') return logout(request, env);
  if (pathname === '/api/auth/session' && request.method === 'GET') return session(request, env);
  return apiError(404, 'not_found', 'Auth route not found');
}

export async function requireFinanceRole(
  request: Request,
  env: FinanceEnv,
  roles: readonly FinanceRole[] = ['admin', 'viewer'],
): Promise<FinanceSessionStatus | Response> {
  const session = await getFinanceSession(request, { sessions: env.FINANCE_AUTH_KV });
  if (!session.authenticated) return apiError(401, 'unauthorized', 'Authentication required');
  if (!hasRole(session, roles)) return apiError(403, 'forbidden', 'The current role cannot perform this action');
  return session;
}

async function login(request: Request, env: FinanceEnv): Promise<Response> {
  const body = await readJson<{ username?: unknown; password?: unknown }>(request, 4_096);
  if (body instanceof Response) return body;
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[a-z0-9_-]{2,64}$/i.test(username) || !validPassword(password)) {
    return apiError(400, 'invalid_credentials', 'Username or password format is invalid');
  }
  const address = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const rateKey = `ratelimit:login:${await shortHash(address)}`;
  const attempts = Number(await env.FINANCE_AUTH_KV.get(rateKey) ?? '0');
  if (Number.isFinite(attempts) && attempts >= 10) return apiError(429, 'rate_limited', 'Too many login attempts');

  const record = await env.FINANCE_AUTH_KV.get<UserRecord>(`user:${username}`, 'json');
  const authenticated = !!record
    && (record.role === 'admin' || record.role === 'viewer')
    && await compare(password, record.password_hash);
  if (!authenticated || !record) {
    await env.FINANCE_AUTH_KV.put(rateKey, String((Number.isFinite(attempts) ? attempts : 0) + 1), { expirationTtl: 300 });
    return apiError(401, 'invalid_credentials', 'Username or password is incorrect');
  }

  await env.FINANCE_AUTH_KV.delete(rateKey);
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1_000).toISOString();
  await env.FINANCE_AUTH_KV.put(`session:${token}`, JSON.stringify({
    username,
    role: record.role,
    expires_at: expiresAt,
  }), { expirationTtl: SESSION_TTL_SECONDS });
  await logAccess(env.DB, username, 'login');
  return json({ authenticated: true, username, role: record.role, expires_at: expiresAt }, 200, {
    'Set-Cookie': `token=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`,
  });
}

async function logout(request: Request, env: FinanceEnv): Promise<Response> {
  const token = getSessionToken(request);
  if (token) await env.FINANCE_AUTH_KV.delete(`session:${token}`);
  return json({ authenticated: false }, 200, {
    'Set-Cookie': 'token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
  });
}

async function session(request: Request, env: FinanceEnv): Promise<Response> {
  const state = await getFinanceSession(request, { sessions: env.FINANCE_AUTH_KV });
  if (state.authenticated && state.username) await logAccess(env.DB, state.username, 'session');
  return json(state);
}

function validPassword(value: string): boolean {
  const bytes = new TextEncoder().encode(value).byteLength;
  return bytes >= 12 && bytes <= MAX_PASSWORD_BYTES;
}

async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function logAccess(database: D1Database, username: string, action: string): Promise<void> {
  await database.prepare('INSERT INTO finance_access_log (username, action, occurred_at) VALUES (?, ?, ?)')
    .bind(username, action, new Date().toISOString()).run();
}
