# Three engineering decisions

## 1. Make recommendation uncertainty visible

A student can mark an opportunity, such as a scholarship, as a must-have. A high preference-alignment score is misleading if that opportunity has not been confirmed.

`calculateProgramFit` returns component scores, reasons, missing must-haves, and an evidence-coverage indicator. When must-have evidence is absent, it caps the score below recommendation eligibility and returns `Must-have unverified`. `selectRecommendations` excludes such results.

The rules distinguish a preferred opportunity from a required one and filter common negative phrases before matching opportunity evidence. Tests cover confirmed, missing, and negative mentions, an incomplete profile, and selection across a supplied 100-candidate synthetic catalogue.

This is a heuristic for comparing preferences with recorded evidence. It is not an admission probability. Its text matching, tuition parsing, and evidence-coverage indicator have limitations: a robust future model would use structured evidence, explicit currencies and fee periods, provenance, and calibrated terminology. The `confidence` property is not statistical confidence.

## 2. Preserve choices when browsers disagree

The sync module tracks a planning snapshot and a revision. Writes send the expected revision to the backend. The backend contract is that a stale revision cannot overwrite a newer row.

The client can detect conflicting local and remote changes, retain a local backup, and wait for an explicit resolution. Tests demonstrate moving planning between browsers, retaining conflicting legacy data, and refusing a stale overwrite.

The test client is an in-memory simulation. It verifies client behavior; it does not establish production RLS correctness or enforce server-side authorization. Real deployment requires ownership policies and a revision-aware database operation, which are outside this public excerpt.

## 3. Treat calendar dates as calendar dates

Deadline reminders accept explicit `YYYY-MM-DD` values and reject impossible or ambiguous dates. A missing date does not produce a made-up alert.

Reminders are scoped to a programme, respect completed actions and notification preferences, and sort by urgency. Overdue items can remain visible; the 14-day window limits future reminders rather than removing overdue work. Tests cover due-today, overdue, out-of-window, completed, and invalid-date cases.

## Verification boundaries

The examples use synthetic programme preferences, account identifiers, and stored values. They do not contact Supabase or the live application. Passing them supports the demonstrated logic, not an end-to-end production availability or security claim.
