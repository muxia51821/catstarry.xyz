CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('CN', 'HK', 'US')),
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  fees REAL NOT NULL DEFAULT 0,
  traded_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trades_symbol_traded_at ON trades (symbol, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_market_traded_at ON trades (market, traded_at DESC);

CREATE TABLE IF NOT EXISTS holdings_snapshots (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('CN', 'HK', 'US')),
  quantity REAL NOT NULL,
  average_cost REAL NOT NULL,
  market_price REAL,
  market_value REAL,
  snapshot_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_holdings_snapshots_symbol_snapshot_at
  ON holdings_snapshots (symbol, snapshot_at DESC);

CREATE TABLE IF NOT EXISTS market_data (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('CN', 'HK', 'US')),
  price REAL NOT NULL,
  change_percent REAL,
  volume REAL,
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol_observed_at
  ON market_data (symbol, observed_at DESC);

CREATE TABLE IF NOT EXISTS circuit_breaker_log (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  reason TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_log_source_opened_at
  ON circuit_breaker_log (source, opened_at DESC);
