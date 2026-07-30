-- Forward-only Finance data integrity contract. This migration is not applied by this task.

CREATE TABLE IF NOT EXISTS finance_market_indexes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  display_name TEXT NOT NULL,
  current_value REAL NOT NULL,
  previous_close REAL NOT NULL,
  change_value REAL NOT NULL,
  change_percent REAL NOT NULL,
  market_status TEXT NOT NULL CHECK (market_status IN ('open', 'closed', 'unknown')),
  market_time TEXT,
  trading_date TEXT,
  fetched_at TEXT NOT NULL,
  UNIQUE (symbol, fetched_at)
);

CREATE TABLE IF NOT EXISTS finance_cash_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_on TEXT NOT NULL,
  contributor TEXT NOT NULL CHECK (contributor IN ('muxia', 'cati')),
  flow_type TEXT NOT NULL CHECK (flow_type IN ('monthly_investment', 'bonus_investment', 'additional_investment', 'withdrawal', 'adjustment')),
  bonus_source_year INTEGER,
  baseline_amount REAL,
  confirmed_amount REAL NOT NULL,
  manager_share_offset REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  CHECK (bonus_source_year IS NULL OR bonus_source_year BETWEEN 2000 AND 2200),
  CHECK (confirmed_amount >= 0),
  CHECK (manager_share_offset >= 0),
  CHECK (flow_type = 'withdrawal' OR net_amount >= 0),
  CHECK ((flow_type = 'bonus_investment' AND bonus_source_year IS NOT NULL) OR (flow_type <> 'bonus_investment' AND bonus_source_year IS NULL))
);

CREATE TABLE IF NOT EXISTS finance_asset_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_at TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  holdings_value REAL NOT NULL,
  cash_value REAL NOT NULL,
  total_value REAL NOT NULL,
  source TEXT NOT NULL,
  is_complete INTEGER NOT NULL CHECK (is_complete IN (0, 1)),
  incomplete_reason TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT,
  UNIQUE (snapshot_at, source),
  CHECK (holdings_value >= 0 AND cash_value >= 0 AND total_value >= 0),
  CHECK (total_value = holdings_value + cash_value)
);

CREATE TABLE IF NOT EXISTS finance_cash_flow_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cash_flow_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_finance_market_indexes_latest
  ON finance_market_indexes (symbol, fetched_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_cash_flows_active_date
  ON finance_cash_flows (deleted_at, occurred_on DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_cash_flow_audit_flow
  ON finance_cash_flow_audit (cash_flow_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_asset_snapshots_complete_date
  ON finance_asset_snapshots (is_complete, snapshot_at DESC, id DESC);
