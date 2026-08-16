-- Forward-only historical-fidelity fields and the small account-event ledger.
ALTER TABLE trades RENAME TO finance_trades_before_history;
CREATE TABLE trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  trade_time TEXT,
  ticker TEXT NOT NULL,
  ticker_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  fee REAL,
  net_cash_amount REAL,
  position_category TEXT NOT NULL,
  reason TEXT,
  needs_review INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  CHECK (trade_time IS NULL OR (trade_time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(trade_time, 1, 2) <= '23')),
  CHECK (fee IS NULL OR (fee >= 0 AND fee < 1.0e308))
);
INSERT INTO trades (id,trade_date,ticker,ticker_name,direction,quantity,price,position_category,reason,needs_review,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by)
  SELECT id,trade_date,ticker,ticker_name,direction,quantity,price,position_category,reason,needs_review,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by FROM finance_trades_before_history;
DROP TABLE finance_trades_before_history;

ALTER TABLE finance_memos RENAME TO finance_memos_before_history;
CREATE TABLE finance_memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER,
  memo_date TEXT NOT NULL,
  ticker TEXT,
  position_category TEXT,
  operation_type TEXT,
  reason TEXT NOT NULL,
  reason_source TEXT CHECK (reason_source IS NULL OR reason_source IN ('original', 'reconstructed_confirmed')),
  stop_loss_triggered INTEGER NOT NULL DEFAULT 0 CHECK (stop_loss_triggered IN (0, 1)),
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);
INSERT INTO finance_memos (id,trade_id,memo_date,ticker,position_category,operation_type,reason,stop_loss_triggered,note,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by)
  SELECT id,trade_id,memo_date,ticker,position_category,operation_type,reason,stop_loss_triggered,note,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by FROM finance_memos_before_history;
DROP TABLE finance_memos_before_history;

CREATE TABLE IF NOT EXISTS finance_account_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_date TEXT NOT NULL,
  event_time TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('dividend', 'dividend_tax', 'split', 'repo_start', 'repo_maturity', 'refund', 'other')),
  ticker TEXT,
  ticker_name TEXT,
  quantity REAL,
  reference_value REAL,
  amount REAL,
  position_category TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS finance_account_event_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_event_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_finance_account_events_active_date
  ON finance_account_events (deleted_at, event_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_account_event_audit_event
  ON finance_account_event_audit (account_event_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_trades_date
  ON trades (trade_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_trades_active_date
  ON trades (deleted_at, ticker, trade_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_memos_active_date
  ON finance_memos (deleted_at, memo_date DESC, id DESC);
