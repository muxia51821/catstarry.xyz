-- Forward-only audit trail for operator resolution of spreadsheet import rows.
CREATE TABLE IF NOT EXISTS finance_workbook_review_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('resolved')),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_workbook_review_audit_review
  ON finance_workbook_review_audit (review_id, id DESC);
