import { getMainSiteSession, getSessionToken } from '../../../../shared/auth';
import type { LoginRequest, LoginResponse, SessionStatus } from '../../../../shared/types';
import { apiError, json, readJson, requestIp } from '../lib/http';
import { comparePassword, hasValidBcryptPasswordLength } from '../modules/passwords';

const SESSION_SECONDS = 12 * 60 * 60;
const RATE_LIMIT_SECONDS = 5 * 60;
const MAX_LOGIN_ATTEMPTS = 10;

interface AuthUser {
  password_hash: string;
  role?: string;
}

interface MainAuthEnv {
  AUTH_KV: KVNamespace;
  DB: D1Database;
  COOKIE_DOMAIN?: string;
  LOCAL_PREVIEW_AUTH?: string;
}

export async function handleAuth(request: Request, env: MainAuthEnv, pathname: string): Promise<Response> {
  if (pathname === '/api/auth/session' && request.method === 'GET') {
    const session = await getMainSiteSession(request, { sessions: env.AUTH_KV, database: env.DB });
    return json(session);
  }
  if (pathname === '/api/auth/login' && request.method === 'POST') return handleLogin(request, env);
  if (pathname === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env);
  return apiError(404, 'not_found', 'Authentication route not found');
}

export async function requireMainSession(request: Request, env: MainAuthEnv): Promise<SessionStatus | Response> {
  const session = await getMainSiteSession(request, { sessions: env.AUTH_KV, database: env.DB });
  return session.authenticated ? session : apiError(401, 'unauthorized', 'Authentication is required');
}

async function handleLogin(request: Request, env: MainAuthEnv): Promise<Response> {
  const body = await readJson<LoginRequest>(request, 4_096);
  if (body instanceof Response) return body;
  if (!isCredential(body.username) || !isCredential(body.password) || !hasValidBcryptPasswordLength(body.password)) {
    return apiError(400, 'invalid_credentials', 'Username or password is invalid');
  }

  const ip = requestIp(request);
  const rateKey = `ratelimit:login:${ip}`;
  const attempts = Number(await env.AUTH_KV.get(rateKey) ?? '0');
  if (Number.isFinite(attempts) && attempts >= MAX_LOGIN_ATTEMPTS) {
    return apiError(429, 'rate_limited', 'Too many login attempts; try again later');
  }

  const user = await env.AUTH_KV.get<AuthUser>(`user:${body.username}`, 'json');
  const valid = !!user?.password_hash && await comparePassword(body.password, user.password_hash);
  if (!valid) {
    await env.AUTH_KV.put(rateKey, String((Number.isFinite(attempts) ? attempts : 0) + 1), {
      expirationTtl: RATE_LIMIT_SECONDS,
    });
    return apiError(401, 'invalid_credentials', 'Username or password is incorrect');
  }

  await env.AUTH_KV.delete(rateKey);
  const token = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_SECONDS * 1000).toISOString();
  const session = { username: body.username, created_at: createdAt.toISOString(), expires_at: expiresAt };
  await Promise.all([
    env.AUTH_KV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: SESSION_SECONDS }),
    env.DB.prepare(
      'INSERT INTO auth_sessions (token, username, created_at, expires_at, ip) VALUES (?, ?, ?, ?, ?)',
    ).bind(token, body.username, session.created_at, expiresAt, ip).run(),
  ]);

  const payload: LoginResponse = { token, expires_at: expiresAt };
  const headers = new Headers();
  headers.set('Set-Cookie', sessionCookie(token, SESSION_SECONDS, env.COOKIE_DOMAIN, env.LOCAL_PREVIEW_AUTH !== '1'));
  return json(payload, 200, headers);
}

async function handleLogout(request: Request, env: MainAuthEnv): Promise<Response> {
  const token = getSessionToken(request);
  if (token) {
    await Promise.all([
      env.AUTH_KV.delete(`session:${token}`),
      env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run(),
    ]);
  }
  const headers = new Headers();
  headers.set('Set-Cookie', sessionCookie('', 0, env.COOKIE_DOMAIN, env.LOCAL_PREVIEW_AUTH !== '1'));
  return json({ authenticated: false }, 200, headers);
}

function sessionCookie(token: string, maxAge: number, domain?: string, secure = true): string {
  const parts = [
    `token=${encodeURIComponent(token)}`,
    'HttpOnly',
  ];
  if (secure) parts.push('Secure');
  parts.push('SameSite=Lax', 'Path=/', `Max-Age=${maxAge}`);

  if (domain) {
    const normalized = domain.trim().replace(/^\./, '').toLowerCase();
    if (!/^[a-z0-9.-]+$/.test(normalized) || !normalized.includes('.')) {
      throw new Error('COOKIE_DOMAIN is invalid');
    }
    parts.push(`Domain=.${normalized}`);
  }

  return parts.join('; ');
}

function isCredential(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}
