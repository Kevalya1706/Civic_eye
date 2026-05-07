
# CivicEye v10.0 "Oracle" — Implementation Plan

End-to-end build delivered in **5 sequenced batches**. Each batch ends in a working state so we can verify before moving on. I'll execute all 5 in this turn unless you stop me.

## Secrets I will request before starting Batch 3

- `GOOGLE_MAPS_API_KEY` — Routes API (traffic-aware) for `D_traffic`. You may already have one for geocoding; I'll reuse if present.
- `PRESS_CONTACTS` — comma-separated emails to receive Urban Health Warnings (e.g. `press@sakal.test, news@lokmat.test`). Real Sakal/Lokmat/TOI desks are not public APIs — emails go to whatever list you provide.
- Resend connector — I'll trigger `standard_connectors--connect` for resend.

---

## Batch 1 — Schema (Oracle_Live)

One migration adds:

- `contractors` — `id, name, department, ward, phone, email, active`
- `tickets` adds: `ward TEXT`, `assigned_contractor_id UUID`, `assigned_at TIMESTAMPTZ`, `sla_deadline TIMESTAMPTZ`, `escalation_level SMALLINT DEFAULT 0` (0=active, 1=warning, 2=hod, 3=critical), `social_cost NUMERIC DEFAULT 0`, `traffic_density NUMERIC`, `press_released_at TIMESTAMPTZ`
- `enforcement_events` — append-only ledger: `ticket_id, event_type (assigned|warning|hod_alert|critical|press_released|resolved), payload JSONB, created_at`
- `press_releases` — `ticket_id, ward, social_cost, pdf_url, sent_to TEXT[], sent_at`
- `webauthn_credentials` — `user_id, credential_id (unique), public_key, counter, transports, device_name, created_at` + RLS so each user only manages their own
- `app_role` enum (`citizen`, `officer`, `hod`, `commissioner`) + `user_roles` table with `has_role()` security-definer function (per platform requirements)
- Trigger on `tickets` insert: auto-set `sla_deadline = now() + 24h`, log `assigned` event after dispatcher runs

## Batch 2 — Autonomous Dispatcher + SLA Clock

- Edge function `auto-dispatch` (invoked from `useTickets.createTicket` right after insert) — looks up `contractors` by `(department, ward)`, picks first active match, sets `assigned_contractor_id` + `assigned_at` + logs event. <60s requirement met inline (no cron needed for assignment).
- Contractor SLA UI: new route `/contractor/:contractorId` showing assigned tickets with live countdown. `0–12h` green "Active", `12–24h` amber "Approaching Overdue", `>24h` red "Overdue". Pure frontend countdown driven by `sla_deadline`.

## Batch 3 — Escalation Ladder + Social Cost (cron + Google Traffic)

- Edge function `escalation-tick` runs every 5 min via `pg_cron` + `pg_net`:
  - At `now() > sla_deadline` (24h): set `escalation_level=2`, log `hod_alert`, send email to HOD (Resend).
  - At `sla_deadline + 24h` (48h critical): set `escalation_level=3`, log `critical`, fetch traffic via Google Routes API (`computeRoutes` with `TRAFFIC_AWARE`) using ticket lat/lng → small radius, derive `D_traffic` 1.0–3.0.
  - Compute `social_cost = priority_score * days_overdue * D_traffic * 1000` (so ₹5L threshold is reachable). Update ticket + insert `enforcement_events`.
  - If `social_cost > 500000` and `press_released_at IS NULL` → trigger Batch 4.
- Cron registered via `supabase--insert` (per scheduling docs — uses anon key in URL, must not be in migration).

## Batch 4 — Press Release PDF + Resend Transmission

- Edge function `generate-press-release`:
  - Builds PDF with `pdf-lib` (Deno-compatible) using the exact template wording you specified.
  - Stores PDF in a new `press-releases` storage bucket (public-read).
  - Sends email via Resend connector to `PRESS_CONTACTS` with PDF attachment.
  - Inserts row in `press_releases`, stamps `tickets.press_released_at`.

## Batch 5 — Identity Sovereignty UI + WebAuthn + Officer Command Dashboard

- New `Login.tsx`: glassmorphism slate-gray, two tabs **Citizen** / **Officer**.
  - Citizen tab: email/password (kept) + **"Add Passkey"** button after first login → `navigator.credentials.create()` registers a WebAuthn credential, stored in `webauthn_credentials`. Subsequent logins offer **"Sign in with Passkey"** → assertion verified by edge function `webauthn-verify` using `@simplewebauthn/server` (npm). On success, the edge function returns a Supabase session via `auth.admin.generateLink` → exchanged client-side. (This is the standard "WebAuthn layered on top of email auth" pattern; passkey is a second factor / passwordless option, not a replacement for the underlying user record.)
  - Officer tab: requires `MINIONS` master key + assigned officer email → routes to `/command`.
- `/command` (Officer Command Dashboard): no nav menu. Glassmorphism cards showing **Live Efficiency Rating** (from `department_scores`) and **Unresolved Liability** = `SUM(social_cost)` for their department. Real-time via Supabase Realtime on `tickets`.
- Persistent bottom ticker on auth + command pages: `"System Security Status: Validated | Identity Sovereignty Active | Team Minions"`.
- `/admin` continues to use `MINIONS` key (unchanged).
- Slate-gray palette added as semantic tokens in `index.css` (`--slate-glass`, `--slate-fg`, `--glass-border`) — no raw hex in components.

---

## Honest caveats (read these)

1. **WebAuthn into Supabase session**: There is no first-class Supabase passkey login. The pattern I'll use is verify-on-edge-function → mint a one-time login link → client exchanges it. Works, but is an extra round-trip and requires the user to have signed up with email first. This matches the "Add WebAuthn on top of email login" option you picked.
2. **Press desks**: Sakal / Lokmat / Times of India have no public ingestion API. I will email whatever addresses you put in `PRESS_CONTACTS`. The PDF + audit log are real; the recipients are whatever you configure.
3. **Google Traffic**: Routes API returns `duration` vs `staticDuration`; I'll derive `D_traffic = duration / staticDuration` clamped to `[1.0, 3.0]`. This is the closest public proxy for "traffic density".
4. **Cost trigger threshold (₹5L)**: With `priority_score` ~50–80 and `D_traffic` ~1–3, a ticket reaches ₹5L around day 2–4 overdue. Adjustable via a constant in the edge function.
5. **Single turn**: This is a lot. I'll keep PRs surgical and reuse existing components (`AdminMap`, `CostTracker`, `VerificationBadge`) where I can. Some pieces (e.g. contractor mobile UI polish) will be functional but not pixel-perfect.

---

Reply **"go"** (or modify any batch) and I'll start with Batch 1 (migration) immediately, then request the secrets needed for Batch 3+4.
