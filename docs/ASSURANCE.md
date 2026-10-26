# Terravado — accuracy & assurance framework

Terravado's modelling influences real financial decisions, so **accuracy is the
part of the chain Terravado fully owns** — it cannot be disclaimed to the data
provider or the adviser. This framework is how that responsibility is met in
code. It guarantees the **process** (that the modelling is sound, current and
transparent); it does not, and cannot, guarantee the **outcome**, which depends
on factors no one controls.

Two things: **checks upon checks** (Layers 1–4, automated and continuous) and
**regular audits** (Layer 5, scheduled and human).

## Layer 1 — Prove every calculation against the real-world source

Internal consistency is not correctness. Each reference check in
`src/lib/assurance/checks.ts` carries expected values computed by hand from the
published schedule, and names the **authoritative source** it answers to
(Revenue NSW, SRO Victoria, Queensland Revenue Office, ATO). The automated run
catches code regressions; the `source` annotation tells the human auditor what
to re-confirm each period.

Currently covered: NSW/VIC/QLD transfer duty, NSW land tax (incl. the nil
threshold), AU income tax + Medicare, CGT discounts (individual / SMSF /
company), GST. **To extend:** a case per state for each tax, and golden cases
signed off by Ash or an accountant.

## Layer 2 — Lock reference data to versions and effective dates

Rates and thresholds live in one effective-dated block — `TAX_DATA` in
`src/lib/engine/tax-data.ts` (`version`, `effectiveFrom`) with `ENGINE_VERSION`.
A rate change is a **new block**, never an edit, so historic reports reproduce
exactly. Process: draft the new block, check it against the source, have a
domain expert sign it off, then date it.

## Layer 3 — Make every number traceable

`src/lib/assurance/provenance.ts` stamps any result or report snapshot with the
engine version, tax-data version, and the moment it was computed —
`provenance()`, `stamp(result)`, `provenanceLabel()`. Put the label on every
client-facing output so an adviser (or an auditor) can reproduce exactly what
was shown.

## Layer 4 — Re-check automatically and continuously

- `.github/workflows/assurance.yml` runs typecheck → `verify:engine` → lint →
  build on **every push and PR**. Nothing ships that breaks a calculation.
- `src/lib/assurance/validate.ts` holds input guardrails — `validateFinance`,
  `validateFeasibility`, `validateServiceability` — that flag implausible inputs
  (LVR > 100%, loan > price, absurd rates) before the engine computes on them.

## Layer 5 — Audit on a schedule, with fresh eyes

Not automated — this is the human cadence:

- **Quarterly, and on every budget/policy change:** re-run the golden cases
  against the *current* authoritative sources (rates and policies move).
- **Domain-expert review:** Ash or an accountant samples real outputs for
  reasonableness.
- **Independent sign-off** on the high-stakes engines (tax, land tax, SMSF/LRBA)
  by someone who did not build them.
- **Data-source freshness checks:** confirm feeds are current and within lag.

## Running it

```bash
npm run verify:engine   # the assurance check suite (exits non-zero on failure)
npm run typecheck       # strict TypeScript, no emit
npm run assure          # typecheck + verify together
npm run build           # production build
```
