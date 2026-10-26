-- 0005_client_finances.sql
-- A client's financial position, used to model a property against THAT client's
-- real serviceability (income, partner income, living expenses, dependants and
-- existing commitments) rather than a generic typed-in income.
-- Stored as a single jsonb column so the shape can evolve without a migration
-- per field. Keys are the app's camelCase (the repository case-mapper is
-- shallow and does not touch jsonb contents), e.g.
--   { "grossIncome": 185000, "partnerIncome": 0, "livingExpMonthly": 4200,
--     "dependants": 0, "monthlyCommitments": 0, "cardLimits": 0, "hecsBalance": 0 }

alter table clients
  add column if not exists finances jsonb not null default '{}'::jsonb;
