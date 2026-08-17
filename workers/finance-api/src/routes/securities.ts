import { apiError, json } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

type SecurityRow = {
  ticker: string;
  instrument_type: 'stock' | 'etf' | 'fund' | 'other';
  security_attribute: string;
  attribute_source: string;
  updated_at: string;
  updated_by: string;
};

type SecurityFilter = {
  ticker: string | null;
  security_attribute: string | null;
  instrument_type: string | null;
};

export async function handleSecurities(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const ticker = normalizeTicker(url.searchParams.get('ticker'));
  if (ticker === undefined) return apiError(400, 'invalid_ticker', 'ticker is invalid');
  const attribute = normalizeFilter(url.searchParams.get('security_attribute'), 100);
  if (attribute === undefined) return apiError(400, 'invalid_security_attribute', 'security_attribute is invalid');
  const instrument = normalizeInstrument(url.searchParams.get('instrument_type'));
  if (instrument === undefined) return apiError(400, 'invalid_instrument_type', 'instrument_type is invalid');

  const built = buildSecurityQuery({ ticker, security_attribute: attribute, instrument_type: instrument });
  const rows = await env.DB.prepare(built.query).bind(...built.values).all<SecurityRow>();
  return json({ securities: rows.results, count: rows.results.length });
}

export function buildSecurityQuery(filter: SecurityFilter) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filter.ticker) { clauses.push('ticker = ?'); values.push(filter.ticker); }
  if (filter.security_attribute) { clauses.push('security_attribute = ?'); values.push(filter.security_attribute); }
  if (filter.instrument_type) { clauses.push('instrument_type = ?'); values.push(filter.instrument_type); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return {
    query: `SELECT ticker, instrument_type, security_attribute, attribute_source, updated_at, updated_by
      FROM finance_securities ${where} ORDER BY ticker`,
    values,
  };
}

function normalizeTicker(value: string | null) {
  if (value === null || value.trim() === '') return null;
  const ticker = value.trim().toUpperCase();
  return /^[A-Z0-9._-]{1,24}$/.test(ticker) ? ticker : undefined;
}

function normalizeFilter(value: string | null, maximum: number) {
  if (value === null || value.trim() === '') return null;
  const result = value.trim();
  return result.length <= maximum ? result : undefined;
}

function normalizeInstrument(value: string | null) {
  if (value === null || value.trim() === '') return null;
  const result = value.trim().toLowerCase();
  return ['stock', 'etf', 'fund', 'other'].includes(result) ? result : undefined;
}
