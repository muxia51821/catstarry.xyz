CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  ticker TEXT NOT NULL,
  ticker_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  position_category TEXT NOT NULL,
  reason TEXT,
  needs_review INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS holdings_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL,
  ticker TEXT NOT NULL,
  quantity REAL NOT NULL,
  avg_cost REAL NOT NULL,
  position_category TEXT NOT NULL,
  UNIQUE (snapshot_date, ticker)
);

CREATE TABLE IF NOT EXISTS market_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  price REAL,
  pe_ttm REAL,
  fetched_at TEXT NOT NULL,
  UNIQUE (ticker, fetched_at)
);

CREATE TABLE IF NOT EXISTS circuit_breaker_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL CHECK (level IN ('yellow', 'red', 'black')),
  reason TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  resolved_at TEXT
);
