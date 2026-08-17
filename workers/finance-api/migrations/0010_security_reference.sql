-- Minimal security reference metadata.
-- Portfolio Role remains the existing position_category on trades/holdings.
-- This table only answers what the security is; it is deliberately not a generic taxonomy engine.
CREATE TABLE IF NOT EXISTS finance_securities (
  ticker TEXT PRIMARY KEY,
  instrument_type TEXT NOT NULL CHECK (instrument_type IN ('stock', 'etf', 'fund', 'other')),
  security_attribute TEXT NOT NULL,
  attribute_source TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  CHECK (length(ticker) BETWEEN 1 AND 24),
  CHECK (length(security_attribute) BETWEEN 1 AND 100),
  CHECK (length(attribute_source) BETWEEN 1 AND 128)
);

CREATE INDEX IF NOT EXISTS idx_finance_securities_attribute
  ON finance_securities (security_attribute, ticker);
