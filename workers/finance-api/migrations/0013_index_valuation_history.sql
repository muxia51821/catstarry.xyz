-- Historical index valuation is a read cache from CSI. It is separate from
-- current market_data and never becomes an accounting or quote authority.
CREATE TABLE IF NOT EXISTS finance_index_valuation_history (
  symbol TEXT NOT NULL CHECK (symbol IN ('CSI300_PE', 'CSI500_PE', 'CSI1000_PE', 'STAR50_PE')),
  observation_date TEXT NOT NULL CHECK (observation_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  pe_ttm REAL NOT NULL CHECK (pe_ttm > 0),
  source TEXT NOT NULL CHECK (source = 'CSI'),
  imported_at TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  PRIMARY KEY (symbol, observation_date)
);

CREATE INDEX IF NOT EXISTS idx_finance_index_valuation_history_symbol_date
  ON finance_index_valuation_history (symbol, observation_date DESC);
