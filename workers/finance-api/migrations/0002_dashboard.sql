CREATE TABLE IF NOT EXISTS position_limits (
  position_category TEXT PRIMARY KEY,
  target_ratio REAL NOT NULL,
  lower_ratio REAL NOT NULL,
  upper_ratio REAL NOT NULL,
  CHECK (0 <= lower_ratio AND lower_ratio <= target_ratio AND target_ratio <= upper_ratio AND upper_ratio <= 1)
);

CREATE TABLE IF NOT EXISTS annual_reviews (
  year INTEGER PRIMARY KEY,
  calculation_json TEXT NOT NULL,
  summary TEXT,
  calculated_at TEXT NOT NULL,
  confirmed_by TEXT,
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS monthly_confirmations (
  period TEXT NOT NULL,
  username TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  PRIMARY KEY (period, username)
);

CREATE TABLE IF NOT EXISTS finance_access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_import_batches (
  batch_id TEXT PRIMARY KEY,
  import_kind TEXT NOT NULL CHECK (import_kind IN ('trades', 'holdings_snapshots')),
  source_rows INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_import_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  record_kind TEXT NOT NULL CHECK (record_kind IN ('trade', 'holding_snapshot')),
  raw_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolution_note TEXT,
  resolved_at TEXT,
  UNIQUE (batch_id, row_number, record_kind)
);

CREATE INDEX IF NOT EXISTS idx_finance_access_log_time
  ON finance_access_log (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_import_review_status
  ON finance_import_review (status, id DESC);

CREATE INDEX IF NOT EXISTS idx_finance_trades_date
  ON trades (trade_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_finance_holdings_latest
  ON holdings_snapshots (ticker, snapshot_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_finance_circuit_active
  ON circuit_breaker_log (resolved_at, triggered_at DESC, id DESC);

CREATE TRIGGER IF NOT EXISTS trg_finance_holdings_nonnegative_insert
BEFORE INSERT ON holdings_snapshots
WHEN NEW.quantity < 0
BEGIN
  SELECT RAISE(ABORT, 'holding_quantity_cannot_be_negative');
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_holdings_nonnegative_update
BEFORE UPDATE OF quantity ON holdings_snapshots
WHEN NEW.quantity < 0
BEGIN
  SELECT RAISE(ABORT, 'holding_quantity_cannot_be_negative');
END;

INSERT OR IGNORE INTO position_limits (position_category, target_ratio, lower_ratio, upper_ratio) VALUES
  ('主动操作仓（A股）', 0.40, 0.25, 0.55),
  ('A股宽基指数底仓', 0.15, 0.10, 0.25),
  ('美股ETF（A股跨境ETF）', 0.20, 0.10, 0.30),
  ('黄金ETF', 0.10, 0.05, 0.18),
  ('机动仓（货币ETF）', 0.15, 0.05, 0.25),
  ('A股总敞口（主动+宽基）', 0.55, 0.35, 0.65);
