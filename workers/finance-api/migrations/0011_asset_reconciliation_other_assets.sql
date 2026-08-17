-- Reconciliation observations must represent the same total-asset identity used by
-- current account state and derived historical valuations.
-- This remains a single numeric bucket; Finance is not gaining a generic asset taxonomy.

CREATE TABLE finance_asset_snapshots_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_at TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  holdings_value REAL NOT NULL,
  cash_value REAL NOT NULL,
  other_assets_value REAL NOT NULL DEFAULT 0,
  total_value REAL NOT NULL,
  source TEXT NOT NULL,
  is_complete INTEGER NOT NULL CHECK (is_complete IN (0, 1)),
  incomplete_reason TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT,
  UNIQUE (snapshot_at, source),
  CHECK (holdings_value >= 0 AND cash_value >= 0 AND other_assets_value >= 0 AND total_value >= 0),
  CHECK (ABS(total_value - (holdings_value + cash_value + other_assets_value)) < 0.01)
);

INSERT INTO finance_asset_snapshots_v2 (
  id, snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value,
  total_value, source, is_complete, incomplete_reason, created_at, created_by,
  deleted_at, deleted_by
)
SELECT
  id, snapshot_at, snapshot_date, holdings_value, cash_value, 0,
  total_value, source, is_complete, incomplete_reason, created_at, created_by,
  deleted_at, deleted_by
FROM finance_asset_snapshots;

DROP TABLE finance_asset_snapshots;
ALTER TABLE finance_asset_snapshots_v2 RENAME TO finance_asset_snapshots;

CREATE INDEX idx_finance_asset_snapshots_complete_date
  ON finance_asset_snapshots (is_complete, snapshot_at DESC, id DESC);
