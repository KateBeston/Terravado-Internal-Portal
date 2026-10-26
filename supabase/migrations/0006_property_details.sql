-- 0006_property_details.sql
-- The full property record behind the tabbed detail view — title (zoning,
-- easements, encumbrances), locality (suburb stats, sourced or manual),
-- physical attributes and full sales history. Stored as one jsonb column so
-- the record's shape can grow (and integrations can populate sections) without
-- a migration per field. Keys are the app's camelCase; the repository
-- case-mapper is shallow and does not touch jsonb contents. Example:
--   { "title": { "zoning": "R2", "easements": [ ... ] },
--     "locality": { "suburbMedian": 980000, "source": "stub" },
--     "physical": { "beds": 3, "landSize": 550 },
--     "sales": [ { "date": "2021-03-27", "price": 900000 } ],
--     "sources": { "locality": "manual" } }

alter table properties
  add column if not exists details jsonb not null default '{}'::jsonb;
