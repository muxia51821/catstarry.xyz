import type { SessionStatus } from './types';

export interface SessionRecord {
  username: string;
  expires_at: string;
  role?: 'admin' | 'viewer';
}

export interface MainSiteAuthBindings {
  sessions: KVNamespace;
  database?: D1Database;
}

export interface FinanceAuthBindings {
  sessions: KVNamespace;
}

function getSessionToken(request: Request): string | null {
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isCurrentSession(record: SessionRecord): boolean {
  return Number.isFinite(Date.parse(record.expires_at)) && Date.parse(record.expires_at) > Date.now();
}

async function readSession(
  request: Request,
  sessions: KVNamespace,
): Promise<SessionRecord | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const record = await sessions.get<SessionRecord>(`session:${token}`, 'json');
  return record && isCurrentSession(record) ? record : null;
}

export async function getMainSiteSession(
  request: Request,
  bindings: MainSiteAuthBindings,
): Promise<SessionStatus> {
  const record = await readSession(request, bindings.sessions);
  if (!record) return { authenticated: false };

  return {
    authenticated: true,
    username: record.username,
    role: record.role,
  };
}

export async function getFinanceSession(
  request: Request,
  bindings: FinanceAuthBindings,
): Promise<SessionStatus> {
  const record = await readSession(request, bindings.sessions);
  if (!record) return { authenticated: false };

  return {
    authenticated: true,
    username: record.username,
    role: record.role,
  };
}

export function hasRole(
  session: SessionStatus,
  allowedRoles: readonly NonNullable<SessionStatus['role']>[],
): boolean {
  return session.authenticated && !!session.role && allowedRoles.includes(session.role);
}
