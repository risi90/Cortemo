-- Betaaltermijn per B2B-partner: 0 = vooruitbetaling (standaard),
-- >0 = bestellen op rekening met dit aantal dagen betaaltermijn.
alter table cortemo_partners add column if not exists payment_terms int not null default 0;
