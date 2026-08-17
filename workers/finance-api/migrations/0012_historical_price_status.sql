-- A historical valuation may explicitly carry the last raw close across a validated
-- suspension/no-trade day. The carried value remains raw/unadjusted, but it must never
-- be indistinguishable from an observed close.
ALTER TABLE finance_security_prices
  ADD COLUMN price_status TEXT NOT NULL DEFAULT 'observed'
  CHECK (price_status IN ('observed', 'carried_forward'));
