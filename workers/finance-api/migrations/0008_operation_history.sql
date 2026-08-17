-- Forward-only read-history support for Finance mutations.
-- Existing Memo / Monthly / Annual Review rows are deliberately not backfilled:
-- versions that were never stored must not be reconstructed after the fact.
-- Historical-import actors are also excluded from per-record Memo creation audit so
-- a fresh database and an upgraded production database expose the same history model.

CREATE TABLE IF NOT EXISTS finance_memo_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memo_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE TABLE IF NOT EXISTS finance_monthly_record_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monthly_record_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE TABLE IF NOT EXISTS finance_review_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_year INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'confirmed')),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_memo_audit_memo ON finance_memo_audit (memo_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_memo_audit_time ON finance_memo_audit (occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_monthly_record_audit_record ON finance_monthly_record_audit (monthly_record_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_monthly_record_audit_time ON finance_monthly_record_audit (occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_review_audit_year ON finance_review_audit (review_year, id DESC);
CREATE INDEX IF NOT EXISTS idx_finance_review_audit_time ON finance_review_audit (occurred_at DESC, id DESC);

CREATE TRIGGER IF NOT EXISTS trg_finance_memo_audit_created
AFTER INSERT ON finance_memos
WHEN NEW.created_by NOT LIKE 'historical-import:%'
BEGIN
  INSERT INTO finance_memo_audit (memo_id, action, actor, occurred_at, after_json)
  VALUES (
    NEW.id, 'created', NEW.created_by, NEW.created_at,
    json_object(
      'trade_id', NEW.trade_id, 'memo_date', NEW.memo_date, 'ticker', NEW.ticker,
      'position_category', NEW.position_category, 'operation_type', NEW.operation_type,
      'reason', NEW.reason, 'reason_source', NEW.reason_source,
      'stop_loss_triggered', NEW.stop_loss_triggered, 'note', NEW.note
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_memo_audit_updated
AFTER UPDATE ON finance_memos
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL
  AND COALESCE(NEW.updated_by, NEW.created_by) NOT LIKE 'historical-import:%'
  AND (
    OLD.trade_id IS NOT NEW.trade_id OR OLD.memo_date IS NOT NEW.memo_date OR OLD.ticker IS NOT NEW.ticker
    OR OLD.position_category IS NOT NEW.position_category OR OLD.operation_type IS NOT NEW.operation_type
    OR OLD.reason IS NOT NEW.reason OR OLD.reason_source IS NOT NEW.reason_source
    OR OLD.stop_loss_triggered IS NOT NEW.stop_loss_triggered OR OLD.note IS NOT NEW.note
  )
BEGIN
  INSERT INTO finance_memo_audit (memo_id, action, actor, occurred_at, before_json, after_json)
  VALUES (
    NEW.id, 'updated', COALESCE(NEW.updated_by, NEW.created_by), COALESCE(NEW.updated_at, NEW.created_at),
    json_object(
      'trade_id', OLD.trade_id, 'memo_date', OLD.memo_date, 'ticker', OLD.ticker,
      'position_category', OLD.position_category, 'operation_type', OLD.operation_type,
      'reason', OLD.reason, 'reason_source', OLD.reason_source,
      'stop_loss_triggered', OLD.stop_loss_triggered, 'note', OLD.note
    ),
    json_object(
      'trade_id', NEW.trade_id, 'memo_date', NEW.memo_date, 'ticker', NEW.ticker,
      'position_category', NEW.position_category, 'operation_type', NEW.operation_type,
      'reason', NEW.reason, 'reason_source', NEW.reason_source,
      'stop_loss_triggered', NEW.stop_loss_triggered, 'note', NEW.note
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_memo_audit_deleted
AFTER UPDATE ON finance_memos
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND COALESCE(NEW.deleted_by, NEW.updated_by, NEW.created_by) NOT LIKE 'historical-import:%'
BEGIN
  INSERT INTO finance_memo_audit (memo_id, action, actor, occurred_at, before_json)
  VALUES (
    NEW.id, 'deleted', COALESCE(NEW.deleted_by, NEW.updated_by, NEW.created_by), NEW.deleted_at,
    json_object(
      'trade_id', OLD.trade_id, 'memo_date', OLD.memo_date, 'ticker', OLD.ticker,
      'position_category', OLD.position_category, 'operation_type', OLD.operation_type,
      'reason', OLD.reason, 'reason_source', OLD.reason_source,
      'stop_loss_triggered', OLD.stop_loss_triggered, 'note', OLD.note
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_monthly_record_audit_created
AFTER INSERT ON monthly_records
BEGIN
  INSERT INTO finance_monthly_record_audit (monthly_record_id, action, actor, occurred_at, after_json)
  VALUES (
    NEW.id, 'created', NEW.created_by, NEW.created_at,
    json_object(
      'year_month', NEW.year_month, 'muxia_invest', NEW.muxia_invest, 'cati_invest', NEW.cati_invest,
      'end_total', NEW.end_total, 'sse300_pe', NEW.sse300_pe, 'sse500_pe', NEW.sse500_pe,
      'sse1000_pe', NEW.sse1000_pe, 'blue_chip_temp', NEW.blue_chip_temp,
      'summary', NEW.summary, 'remark', NEW.remark
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_monthly_record_audit_updated
AFTER UPDATE ON monthly_records
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL
  AND (
    OLD.year_month IS NOT NEW.year_month OR OLD.muxia_invest IS NOT NEW.muxia_invest
    OR OLD.cati_invest IS NOT NEW.cati_invest OR OLD.end_total IS NOT NEW.end_total
    OR OLD.sse300_pe IS NOT NEW.sse300_pe OR OLD.sse500_pe IS NOT NEW.sse500_pe
    OR OLD.sse1000_pe IS NOT NEW.sse1000_pe OR OLD.blue_chip_temp IS NOT NEW.blue_chip_temp
    OR OLD.summary IS NOT NEW.summary OR OLD.remark IS NOT NEW.remark
  )
BEGIN
  INSERT INTO finance_monthly_record_audit (monthly_record_id, action, actor, occurred_at, before_json, after_json)
  VALUES (
    NEW.id, 'updated', COALESCE(NEW.updated_by, NEW.created_by), COALESCE(NEW.updated_at, NEW.created_at),
    json_object(
      'year_month', OLD.year_month, 'muxia_invest', OLD.muxia_invest, 'cati_invest', OLD.cati_invest,
      'end_total', OLD.end_total, 'sse300_pe', OLD.sse300_pe, 'sse500_pe', OLD.sse500_pe,
      'sse1000_pe', OLD.sse1000_pe, 'blue_chip_temp', OLD.blue_chip_temp,
      'summary', OLD.summary, 'remark', OLD.remark
    ),
    json_object(
      'year_month', NEW.year_month, 'muxia_invest', NEW.muxia_invest, 'cati_invest', NEW.cati_invest,
      'end_total', NEW.end_total, 'sse300_pe', NEW.sse300_pe, 'sse500_pe', NEW.sse500_pe,
      'sse1000_pe', NEW.sse1000_pe, 'blue_chip_temp', NEW.blue_chip_temp,
      'summary', NEW.summary, 'remark', NEW.remark
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_monthly_record_audit_deleted
AFTER UPDATE ON monthly_records
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
  INSERT INTO finance_monthly_record_audit (monthly_record_id, action, actor, occurred_at, before_json)
  VALUES (
    NEW.id, 'deleted', COALESCE(NEW.deleted_by, NEW.updated_by, NEW.created_by), NEW.deleted_at,
    json_object(
      'year_month', OLD.year_month, 'muxia_invest', OLD.muxia_invest, 'cati_invest', OLD.cati_invest,
      'end_total', OLD.end_total, 'sse300_pe', OLD.sse300_pe, 'sse500_pe', OLD.sse500_pe,
      'sse1000_pe', OLD.sse1000_pe, 'blue_chip_temp', OLD.blue_chip_temp,
      'summary', OLD.summary, 'remark', OLD.remark
    )
  );
END;

-- Annual review calculations are derived data. The annual_reviews row does not
-- persist who initiated a calculation, so calculation revisions remain attributed
-- to the calculation engine. Confirmation actor is persisted on the row and is
-- therefore captured exactly by the separate confirmation trigger below.
CREATE TRIGGER IF NOT EXISTS trg_finance_review_audit_created
AFTER INSERT ON annual_reviews
BEGIN
  INSERT INTO finance_review_audit (review_year, action, actor, occurred_at, after_json)
  VALUES (
    NEW.year, 'created', 'system:annual-review', NEW.calculated_at,
    json_object(
      'year', NEW.year, 'calculation_json', NEW.calculation_json, 'summary', NEW.summary,
      'confirmed_by', NEW.confirmed_by, 'confirmed_at', NEW.confirmed_at
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_review_audit_updated
AFTER UPDATE ON annual_reviews
WHEN OLD.calculation_json IS NOT NEW.calculation_json
  OR OLD.summary IS NOT NEW.summary
  OR OLD.calculated_at IS NOT NEW.calculated_at
BEGIN
  INSERT INTO finance_review_audit (review_year, action, actor, occurred_at, before_json, after_json)
  VALUES (
    NEW.year, 'updated', 'system:annual-review', NEW.calculated_at,
    json_object(
      'year', OLD.year, 'calculation_json', OLD.calculation_json, 'summary', OLD.summary,
      'confirmed_by', OLD.confirmed_by, 'confirmed_at', OLD.confirmed_at
    ),
    json_object(
      'year', NEW.year, 'calculation_json', NEW.calculation_json, 'summary', NEW.summary,
      'confirmed_by', NEW.confirmed_by, 'confirmed_at', NEW.confirmed_at
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_finance_review_audit_confirmed
AFTER UPDATE ON annual_reviews
WHEN OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL AND NEW.confirmed_by IS NOT NULL
BEGIN
  INSERT INTO finance_review_audit (review_year, action, actor, occurred_at, before_json, after_json)
  VALUES (
    NEW.year, 'confirmed', NEW.confirmed_by, NEW.confirmed_at,
    json_object(
      'year', OLD.year, 'calculation_json', OLD.calculation_json, 'summary', OLD.summary,
      'confirmed_by', OLD.confirmed_by, 'confirmed_at', OLD.confirmed_at
    ),
    json_object(
      'year', NEW.year, 'calculation_json', NEW.calculation_json, 'summary', NEW.summary,
      'confirmed_by', NEW.confirmed_by, 'confirmed_at', NEW.confirmed_at
    )
  );
END;
