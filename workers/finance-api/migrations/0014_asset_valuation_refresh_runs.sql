CREATE TABLE IF NOT EXISTS finance_asset_valuation_refresh_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_date TEXT,
  trigger_cron TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt BETWEEN 1 AND 3),
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'skipped', 'review_required')),
  source_label TEXT,
  ticker_count INTEGER NOT NULL DEFAULT 0,
  price_rows_written INTEGER NOT NULL DEFAULT 0,
  valuation_rows_written INTEGER NOT NULL DEFAULT 0,
  missing_tickers_json TEXT,
  details_json TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_asset_valuation_refresh_runs_latest
  ON finance_asset_valuation_refresh_runs (id DESC);

CREATE INDEX IF NOT EXISTS idx_asset_valuation_refresh_runs_business_date
  ON finance_asset_valuation_refresh_runs (business_date DESC, id DESC);
