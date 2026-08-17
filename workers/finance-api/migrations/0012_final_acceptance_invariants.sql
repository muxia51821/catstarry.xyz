-- Final acceptance invariant: one Trade has at most one active Investment Memo.
-- Soft-deleted memos remain history and do not block a later replacement memo.
-- If an upgraded database already contains duplicate active memos, migration must
-- fail visibly instead of letting Trade queries duplicate rows and pagination.
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_memos_one_active_per_trade
  ON finance_memos (trade_id)
  WHERE trade_id IS NOT NULL AND deleted_at IS NULL;
