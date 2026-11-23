# Piccart — Handoff notes (WIP)

**Date:** 2026-11-23
**State:** committed work = spec phases 0–9 complete and verified; phases 10–11 (UI shell,
catalog, detail, auth) are **written but not committed** in this WIP commit; phases 12–15
not started.

## 1. Progress against the SPEC.md plan

| Phase | Status | Notes |
|---|---|---|
| 0 Scaffold | ✅ committed | `chore: scaffold project`. All Appendix A config files, deps installed, chromium installed. |
| 1 DB schema | ✅ committed | 12/12 U-DB. |
| 2 Validation/format | ✅ committed | 18/18 U-VAL + U-FMT. |
| 3 Password/photos | ✅ committed | 7/7. |
| 4 Auth domain | ✅ committed | 10/10 U-AUTH. |
| 5 Bootstrap | ✅ committed | 4/4 U-BOOT + manual check: box prints once, restart prints nothing. |
| 6 Products | ✅ committed | 10/10 U-PROD. |
| 7 Auth/products API | ✅ committed | U-API-01…07 (+07b/c) green. |
| 8 Cart/orders domain | ✅ committed | 18/18 U-CART + U-ORDER (transaction verified). |
| 9 Cart/orders API | ✅ committed | U-API-08 green; full curl smoke flow verified live (register→me→login→add→order→stock 22→403). |
| 10 UI shell/catalog/detail | ⚠️ code written, e2e blocked | `layout.tsx`, `globals.css`, `SiteHeader`, `SearchBar`, `SortSelect`, `CartBadge`, `AddToCartButton`, `ProductPurchasePanel`, `QtyStepper`, `StockBadge`, `Pager`, `ProductGallery`, `page.tsx`, `products/[id]/page.tsx`. `smoke.spec.ts` + `browse.spec.ts` written. **E2E run currently red — see §4.** |
| 11 Auth UI | ⚠️ code written, e2e not yet run | `RegisterForm`, `LoginForm`, `register/page.tsx`, `login/page.tsx`, `LogoutButton`, `safe-next`. `auth.spec.ts` written. |
| 12 Cart UI | ❌ not started | `CartView`, `cart/page.tsx`, `cart.spec.ts`. |
| 13 Checkout/orders UI | ❌ not started | `CheckoutForm`, `checkout/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`, `not-found.tsx`, `checkout.spec.ts`, `orders.spec.ts`. |
| 14 Admin UI | ❌ not started | 3 admin pages, `AdminStockCell`, `ProductForm`, `access-denied`, `error.tsx`, `admin.spec.ts`. |
| 15 Docs | ❌ not started | `build-docs.mjs`, `docs-template.html`, 10 md files, `capture-docs-screenshots.mjs`, U-DOCS. `scripts/seed-demo.mjs` and `scripts/smoke.sh` already exist (written in phase 9). |

**Gate state at handoff:** `npm run typecheck` ✅, `npm test` ✅ 91/91 (spec expects 89; we
added U-API-07b/07c/08b/08c as fresh IDs — spec rule 4 allows additions, never renumbers).

## 2. User overrides of the spec (binding — do not "fix" back)

1. **Everything Polish: UI language, locale, prices, dates.**
   - `src/lib/strings.ts` holds every user-facing string (Polish) — this is the canonical
     source that replaced Appendix C. e2e specs import `S` from there.
   - `formatMoney`: `Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })`
     → `18,50 zł` (NBSP U+00A0 thousands separator, comma decimal).
   - `formatDateTime`: `Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })` + ` UTC` → `23 lis 2026, 10:02 UTC`.
   - Seed/demo data prices are the same cents values; only the display currency changed.
   - The admin bootstrap credentials box is **English, verbatim per §6.6** (it is server
     console output, not UI). If the team wants it Polish too, it's one function.
2. **Country list: `Polska` first, `United States` removed** (`COUNTRIES` in
   `src/lib/constants.ts`). Consequence: all shipping fixtures (tests, smoke.sh, e2e
   helpers) use `country: 'Polska'`, `city: 'Warszawa'`, `postalCode: '00-001'`.
   `scripts/smoke.sh` step 6 was updated accordingly.

## 3. Deviations from the spec (decisions + reasons)

- **`typescript ^7.0.2` kept, but `@types/jest ^30` added and `"types": ["jest", "node"]`
  added to tsconfig.** TS 7 dropped automatic `@types/*` inclusion, so jest globals were
  untyped and `npm run typecheck` (the spec's gate) failed on every test file. Verified
  in isolation: TS7 + explicit `types` array works. (The spec's TS 5.9 fallback would also
  work; this keeps the pinned major.)
- **`src/lib/api-error.ts`** — small shared envelope helper used by all route handlers
  (the spec's "reference handler" shape is kept; handlers stay thin). `register` handler is
  verbatim per §7.1.
- **`src/lib/strings.ts`** — strings centralized (validation.ts no longer exports `S`).
  `passwordMeetsPolicy` exported from `validation.ts` and reused by bootstrap.
- **`Pager`** — bound pages render `<button type="button" disabled>` (not a link) because
  Playwright's `toBeDisabled()` does **not** match `aria-disabled` on `<a>` (verified with a
  throwaway spec: `<a aria-disabled>` fails `toBeDisabled()`). E2E-BROWSE-03 asserts
  `toBeDisabled()` on `pager-next` — satisfied by the real `disabled` button.
- **`CartBadge`** is only rendered for signed-in users (SiteHeader decides); guests get a
  static `Cart` link with no count, per the §8.1 header matrix.
- **`ProductPurchasePanel`** always renders (qty stepper + `add-to-cart` button); the
  button is `disabled` when stock is 0 — required by E2E-BROWSE-05 (`toBeDisabled()`),
  which the spec's "hidden entirely when stock === 0" wording would break. The stepper
  stays visible (spec says hidden; test says button must exist — test wins, it's the gate).
- **`LogoutButton`** — separate client component (not in the spec's component list) so the
  logout click works; `SiteHeader` stays server.
- **`ProductGallery`** — separate client component for the thumbnail swap (spec lists it
  under screen 2 behavior, not as a named component).
- **playwright.config.ts**: added `timeout: 120_000` to `webServer` (Turbopack cold start
  on this machine is slow; default 60s was flaky). `shell: true` was tried and is **not
  valid** in `@playwright/test ^1.65.1` config types — removed.
- **test-results/** and **playwright-report/** added to `.gitignore` (not in the spec's
  A.8 list, but they are Playwright run artifacts and must not be committed).

## 4. THE BLOCKER: e2e runs against an empty catalog (root-caused, fix not yet applied)

**Symptom:** `npx playwright test` — every test sees an empty catalog / 404s; e2e.db ends
the run with products + shopper but **no admin row**.

**Root cause (verified):** Playwright starts `webServer` **before** `globalSetup`
(https://github.com/microsoft/playwright/issues/31524 — no supported option to reorder).
Sequence:

1. `webServer` boots `next dev` with `DATABASE_PATH=.data/e2e.db` on a non-existent file.
2. `instrumentation.ts` → `ensureAdmin()` opens e2e.db (inode A), creates admin.
3. `globalSetup` runs `rmSync(.data/e2e.db*)` + seed → creates a **new** file (inode B)
   with 9 products + shopper.
4. The running server still holds its better-sqlite3 handle to the deleted inode A:
   it serves **zero products** and its admin row is orphaned → every test fails, and
   `adminCookie()` 401s.

**Recommended fix (one of):**
- **(preferred) wrap the webServer command:** `command: 'node scripts/e2e-dev.mjs'` where
  that script deletes `.data/e2e.db*`, runs `seed-demo.mjs`, then spawns `npm run dev`
  with the same env. `globalSetup` becomes a no-op (or is removed). This keeps the spec's
  "fresh DB per run" property and the "admin created from ADMIN_PASSWORD" property.
- Or: keep globalSetup seeding but **without the rm**, and add a `globalTeardown` that
  deletes the DB *after* the run. Re-runs then start from the previous run's leftovers —
  the idempotent seed re-adds deleted products, but **stock mutations from the previous
  run persist** and would break E2E-CHECKOUT-01 (expects mug 24→22) and E2E-ADMIN-03.
  Not recommended unless tests are made stock-independent.

Also fix before trusting e2e results: the failed-run artifacts in `test-results/` were
from this bug; after the fix, re-run `npx playwright test` for all specs (currently only
smoke/browse/auth exist).

## 5. Environment notes

- Node v26.13.1, npm 12.2.2 (npm's "install-scripts blocked" warning for
  `@parcel/watcher` is benign — it falls back to polling; better-sqlite3 uses prebuilt
  binaries and works).
- `npm run dev` prints a Next 16 note that it reconfigures `tsconfig.json`
  (`jsx: react-jsx`, dev types include). Harmless; it happens once.
- Ports used during development: 3401/3402/3403/3105 (manual checks), 3100 (e2e).
  `pkill -f "next dev"` / `next-server` / `next-router` to clean up strays.
- picsum.photos was reachable in this environment.

## 6. Suggested next steps (in order)

1. Apply the §4 webServer-wrapper fix; `rm -rf .data test-results`; run
   `npx playwright test` → smoke + browse should go green.
2. Run `tests/e2e/auth.spec.ts` (written, never executed).
3. Phases 12–14 per SPEC.md §11 (tests first).
4. Phase 15 docs; `npm run verify` end-to-end; walk §12 checklist against real output.
5. `git` history is one-phase-per-commit through `04ebe87`; this WIP commit is the first
   multi-phase commit — split it if you want to keep the history clean, or keep it.
