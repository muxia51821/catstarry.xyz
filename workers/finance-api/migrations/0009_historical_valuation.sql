-- Historical valuation follows a facts + quotes model.
-- finance_security_prices stores canonical raw/unadjusted closes.
-- finance_asset_valuations is a rebuildable cache; it is not accounting source-of-truth.
-- finance_asset_snapshots remains legacy/reconciliation evidence and is not copied here.

CREATE TABLE IF NOT EXISTS finance_security_prices (
  ticker TEXT NOT NULL,
  price_date TEXT NOT NULL CHECK (price_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  close REAL NOT NULL CHECK (close > 0),
  source TEXT NOT NULL,
  adjustment TEXT NOT NULL DEFAULT 'raw' CHECK (adjustment = 'raw'),
  observed_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  PRIMARY KEY (ticker, price_date, source)
);

CREATE INDEX IF NOT EXISTS idx_finance_security_prices_date
  ON finance_security_prices (price_date DESC, ticker);
CREATE INDEX IF NOT EXISTS idx_finance_security_prices_ticker
  ON finance_security_prices (ticker, price_date DESC);

CREATE TABLE IF NOT EXISTS finance_asset_valuations (
  valuation_date TEXT PRIMARY KEY CHECK (valuation_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  securities_value REAL NOT NULL CHECK (securities_value >= 0),
  cash_value REAL NOT NULL CHECK (cash_value >= 0),
  other_assets_value REAL NOT NULL DEFAULT 0 CHECK (other_assets_value >= 0),
  total_value REAL NOT NULL CHECK (total_value >= 0),
  held_position_count INTEGER NOT NULL CHECK (held_position_count >= 0),
  priced_position_count INTEGER NOT NULL CHECK (priced_position_count >= 0 AND priced_position_count <= held_position_count),
  is_complete INTEGER NOT NULL DEFAULT 0 CHECK (is_complete IN (0, 1)),
  incomplete_reason TEXT,
  price_source TEXT,
  source TEXT NOT NULL DEFAULT 'derived',
  calculated_at TEXT NOT NULL,
  CHECK (ABS(total_value - (securities_value + cash_value + other_assets_value)) < 0.01),
  CHECK ((is_complete = 1 AND priced_position_count = held_position_count AND incomplete_reason IS NULL)
      OR (is_complete = 0))
);

CREATE INDEX IF NOT EXISTS idx_finance_asset_valuations_complete_date
  ON finance_asset_valuations (is_complete, valuation_date DESC);
