-- Candidate-equivalent Finance records.  These tables stay within the Finance
-- database and are deliberately independent from site authentication storage.

-- SQLite cannot add these columns idempotently. Rebuilding the small ledger
-- table is safe here: it preserves every existing row and keeps this migration
-- reproducible in the repository's isolated empty-database verification.
DROP TABLE IF EXISTS finance_trades_legacy;
ALTER TABLE trades RENAME TO finance_trades_legacy;
CREATE TABLE trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  ticker TEXT NOT NULL,
  ticker_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  position_category TEXT NOT NULL,
  reason TEXT,
  needs_review INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);
INSERT INTO trades (
  id, trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, needs_review, created_at, created_by
) SELECT
  id, trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, needs_review,
  trade_date || 'T00:00:00.000Z', 'legacy-import'
FROM finance_trades_legacy;
DROP TABLE finance_trades_legacy;

CREATE TABLE IF NOT EXISTS finance_trade_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE TABLE IF NOT EXISTS monthly_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL UNIQUE CHECK (year_month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  muxia_invest REAL NOT NULL DEFAULT 0,
  cati_invest REAL NOT NULL DEFAULT 0,
  end_total REAL,
  sse300_pe REAL,
  sse500_pe REAL,
  sse1000_pe REAL,
  blue_chip_temp TEXT,
  summary TEXT,
  remark TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS plan_params (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  initial_capital REAL NOT NULL DEFAULT 0,
  monthly_invest REAL NOT NULL DEFAULT 0,
  months_year1 INTEGER NOT NULL DEFAULT 7,
  months_year2plus INTEGER NOT NULL DEFAULT 12,
  rate_low REAL NOT NULL DEFAULT 0.03,
  rate_base REAL NOT NULL DEFAULT 0.06,
  rate_high REAL NOT NULL DEFAULT 0.10,
  bonus1 REAL NOT NULL DEFAULT 50000,
  bonus2to4 REAL NOT NULL DEFAULT 35000,
  start_year INTEGER NOT NULL DEFAULT 2026,
  end_year INTEGER NOT NULL DEFAULT 2030,
  updated_at TEXT,
  updated_by TEXT,
  CHECK (initial_capital >= 0 AND monthly_invest >= 0),
  CHECK (months_year1 BETWEEN 0 AND 12 AND months_year2plus BETWEEN 0 AND 12),
  CHECK (rate_low >= 0 AND rate_low <= rate_base AND rate_base <= rate_high AND rate_high <= 1),
  CHECK (start_year BETWEEN 2000 AND 2200 AND end_year BETWEEN start_year AND 2200)
);

CREATE TABLE IF NOT EXISTS finance_plan_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL,
  owner TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  archived_at TEXT,
  archived_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_finance_trades_date
  ON trades (trade_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_trades_active_date
  ON trades (deleted_at, ticker, trade_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_trade_audit_trade
  ON finance_trade_audit (trade_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_records_active_period
  ON monthly_records (deleted_at, year_month DESC);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_active
  ON finance_accounts (archived_at, name);

INSERT OR IGNORE INTO plan_params (id) VALUES (1);
