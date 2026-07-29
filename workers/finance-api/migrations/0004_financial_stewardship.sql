-- Finance-only continuation of the candidate parity migration.  Account
-- structures are deliberately outside the jointly managed investment product.
DROP TABLE IF EXISTS finance_accounts;


CREATE TABLE IF NOT EXISTS finance_investment_rules (
  rule_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_rule_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_key TEXT NOT NULL,
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER,
  memo_date TEXT NOT NULL,
  ticker TEXT,
  position_category TEXT,
  operation_type TEXT,
  reason TEXT NOT NULL,
  stop_loss_triggered INTEGER NOT NULL DEFAULT 0 CHECK (stop_loss_triggered IN (0, 1)),
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS finance_rebalance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  executed_on TEXT NOT NULL,
  adjustments TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  confirmed_by TEXT,
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS finance_review_confirmations (
  year INTEGER NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  confirmed_at TEXT NOT NULL,
  PRIMARY KEY (year, username)
);

CREATE TABLE IF NOT EXISTS finance_circuit_resolution_confirmations (
  circuit_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  note TEXT,
  confirmed_at TEXT NOT NULL,
  PRIMARY KEY (circuit_id, username)
);

CREATE TABLE IF NOT EXISTS finance_workbook_imports (
  batch_id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_rows INTEGER NOT NULL,
  imported_rows INTEGER NOT NULL,
  review_rows INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_workbook_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  record_kind TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolution_note TEXT,
  resolved_at TEXT,
  UNIQUE (batch_id, sheet_name, row_number, record_kind)
);

CREATE INDEX IF NOT EXISTS idx_finance_memos_active_date ON finance_memos (deleted_at, memo_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_rebalances_year ON finance_rebalance_records (year DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_workbook_review_status ON finance_workbook_review (status, id DESC);

INSERT OR IGNORE INTO finance_investment_rules (rule_key, value_json, updated_at, updated_by) VALUES
  ('risk', '{"single_position_active_cap":0.5,"loss_pause_ratio":0.15,"stop_loss_ratio":0.3,"take_profit_ratio":0.4,"rebalance_deviation":0.05}', '2026-06-01T00:00:00.000Z', 'workbook-baseline'),
  ('temperature', '{"freeze":10,"low":12,"normal":16,"high":20}', '2026-06-01T00:00:00.000Z', 'workbook-baseline'),
  ('contributions', '{"muxia_monthly_invest":2500,"cati_monthly_invest":2500,"muxia_bonus_year1":50000,"muxia_bonus_later":65000,"cati_bonus_year1":50000,"cati_bonus_later":65000}', '2026-06-01T00:00:00.000Z', 'workbook-baseline');
