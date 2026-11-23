# Piccart — Full-Stack E-Commerce Blueprint & TDD Implementation Plan

| | |
|---|---|
| **Project** | Piccart — a small demo e-commerce site |
| **Document version** | 1.0 |
| **Date** | 2026-11-23 |
| **Audience** | An autonomous AI agent (any model size) that will implement everything from zero in an empty directory |
| **Deliverable of this document** | Tests (Jest + Playwright), the app (Next.js + SQLite), and user-facing documentation (Markdown → HTML with screenshots) |
| **Method** | Test-Driven Development, phase by phase (Section 11) |

---

## Table of contents

- [0. How to use this document (agent rules)](#0-how-to-use-this-document-agent-rules)
- [1. Product definition](#1-product-definition)
- [2. Stack and pinned versions](#2-stack-and-pinned-versions)
- [3. Repository layout](#3-repository-layout)
- [4. Architecture](#4-architecture)
- [5. Data model (full DDL)](#5-data-model-full-ddl)
- [6. Auth, security and validation](#6-auth-security-and-validation)
- [7. API contract](#7-api-contract)
- [8. UI/UX specification](#8-uiux-specification)
- [9. Documentation deliverable](#9-documentation-deliverable)
- [10. Test plan](#10-test-plan)
- [11. TDD implementation plan (phases 0–15)](#11-tdd-implementation-plan-phases-015)
- [12. Acceptance checklist](#12-acceptance-checklist)
- [Appendix A — Complete config files](#appendix-a--complete-config-files)
- [Appendix B — Pitfalls and troubleshooting](#appendix-b--pitfalls-and-troubleshooting)
- [Appendix C — Canonical UI strings](#appendix-c--canonical-ui-strings)
- [Appendix D — API smoke-test script](#appendix-d--api-smoke-test-script)

---

## 0. How to use this document (agent rules)

You are an autonomous agent implementing this project from scratch in an empty directory. Everything you need is in this document. Follow these rules without exception — they exist to keep a small model on track:

1. **Read sections in order.** Before starting phase N of Section 11, re-read Sections 4, 5, 6, 7 and (for phases ≥ 10) Section 8. When implementing the documentation phase, re-read Section 9.
2. **Test-Driven Development is mandatory.** In every phase marked "tests first": write the failing tests listed for that phase, run them, confirm they fail (red), then write just enough production code to make them pass (green). Never write production code that no test demands, and never weaken an assertion to make a test pass.
3. **One phase = one commit.** Commit message for each phase is given in Section 11. Never start the next phase while any test is red.
4. **Test IDs are immutable.** `U-*` and `E2E-*` identifiers in Section 10 must appear exactly as written, forever. Add new tests only with fresh IDs; never renumber.
5. **User-visible strings are verbatim.** Every button label, heading, error message and confirmation text comes from Appendix C by string ID (e.g. `S-ERR-EMAIL-TAKEN`). Do not paraphrase. The e2e tests and the documentation depend on the exact wording.
6. **Test IDs in the DOM are verbatim.** `data-testid` values come from Section 8.3. e2e selectors use only these testids plus `data-product-id` / `data-order-id` attributes.
7. **No dependencies beyond Section 2.** If you believe you need another package, you are solving the wrong problem. No ORM, no zod, no Tailwind, no state library, no axios.
8. **No features beyond this spec.** If a tempting extra feature appears (password reset, reviews, discounts), skip it. The out-of-scope list in Section 1.3 is binding.
9. **Money is integer cents.** Never use floats for money. `priceCents: number` everywhere; display via `formatMoney` only.
10. **All arithmetic and data reasoning happens in code.** Totals, stock math, pagination math are computed by the specified lib functions, not improvised.
11. **Run `npm run verify` (Section 10.6) before declaring the project done.** Everything in Section 12 must be checked off against real output, not memory.
12. **If stuck:** the same approach failing three times means change the approach. Check Appendix B (pitfalls) first — every known trap for this exact stack is listed there with its fix.

**Conventions used throughout this document:** code blocks labelled `verbatim` must be copied character-for-character. "Route" means a Next.js App Router route. "Handler" means a file exporting `GET`/`POST`/`PATCH`/`DELETE` under `src/app/api/`. "Lib" means a module under `src/lib/` containing logic, importable from both route handlers and server components.

---

## 1. Product definition

### 1.1 Pitch

Piccart is a tiny self-contained web shop used to demonstrate a complete full-stack product built test-first. A visitor can browse a catalog of products (each with three placeholder photos), register an account, log in, put products into a cart, fill in a mock checkout form (no payment), place an order that is stored in SQLite, and see a list of past orders. Stock counts decrease when orders are placed. An admin account is generated automatically at server startup (its password is printed to the console); the admin creates products, sets and updates stock counts, edits products and deletes them.

### 1.2 Personas

- **Shopper** — a registered user. Browses, searches, adds to cart, checks out, views order history.
- **Admin** — the single admin user created at first startup. Manages the catalog: create, edit, delete products; manage stock.

### 1.3 Scope

**In scope (build all of this):**

| # | Requirement | Where specified |
|---|---|---|
| R1 | Register freely with e-mail, username, password; password policy enforced; e-mail uniqueness (case-insensitive) | §6, §8 screens 3–4 |
| R2 | Login / logout with database-backed sessions (httpOnly cookie) | §6 |
| R3 | Admin account created on startup; password generated and `console.log`-ed in a box | §6.6 |
| R4 | Admin creates products and sets stock | §8 screens 11–12 |
| R5 | Every product has exactly 3 photo URLs of the shape `https://picsum.photos/400/400?seed=<seed>` (400×400, square) | §6.4 |
| R6 | Shoppers add products to a database-backed cart | §8 screens 1–2, 5 |
| R7 | Checkout is a mockup form; order data is saved to the DB; "Order placed!" confirmation | §8 screens 6–7 |
| R8 | Stock count decreases on order placement (transactional) | §5, §7.16, §11 |
| R9 | Past orders list + order detail | §8 screens 8–9 |
| R10 | Admin edits stock/price/name/description and deletes products | §8 screens 10–12 |
| R11 | Documentation: Markdown describing UI/UX (screens and actions, not internals), built to HTML with `marked`, with Playwright screenshots | §9 |
| R12 | Jest unit suite + Playwright e2e suite, developed test-first | §10, §11 |

**Out of scope (do NOT build):** payments or any payment UI beyond the shipping mockup; e-mails of any kind; monitoring, logging frameworks, analytics; compliance features (cookie banners, GDPR, TOS); file or image uploads; guest carts; cart merging; order fulfillment states beyond `PLACED`; password reset or account management; reviews, ratings, wishlists, discounts, coupons; multi-currency or i18n; dark mode; rate limiting; 2FA; WebSockets; server actions (uses JSON API instead, see §4.6); admin order management (admin manages products only); React component tests (UI is covered by Playwright e2e only).

### 1.4 Key flows

1. **First startup** → server applies schema → sees no admin → generates a 16-char random password → creates admin → prints credentials box to console → serves traffic.
2. **Shopper journey** → browse `/` → search/sort → product detail → add to cart (must be logged in; guests are redirected to `/login?next=…`) → cart page → checkout form → POST creates order transactionally (stock decremented, cart cleared) → confirmation banner on order page → order appears in My orders.
3. **Admin journey** → log in with printed credentials → `/admin/products` table → create product (photos auto-assigned) → edit stock/price inline or via form → delete product → catalog reflects changes immediately.

---

## 2. Stack and pinned versions

Verified against the npm registry on **2026-11-23**. Pin these exact ranges in `package.json` (Appendix A.1).

### 2.1 Runtime stack

| Component | Pin | Notes |
|---|---|---|
| Node.js | **26 LTS "Lithium"** (≥ 22.12 minimum) | better-sqlite3 13 requires Node ≥ 22 |
| Next.js | `^16.4.6` | App Router, Turbopack default for dev and build, `src/` directory |
| React / React DOM | `^19.3.1` | Required peer of Next 16 |
| SQLite driver | `better-sqlite3 ^13.2.0` | **Raw SQL only** — synchronous API, real transactions, no ORM |
| Password hashing | `bcryptjs ^3.0.3` | Pure JS (no native build risk); cost factor 10 |
| Docs rendering | `marked ^18.2.1` | Markdown → HTML for the documentation site |

### 2.2 Test and tooling stack

| Component | Pin | Notes |
|---|---|---|
| Test runner (unit) | `jest ^30.5.2` wired via `next/jest` | `testEnvironment: 'node'` — no jsdom, no React Testing Library |
| E2E | `@playwright/test ^1.65.1` | Chromium only; serialized workers (shared SQLite file) |
| TypeScript | `typescript ^7.0.2` with `strict: true` | If the local toolchain misbehaves with TS 7, fall back to `typescript@^5.9.2`; no TS-7-only syntax is used in this spec |
| Lint | `eslint ^10.15.0` + `eslint-config-next ^16.4.6` | Flat config; lint is advisory, `typecheck` is the gate |
| Types | `@types/node ^26`, `@types/react ^19.3.0`, `@types/react-dom ^19.3.0`, `@types/better-sqlite3 ^9.6.0` | |

### 2.3 Why these choices (one-line rationale each)

- **better-sqlite3**: synchronous API makes check-then-write sequences atomic in a single-process Node server and makes real `db.transaction()` trivial — this is the backbone of the stock-decrement guarantee.
- **bcryptjs**: pure JavaScript, zero native compilation, adequate for a demo; avoids the #1 install failure of native bcrypt.
- **DB sessions**: sessions live in a `sessions` table; a 6-line helper answers "who is calling?" for every route — no middleware layer to configure.
- **Raw SQL**: the schema is 6 tables; an ORM would add config and abstraction a small implementer can get wrong. All SQL is in prepared statements in one layer (§4.4).
- **Plain CSS**: one `globals.css` with tokens and class names from §8.2 — no PostCSS/Tailwind pipeline to break.
- **marked**: a one-file build script turns Markdown into a static HTML docs page; no docs framework.
- **JSON API + client components** (not server actions): every mutation goes through a route handler that is unit-testable with plain `Request`/`Response` objects in Jest.

### 2.4 Scaffold

```bash
# Option A (preferred): scaffold, then replace boilerplate per Appendix A
npx create-next-app@16.4.6 piccart --typescript --eslint --app --src-dir --no-tailwind --use-npm

# Option B: create the folder tree of Section 3 by hand and copy every file
# from Appendix A verbatim.
```

Then: `npm i better-sqlite3 bcryptjs marked` and `npm i -D jest @playwright/test @types/better-sqlite3` (all other deps arrive with create-next-app). Finally `npx playwright install chromium` (add `--with-deps` on bare Linux). Set `npm pkg set engines.node=">=22.12"`.

---

## 3. Repository layout

Create exactly this tree. Every file's content is specified somewhere in this document; config files are verbatim in Appendix A.

```text
piccart/
├── package.json                 # Appendix A.1
├── tsconfig.json                # Appendix A.2
├── next.config.ts               # Appendix A.3  (serverExternalPackages)
├── jest.config.mjs              # Appendix A.4  (next/jest, node env)
├── jest.setup.ts                # Appendix A.5
├── playwright.config.ts         # Appendix A.6  (port 3100, own DB, fixed admin pw)
├── eslint.config.mjs            # Appendix A.7
├── .gitignore                   # Appendix A.8  (includes .data/)
├── .env.example                 # Appendix A.9
├── README.md                    # 6 lines: what it is, npm run dev, npm run verify
├── scripts/
│   ├── seed-demo.mjs            # §9.3  (verbatim) deterministic demo data
│   ├── capture-docs-screenshots.mjs  # §9.4 (verbatim) Playwright screenshots
│   ├── build-docs.mjs           # §9.5  (verbatim) marked → docs/site/index.html
│   └── docs-template.html       # §9.5  (verbatim) HTML shell for build-docs
├── src/
│   ├── instrumentation.ts       # §6.6  admin bootstrap on startup
│   ├── middleware.ts            # (none — deleted if create-next-app made one)
│   ├── app/
│   │   ├── layout.tsx           # shell: header + footer, imports globals.css
│   │   ├── globals.css          # §8.2 design tokens + classes
│   │   ├── page.tsx             # Screen 1  catalog
│   │   ├── products/[id]/page.tsx   # Screen 2  product detail
│   │   ├── register/page.tsx    # Screen 3  (server guard) + RegisterForm client
│   │   ├── login/page.tsx       # Screen 4  (server guard) + LoginForm client
│   │   ├── cart/page.tsx        # Screen 5  (server guard) + CartView client
│   │   ├── checkout/page.tsx    # Screen 6  (server guard) + CheckoutForm client
│   │   ├── orders/page.tsx      # Screen 8  my orders (server)
│   │   ├── orders/[id]/page.tsx # Screens 7+9  order detail (server)
│   │   ├── not-found.tsx        # 404 page
│   │   ├── error.tsx            # error page ('use client')
│   │   ├── admin/
│   │   │   ├── access-denied.tsx    # component: 403 copy for non-admins
│   │   │   └── products/
│   │   │       ├── page.tsx         # Screen 10 admin products table
│   │   │       ├── new/page.tsx     # Screen 11 admin create product
│   │   │       └── [id]/page.tsx    # Screen 12 admin edit product
│   │   ├── components/
│   │   │   ├── SiteHeader.tsx       # server; composes the islands below
│   │   │   ├── SearchBar.tsx        # 'use client'
│   │   │   ├── SortSelect.tsx       # 'use client'; catalog sort dropdown
│   │   │   ├── CartBadge.tsx        # 'use client'; listens to cart:changed
│   │   │   ├── AddToCartButton.tsx  # 'use client'; card variant
│   │   │   ├── ProductPurchasePanel.tsx  # 'use client'; detail variant w/ stepper
│   │   │   ├── QtyStepper.tsx       # 'use client'; shared −/value/+
│   │   │   ├── StockBadge.tsx       # server/pure
│   │   │   ├── Pager.tsx            # server/pure links
│   │   │   ├── AdminStockCell.tsx   # 'use client'; inline stock edit
│   │   │   ├── ProductForm.tsx      # 'use client'; create + edit modes
│   │   │   ├── RegisterForm.tsx     # 'use client'
│   │   │   ├── LoginForm.tsx        # 'use client'
│   │   │   ├── CartView.tsx         # 'use client'
│   │   │   └── CheckoutForm.tsx     # 'use client'
│   │   └── api/
│   │       ├── auth/register/route.ts    # POST   §7.2
│   │       ├── auth/login/route.ts       # POST   §7.3
│   │       ├── auth/logout/route.ts      # POST   §7.4
│   │       ├── auth/me/route.ts          # GET    §7.5
│   │       ├── products/route.ts         # GET, POST      §7.6, §7.7
│   │       ├── products/[id]/route.ts    # GET, PATCH, DELETE  §7.8–§7.10
│   │       ├── cart/route.ts             # GET, DELETE    §7.11, §7.15
│   │       ├── cart/items/route.ts       # POST   §7.12
│   │       ├── cart/items/[productId]/route.ts  # PATCH, DELETE  §7.13–§7.14
│   │       ├── orders/route.ts           # POST, GET      §7.16, §7.17
│   │       └── orders/[id]/route.ts      # GET    §7.18
│   ├── db/
│   │   ├── schema.sql         # §5.2  plain SQL; loaded by db/index.ts AND seed script
│   │   └── index.ts          # §4.4  getDb() singleton, pragmas, migrate
│   └── lib/
│       ├── types.ts          # DTOs (§4.5)
│       ├── constants.ts      # §4.7  tunables + COUNTRIES
│       ├── validation.ts     # §6.2  all validators (pure)
│       ├── format.ts         # §6.3  formatMoney, formatDateTime, slugify, escapeLike
│       ├── photos.ts         # §6.4  seed generation + URL shape
│       ├── password.ts       # §6.5  bcryptjs wrappers
│       ├── session.ts        # §6.7  cookie helpers + getSessionUser
│       ├── auth.ts           # §6.8  registerUser, loginUser
│       ├── bootstrap.ts      # §6.6  ensureAdmin()
│       ├── products.ts       # §7.6–§7.10 logic
│       ├── cart.ts           # §7.11–§7.15 logic
│       ├── orders.ts         # §7.16–§7.18 logic (transaction lives here)
│       └── fetcher.ts        # §8.2  client-side apiFetch + ApiError
├── tests/
│   ├── unit/
│   │   ├── helpers/test-db.ts    # fresh temp SQLite per test (§10.2)
│   │   ├── validation.test.ts    # U-VAL-*
│   │   ├── format.test.ts        # U-FMT-*
│   │   ├── password.test.ts      # U-PW-*
│   │   ├── photos.test.ts        # U-PHOTO-*
│   │   ├── db.test.ts            # U-DB-*
│   │   ├── auth.test.ts          # U-AUTH-*
│   │   ├── bootstrap.test.ts     # U-BOOT-*
│   │   ├── products.test.ts      # U-PROD-*
│   │   ├── cart.test.ts          # U-CART-*
│   │   ├── orders.test.ts        # U-ORDER-*
│   │   ├── api-routes.test.ts    # U-API-*
│   │   └── docs-build.test.ts    # U-DOCS-*
│   └── e2e/
│       ├── global-setup.ts       # Appendix A.6 logic: fresh DB + seed
│       ├── helpers.ts            # login/register via API, goto helpers
│       ├── smoke.spec.ts         # E2E-SMOKE-01
│       ├── browse.spec.ts        # E2E-BROWSE-*
│       ├── auth.spec.ts          # E2E-AUTH-*
│       ├── cart.spec.ts          # E2E-CART-*
│       ├── checkout.spec.ts      # E2E-CHECKOUT-*
│       ├── orders.spec.ts        # E2E-ORDERS-*
│       └── admin.spec.ts         # E2E-ADMIN-*
├── docs/
│   ├── 01-introduction.md        # §9.2 outlines (10 files, written in phase 15)
│   ├── 02-getting-started.md
│   ├── 03-browsing-products.md
│   ├── 04-product-details.md
│   ├── 05-creating-an-account.md
│   ├── 06-managing-your-cart.md
│   ├── 07-checking-out.md
│   ├── 08-order-history.md
│   ├── 09-admin-guide.md
│   └── 10-troubleshooting.md
├── docs/screenshots/             # generated: SHOT-01…SHOT-14 PNGs
├── docs/site/                    # generated: index.html + screenshots/ (committed)
└── .data/                        # gitignored; *.db SQLite files at runtime
```

**Rule:** never invent files beyond this tree (except the `docs/*.md` contents of §9.2 and the unit/e2e test bodies of §10).
---

## 4. Architecture

### 4.1 Runtime map

```text
Browser
  │  HTML (React Server Components)        │  JSON fetch()
  ▼                                        ▼
Server Components ──────────────┐   Route Handlers (src/app/api/**/route.ts)
  read via lib/*.ts directly    │         │ thin: auth guard → validate → call lib → JSON
                                ▼         ▼
                     src/lib/*.ts  (validation, business rules, transactions)
                                │
                                ▼
                     src/db/index.ts → better-sqlite3 → .data/app.db (WAL mode)
```

- **Server components never fetch their own API.** They import lib functions and call them directly (no self-`fetch`, no internal HTTP hop).
- **Client components mutate exclusively through the JSON API** (Section 7) using the shared `apiFetch` helper (§8.2).
- Because every page's `SiteHeader` reads the session cookie, **all pages are dynamically rendered**; no page is prerendered at build time, so the build never touches SQLite.

### 4.2 Server/client component split

| Kind | Files |
|---|---|
| Server (default) | all `page.tsx`, `layout.tsx`, `not-found.tsx`, `SiteHeader`, `StockBadge`, `Pager` |
| `'use client'` | `SearchBar`, `CartBadge`, `AddToCartButton`, `ProductPurchasePanel`, `QtyStepper`, `AdminStockCell`, `ProductForm`, `RegisterForm`, `LoginForm`, `CartView`, `CheckoutForm`, `error.tsx` |

Client components are small islands; page-level data is fetched on the server. The only client-side data fetches are: cart contents (`CartView`, `CartBadge`, `CheckoutForm` summary) and the current session-less forms. After any successful mutation that affects server-rendered data, client components call `router.refresh()`.

### 4.3 Next.js configuration essentials

`next.config.ts` (Appendix A.3) contains exactly one meaningful setting:

```ts
serverExternalPackages: ['better-sqlite3']
```

This keeps better-sqlite3 out of the bundlers so its native binding loads from `node_modules`. There is no middleware file. There are no other experimental flags.

### 4.4 Database access layer (verbatim)

`src/db/index.ts` is the **only** file that opens a connection. Tests use `DATABASE_PATH` to point at temp files and `closeDb()` between cases.

```ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let db: Database.Database | null = null;

function loadSchemaSql(): string {
  // The schema is a plain .sql file so that scripts/seed-demo.mjs can reuse it
  // without a TypeScript runtime. Servers and tests always run from the project
  // root, so process.cwd() is safe here (see Appendix B.14).
  return fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql'), 'utf8');
}

export function getDb(): Database.Database {
  if (db) return db;
  const file = process.env.DATABASE_PATH ?? '.data/app.db';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  return db;
}

export function migrate(d: Database.Database): void {
  d.exec(loadSchemaSql());
}

/** Test-only: close the singleton so the next getDb() opens a fresh file. */
export function closeDb(): void {
  db?.close();
  db = null;
}
```

Rules for all code that touches SQLite:

1. Always via `getDb()`; never `new Database(...)` anywhere else (the seed script in §9.3 is the one sanctioned exception — it runs outside Next).
2. All statements are prepared (`db.prepare(...)`) — no string interpolation of values, ever. Build `IN`-free queries; there are no dynamic column/table names anywhere.
3. Multi-step writes are wrapped in `db.transaction(...)`. better-sqlite3 is synchronous, so no `await` happens inside a transaction; a thrown error rolls everything back.
4. Timestamps are ISO-8601 UTC strings produced by SQLite defaults (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`) — JS code never generates timestamps for storage.
5. Boolean-like values do not exist; SQLite stores numbers/strings only.

### 4.5 DTOs (verbatim — `src/lib/types.ts`)

```ts
export type Role = 'user' | 'admin';

export type User = {
  id: number;
  email: string;
  username: string;
  role: Role;
  createdAt: string;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  photos: string[]; // exactly 3 URLs of shape https://picsum.photos/400/400?seed=<seed>
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
};

export type CartLine = {
  productId: number;
  name: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  stock: number;   // current stock, may have changed since the line was added
  photo: string;   // photos[0]
};

export type CartView = {
  items: CartLine[];
  totalQty: number;
  subtotalCents: number;
};

export type ShippingFields = {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
};

export type OrderItem = {
  productId: number;
  name: string;          // snapshot of the product name at purchase time
  qty: number;
  unitPriceCents: number; // snapshot of the price at purchase time
  lineTotalCents: number;
};

export type Order = {
  id: number;
  userId: number;
  status: 'PLACED';
  placedAt: string;
  shipping: ShippingFields;
  items: OrderItem[];
  totalCents: number;
};

export type StockConflict = {
  productId: number;
  name: string;
  requested: number;
  available: number;
};

export type FieldError = { field: string; message: string };
export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };
```

The row↔DTO mapping rule: DB rows use `snake_case` columns; lib functions return the camelCase DTOs above. `products.photos` is stored as a JSON text column and parsed/mapped in `rowToProduct` — nothing else in the app ever reads the raw row.

### 4.6 Mutation flow (why JSON API, not server actions)

Every state change is: **client component → `apiFetch` → route handler → lib function → transaction → JSON response → `router.refresh()`**. This gives one testable surface: route handlers are called directly in Jest with `new Request(...)` and plain objects as the second argument (`{ params: Promise.resolve({ id: '3' }) }`), with no React runtime involved.

### 4.7 Constants (verbatim — `src/lib/constants.ts`)

```ts
export const PAGE_SIZE = 12;
export const MAX_QTY_PER_LINE = 10;
export const LOW_STOCK_THRESHOLD = 5;
export const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE = 'piccart_sid';
export const MAX_PRICE_CENTS = 10_000_000; // $100,000.00
export const MAX_STOCK = 1_000_000;
export const BCRYPT_COST = 10;

export const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Spain',
  'Italy', 'Netherlands', 'Sweden', 'Japan', 'Australia', 'Brazil',
] as const;

export const SORT_OPTIONS = [
  'newest', 'name-asc', 'name-desc', 'price-asc', 'price-desc',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
```

### 4.8 Error handling conventions

- **API error envelope (the only error shape):**

```json
{ "error": { "code": "STOCK_CONFLICT", "message": "Some items are no longer available in the requested quantity.", "fields": [{ "field": "qty", "message": "Only 3 left in stock." }] } }
```

`code` is one of the codes in §7.19; `fields` is present only for validation failures; `message` always comes from Appendix C (string IDs).

- Route handlers never throw on expected failures — they return the envelope with the mapped status. Unexpected exceptions bubble up and produce Next's 500; `src/app/error.tsx` renders S-ERR-GENERIC.
- `apiFetch` (§8.2) turns non-2xx envelopes into a thrown `ApiError` the client components render inline.
- Server components use lib functions that return `null`/typed results instead of throwing for "not found / not allowed", and render `notFound()` or the access-denied copy accordingly.

---

## 5. Data model (full DDL)

### 5.1 Entity diagram

```text
users 1───∞ sessions                       (session token is a random 64-hex string)
users 1───∞ cart_items ∞───1 products      (both FKs ON DELETE CASCADE)
users 1───∞ orders 1───∞ order_items       (order_items.product_id has NO FK — snapshot rows survive product deletion)
```

### 5.2 Schema (verbatim — the contents of `src/db/schema.sql`)

The schema is a single idempotent (`IF NOT EXISTS` everywhere) SQL file applied on every server start and by the seed script.

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Exactly one admin may ever exist (enforced by the database, not just code).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_admin
  ON users(role) WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents BETWEEN 1 AND 10000000),
  stock       INTEGER NOT NULL CHECK (stock BETWEEN 0 AND 1000000),
  photos      TEXT NOT NULL CHECK (json_valid(photos) AND json_array_length(photos) = 3),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty        INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 10),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'PLACED' CHECK (status IN ('PLACED')),
  full_name     TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL,
  postal_code   TEXT NOT NULL,
  country       TEXT NOT NULL,
  total_cents   INTEGER NOT NULL CHECK (total_cents >= 0),
  placed_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL, -- intentionally NO FK: snapshots survive deletion
  product_name     TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  qty              INTEGER NOT NULL CHECK (qty > 0),
  line_total_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_user     ON orders(user_id);
```

### 5.3 Column semantics and binding rules

| Rule | Detail |
|---|---|
| E-mail uniqueness | `UNIQUE COLLATE NOCASE` — `Foo@x.com` and `foo@X.COM` collide. Lib code also lowercases before insert. |
| Username uniqueness | Same NOCASE treatment. Usernames are identity-adjacent display names; login itself is by e-mail only. |
| Single admin | The partial unique index makes a second `role='admin'` insert physically impossible; bootstrap can rely on "insert and catch" as a race-proof guarantee. |
| Photos | JSON array of exactly 3 strings, enforced by CHECK. Never stored anywhere else. |
| Money | `*_cents INTEGER` columns only. The CHECK floors are the single source of truth for ranges (price 1…10,000,000; stock 0…1,000,000; line qty 1…10). |
| `order_items` snapshots | `product_name` and `unit_price_cents` are frozen at purchase time; later admin edits and even deletion of the product never alter history. `product_id` is kept for display linkage; if the product is gone, screens show the snapshot name. |
| Deleting a product | Allowed any time. `cart_items` referencing it disappear (CASCADE). Orders keep their snapshots. |
| Deleting a user | Not exposed in the UI/API (out of scope); CASCADE rules exist so tests can clean up safely. |

### 5.4 Example rows (anchor for implementers)

```json
// users
{ "id": 1, "email": "admin@piccart.local", "username": "admin", "password_hash": "$2a$10$…", "role": "admin", "created_at": "2026-11-23T09:15:00.000Z" }

// products (photos is a JSON text column)
{ "id": 1, "name": "Aurora Ceramic Mug", "description": "Hand-glazed stoneware mug, 350 ml.", "price_cents": 1850, "stock": 24,
  "photos": ["https://picsum.photos/400/400?seed=pcc-mug-a1","https://picsum.photos/400/400?seed=pcc-mug-b7","https://picsum.photos/400/400?seed=pcc-mug-c3"],
  "created_at": "2026-11-23T09:15:01.000Z", "updated_at": "2026-11-23T09:15:01.000Z" }

// cart_items
{ "user_id": 2, "product_id": 1, "qty": 2 }

// orders + order_items
{ "id": 1, "user_id": 2, "status": "PLACED", "full_name": "Robin Tan", "address_line1": "12 Market Street",
  "address_line2": "", "city": "Springfield", "postal_code": "12345", "country": "United States",
  "total_cents": 3700, "placed_at": "2026-11-23T10:02:11.000Z" }
{ "id": 1, "order_id": 1, "product_id": 1, "product_name": "Aurora Ceramic Mug", "unit_price_cents": 1850, "qty": 2, "line_total_cents": 3700 }
```
---

## 6. Auth, security and validation

### 6.1 Security posture

| Concern | What we do | What we deliberately skip (and why) |
|---|---|---|
| Password storage | bcryptjs, cost 10 (`BCRYPT_COST`); hash never leaves the server; password field never serialized into any API response | pepper/argon2 — demo scope |
| Password policy | ≥ 8 chars, ≤ 72 **bytes** (bcrypt limit), ≥ 1 uppercase, ≥ 1 lowercase, ≥ 1 digit; enforced at registration only | password strength meters, rotation |
| Session tokens | 32 random bytes hex (64 chars), stored in `sessions`, 30-day expiry, single cookie `piccart_sid` | sliding renewal, device list |
| Cookies | `Path=/; HttpOnly; SameSite=Lax; Max-Age=…`; `Secure` omitted because the app is served over plain HTTP on localhost | token rotation |
| CSRF | No CSRF token: all mutations are JSON `fetch` calls with `SameSite=Lax` cookies; no cross-site form posts exist | formal CSRF defense — documented decision for demo scope |
| Authorization | Role checked **server-side** in every admin route handler and every `/admin/**` page; clients hide links but that is cosmetic only | middleware — guards live in handlers/pages |
| User enumeration | `loginUser` returns the identical `INVALID_CREDENTIALS` error for unknown email and wrong password | rate limiting (out of scope) |
| Input handling | All external input passes through §6.2 validators; all SQL is prepared statements | — |
| E-mail uniqueness | `UNIQUE COLLATE NOCASE` + lowercase storage; typed error on collision | e-mail verification (no e-mails in scope) |

### 6.2 Validators (`src/lib/validation.ts`)

All validators are pure functions taking `unknown` (the parsed JSON body) and returning `Validated<T>`. Non-object input yields `{ ok: false, errors: [{ field: 'body', message: S-ERR-BODY }] }`. Collect **all** field errors, not just the first.

```ts
export function validateRegistration(input: unknown): Validated<{ email: string; username: string; password: string }>;
export function validateLogin(input: unknown): Validated<{ email: string; password: string }>;
export function validateProductInput(
  input: unknown,
  mode: 'create' | 'patch',
  current?: { name: string; description: string; priceCents: number; stock: number },
): Validated<ProductInput>;
export function validateAddToCart(input: unknown): Validated<{ productId: number; qty: number }>;
export function validateSetQty(input: unknown): Validated<{ qty: number }>;
export function validateShipping(input: unknown): Validated<ShippingFields>;
export function parsePriceInput(raw: unknown): Validated<number>; // returns cents
```

**Registration / login field rules**

| Field | Rules | Error strings (Appendix C) |
|---|---|---|
| `email` | required; string; trim; ≤ 254 chars; matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; stored **lowercased** | `S-ERR-EMAIL-REQUIRED`, `S-ERR-EMAIL-FORMAT`, `S-ERR-EMAIL-LENGTH` |
| `username` | required; trim; 3–32 chars; matches `/^[A-Za-z0-9_-]+$/`; stored as typed (uniqueness is NOCASE) | `S-ERR-USERNAME-REQUIRED`, `S-ERR-USERNAME-FORMAT` |
| `password` | required; ≥ 8 chars; ≤ 72 bytes (`Buffer.byteLength`); ≥ 1 `[A-Z]`, ≥ 1 `[a-z]`, ≥ 1 `[0-9]`; any special chars allowed | `S-ERR-PASSWORD-REQUIRED`, `S-ERR-PASSWORD-LENGTH`, `S-ERR-PASSWORD-CLASSES` |

Login validates the same email rules and only "required" for password (no policy check on login). Login failures are **not** field errors — the handler returns 401 `S-ERR-INVALID-CREDENTIALS`.

**Product input rules** (`mode: 'create'` requires all fields; `mode: 'patch'` treats every field as optional and falls back to `current` for absent ones — the result is always a complete `ProductInput`):

| Field | Rules | Error strings |
|---|---|---|
| `name` | required; trim; 1–100 chars | `S-ERR-PRODUCT-NAME` |
| `description` | optional; ≤ 2000 chars (default `''`) | `S-ERR-PRODUCT-DESCRIPTION` |
| `price` | via `parsePriceInput` | `S-ERR-PRODUCT-PRICE` |
| `stock` | required; integer 0…`MAX_STOCK` | `S-ERR-PRODUCT-STOCK` |

**`parsePriceInput`** accepts a finite `number` or a string matching `/^\d+(\.\d{1,2})?$/` after trim (dot decimal only, 1–2 decimals). Returns `Math.round(value * 100)` cents. Rejects: non-numeric, negative, zero (`price_cents` CHECK starts at 1), more than 2 decimals, above `MAX_PRICE_CENTS` — always with `S-ERR-PRODUCT-PRICE`.

**Cart / order rules**

| Input | Rules | Error strings |
|---|---|---|
| `validateAddToCart` | `productId` required integer ≥ 1; `qty` optional, default 1, integer 1…`MAX_QTY_PER_LINE` | `S-ERR-PRODUCT-ID`, `S-ERR-QTY-INVALID` |
| `validateSetQty` | `qty` required integer 1…`MAX_QTY_PER_LINE` (removal is the DELETE endpoint, not qty 0) | `S-ERR-QTY-INVALID` |
| `validateShipping` | `fullName` required 2–80; `addressLine1` required 5–120; `addressLine2` optional ≤ 120 (default `''`); `city` required 2–60; `postalCode` required 3–16 (any characters); `country` required and must be one of `COUNTRIES` | `S-ERR-FULLNAME-REQUIRED`, `S-ERR-FULLNAME-LENGTH`, `S-ERR-ADDRESS1-REQUIRED`, `S-ERR-ADDRESS1-LENGTH`, `S-ERR-ADDRESS2-LENGTH`, `S-ERR-CITY-REQUIRED`, `S-ERR-CITY-LENGTH`, `S-ERR-POSTAL-REQUIRED`, `S-ERR-POSTAL-LENGTH`, `S-ERR-COUNTRY-REQUIRED` |

All `qty`/stock integers are checked with `Number.isInteger`; JSON `null`, strings and floats are rejected with the same strings.

### 6.3 Formatters (`src/lib/format.ts`)

```ts
export function formatMoney(cents: number): string;
// Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
// e.g. formatMoney(1850) === '$18.50', formatMoney(1234567) === '$12,345.67'

export function formatDateTime(iso: string): string;
// Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
//   .format(new Date(iso)) + ' UTC'
// e.g. 'Nov 23, 2026, 10:02 AM UTC' — fixed locale + UTC keeps server/client rendering identical

export function slugify(text: string): string;
// lowercase → replace runs of non-[a-z0-9] with '-' → trim '-'  (used by the docs build, §9.5)

export function escapeLike(s: string): string;
// returns s with \, %, _ each prefixed by '\'  (use with "LIKE ? ESCAPE '\'")
```

### 6.4 Product photos (`src/lib/photos.ts`)

Every product has exactly three photo URLs of the exact shape `https://picsum.photos/400/400?seed=<seed>` (square 400×400). Seeds are generated server-side at product creation; there is **no photo input, upload or URL field anywhere in the UI**.

```ts
export const PHOTO_URL_PATTERN = /^https:\/\/picsum\.photos\/400\/400\?seed=[A-Za-z0-9-]{4,40}$/;

export function photoUrl(seed: string): string;
// returns `https://picsum.photos/400/400?seed=${seed}`; throws RangeError if seed fails
// the pattern (defensive — seeds are only ever produced by generatePhotoSeed)

export function generatePhotoSeed(): string;
// 12 chars drawn from [a-z0-9] via crypto.randomInt

export function generateProductPhotos(): [string, string, string];
// three independent calls; regenerate until all three seeds are distinct
```

`createProduct` stores `JSON.stringify(generateProductPhotos())` into `products.photos`. Photos never change after creation (admin edit does not touch them).

### 6.5 Password hashing (`src/lib/password.ts`)

```ts
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from './constants';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

Policy lives in §6.2 validators; `hashPassword` is only ever called on policy-passing passwords. Hash **before** opening any transaction (bcrypt is async; better-sqlite3 transactions must stay synchronous).

### 6.6 Admin bootstrap (`src/lib/bootstrap.ts` + `src/instrumentation.ts`)

`ensureAdmin()` runs once per server start (via Next instrumentation). Behavior:

1. `SELECT id FROM users WHERE role = 'admin'` — if a row exists, **return silently** (never log the password again, never overwrite).
2. Otherwise take `process.env.ADMIN_PASSWORD` (trimmed) if set, else `generateAdminPassword()`.
3. If `ADMIN_PASSWORD` was provided but violates the §6.2 password policy → `throw new Error('ADMIN_PASSWORD does not satisfy the password policy')` (fail startup loudly — this is a test/ops hook, a weak admin password must not sneak in).
4. Insert with `role='admin'`. If the insert fails with the single-admin unique-index violation (concurrent start), treat as "another worker created it" and return.
5. Print the credentials box to the console (verbatim format; one `console.log` per line):

```text
==========================================================
  PICCART ADMIN ACCOUNT CREATED
  Email:    admin@piccart.local
  Username: admin
  Password: <generated or ADMIN_PASSWORD value>
  Keep this password safe. It is shown only once.
==========================================================
```

Constants: `ADMIN_EMAIL = 'admin@piccart.local'`, `ADMIN_USERNAME = 'admin'`. `generateAdminPassword()` produces 16 characters that are guaranteed to satisfy the policy (one char from each required class first, remaining 13 from the combined alphabet `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_.!?`, then a Fisher–Yates shuffle; randomness via `crypto.randomInt`).

`src/instrumentation.ts` (verbatim):

```ts
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const { ensureAdmin } = await import('@/lib/bootstrap');
  ensureAdmin();
}
```

The two guards matter: instrumentation also loads in the Edge runtime and during `next build` workers — both must be skipped (Appendix B.4).

### 6.7 Sessions (`src/lib/session.ts`)

```ts
import crypto from 'node:crypto';
import { getDb } from '@/db';
import { SESSION_COOKIE, SESSION_TTL_DAYS } from './constants';
import type { User } from './types';

export function parseCookieHeader(header: string | null | undefined): Record<string, string>;
// split on ';', trim, split on first '=', decodeURIComponent both parts; {} on empty input

export function createSession(userId: number): { token: string; expiresAt: string };
// token = crypto.randomBytes(32).toString('hex')
// expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString()  → INSERT

export function sessionCookieHeader(token: string): string;
// `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_DAYS * 86400}`

export function clearSessionCookieHeader(): string;
// `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

export function destroySession(token: string): void;  // DELETE FROM sessions WHERE token = ?

export function getSessionUser(cookieHeader: string | null | undefined): User | null;
// token = parseCookieHeader(cookieHeader)[SESSION_COOKIE]; no token → null
// SELECT u.id, u.email, u.username, u.role, u.created_at
//   FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?
// missing row → null
// expired (expires_at <= now, plain ISO string comparison is correct for Zulu ISO strings) →
//   DELETE the session row, return null
// else map row → User (never select password_hash)

export function userFromRequest(request: Request): User | null;
// getSessionUser(parseCookieHeader(request.headers.get('cookie'))[SESSION_COOKIE] ?? null)
```

Callers: route handlers use `userFromRequest(request)`; server components use `getSessionUser((await cookies()).toString())` (`cookies()` is async in Next 15/16 — Appendix B.3). In Next dev the `SameSite=Lax` + `HttpOnly` cookie works over plain HTTP on localhost.

### 6.8 Registration and login (`src/lib/auth.ts`)

```ts
export type AuthSuccess = { ok: true; user: User; token: string };
export type RegisterResult =
  | AuthSuccess
  | { ok: false; code: 'VALIDATION_ERROR' | 'EMAIL_TAKEN' | 'USERNAME_TAKEN'; errors: FieldError[] };
export type LoginResult =
  | AuthSuccess
  | { ok: false; code: 'INVALID_CREDENTIALS' | 'VALIDATION_ERROR'; errors: FieldError[] };

export async function registerUser(input: unknown): Promise<RegisterResult>;
export async function loginUser(input: unknown): Promise<LoginResult>;
```

**`registerUser` algorithm (ordered):**
1. `validateRegistration(input)` — on failure return `VALIDATION_ERROR` with the field errors.
2. `hashPassword(password)` (await, outside any transaction).
3. In one `db.transaction`: `INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, 'user')` with the lowercased email; then `createSession(user.id)`.
4. Unique-violation mapping: the thrown better-sqlite3 error's message containing `users.email` → `EMAIL_TAKEN` (`[{ field: 'email', message: S-ERR-EMAIL-TAKEN }]`); containing `users.username` → `USERNAME_TAKEN` (`[{ field: 'username', message: S-ERR-USERNAME-TAKEN }]`). (The partial single-admin index also raises unique violations — it cannot fire here because role is always `'user'`.)
5. Success → `{ ok: true, user, token }` — registration **logs the user in** (session already created).

**`loginUser` algorithm:** validate → `SELECT id, email, username, role, password_hash, created_at FROM users WHERE email = ?` (lowercased input; NOCASE index makes casing irrelevant) → no row **or** `!(await verifyPassword(password, hash))` → `{ ok: false, code: 'INVALID_CREDENTIALS' }` with `[{ field: '', message: S-ERR-INVALID-CREDENTIALS }]` (identical for both causes) → else `createSession(user.id)` and return success.
---

## 7. API contract

### 7.1 Conventions

- Base URL: same origin as the app (dev: `http://localhost:3000`). All bodies are JSON (`Content-Type: application/json`), except responses with no body (204).
- Auth: the `piccart_sid` httpOnly cookie sent automatically by the browser. No `Authorization` header exists anywhere.
- Errors always use the envelope of §4.8: `{ "error": { "code", "message", "fields"? } }`. `message` for validation failures is the first field error's message; otherwise the code's canonical string:

| `code` | HTTP | Canonical message |
|---|---|---|
| `VALIDATION_ERROR` | 400 | S-ERR-VALIDATION |
| `INVALID_CREDENTIALS` | 401 | S-ERR-INVALID-CREDENTIALS |
| `UNAUTHENTICATED` | 401 | S-ERR-UNAUTHENTICATED |
| `FORBIDDEN` | 403 | S-ERR-FORBIDDEN |
| `NOT_FOUND` | 404 | S-ERR-NOT-FOUND |
| `EMAIL_TAKEN` | 409 | S-ERR-EMAIL-TAKEN |
| `USERNAME_TAKEN` | 409 | S-ERR-USERNAME-TAKEN |
| `LIMIT_PER_LINE` | 409 | S-ERR-QTY-LIMIT |
| `STOCK_CONFLICT` | 409 | S-ERR-STOCK-CONFLICT |
| `CART_EMPTY` | 409 | S-ERR-CART-EMPTY |

- Invalid JSON body → 400 `VALIDATION_ERROR` with `fields: [{ field: 'body', message: S-ERR-BODY }]`.
- Route handler signature pattern for dynamic routes (Next 15/16 async params — see Appendix B.2):

```ts
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response>
```

- **Reference handler (verbatim)** — every handler follows this shape; the only differences are the lib call and status mapping:

```ts
// src/app/api/auth/register/route.ts
import { registerUser } from '@/lib/auth';
import { sessionCookieHeader } from '@/lib/session';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const result = await registerUser(body);
  if (!result.ok) {
    const status = result.code === 'VALIDATION_ERROR' ? 400 : 409;
    return Response.json(
      { error: { code: result.code, message: result.errors[0]?.message ?? '', fields: result.errors } },
      { status },
    );
  }
  return Response.json(
    { user: result.user },
    { status: 201, headers: { 'Set-Cookie': sessionCookieHeader(result.token) } },
  );
}
```

---

### 7.2 `POST /api/auth/register` — public

Request: `{ "email": "robin@example.com", "username": "robin", "password": "Sun5et-Lane" }`

Success `201` (sets the session cookie):

```json
{ "user": { "id": 2, "email": "robin@example.com", "username": "robin", "role": "user", "createdAt": "2026-11-23T10:00:00.000Z" } }
```

Errors: 400 `VALIDATION_ERROR` (fields: email/username/password); 409 `EMAIL_TAKEN` or `USERNAME_TAKEN` (fields pinpoint the offender).

### 7.3 `POST /api/auth/login` — public

Request: `{ "email": "robin@example.com", "password": "Sun5et-Lane" }` → `200` `{ "user": { … } }` + session cookie. Errors: 400 `VALIDATION_ERROR`; 401 `INVALID_CREDENTIALS` (no `fields`).

### 7.4 `POST /api/auth/logout` — public (idempotent)

Destroys the session row for the cookie (if any) and returns `204` with `Set-Cookie: piccart_sid=; …; Max-Age=0`. Body: none.

### 7.5 `GET /api/auth/me` — public

`200` `{ "user": null }` when logged out; `{ "user": { … } }` when the session is valid. Never 401.

### 7.6 `GET /api/products` — public; catalog + search + sort + pagination

Query params: `query` (substring of name, optional), `sort` (one of `SORT_OPTIONS`, default `newest`, invalid → `newest`), `page` (integer ≥ 1, default 1).

`200`:

```json
{
  "products": [{
    "id": 1, "name": "Aurora Ceramic Mug", "description": "Hand-glazed stoneware mug, 350 ml.",
    "priceCents": 1850, "stock": 24,
    "photos": ["https://picsum.photos/400/400?seed=pcc-mug-a1", "https://picsum.photos/400/400?seed=pcc-mug-b7", "https://picsum.photos/400/400?seed=pcc-mug-c3"],
    "createdAt": "2026-11-23T09:15:01.000Z", "updatedAt": "2026-11-23T09:15:01.000Z"
  }],
  "page": 1, "pageSize": 12, "total": 9, "totalPages": 1
}
```

Behavior (`lib/products.ts` → `listProducts({ query, sort, page })`): filter `WHERE name LIKE ? ESCAPE '\'` with `%escaped-query%` (case-insensitive for ASCII); sort mapping — `newest`: `id DESC`; `name-asc`/`name-desc`: `name COLLATE NOCASE ASC/DESC`; `price-asc`/`price-desc`: `price_cents ASC/DESC, id ASC/DESC`; `total` counts the filtered set; `totalPages = max(1, ceil(total / PAGE_SIZE))`; requested page clamped into `[1, totalPages]`.

### 7.7 `POST /api/products` — **admin**

Request: `{ "name": "Linen Tote Bag", "description": "Sturdy washed-linen tote.", "price": "32.00", "stock": 12 }` (price as decimal string **or** number; both accepted by `parsePriceInput`).

Success `201` `{ "product": { … } }` — photos generated by §6.4. Errors: 400 `VALIDATION_ERROR` (fields: name/description/price/stock); 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`.

### 7.8 `GET /api/products/:id` — public

`200` `{ "product": { … } }`; 404 `NOT_FOUND` when missing or id is not an integer ≥ 1.

### 7.9 `PATCH /api/products/:id` — **admin** (partial update)

Request: any subset of `{ "name", "description", "price", "stock" }`. Absent fields keep current values; photos never change. `200` `{ "product": { … } }` (with refreshed `updatedAt`). Errors: 400 `VALIDATION_ERROR`; 401/403 as above; 404 `NOT_FOUND`.

### 7.10 `DELETE /api/products/:id` — **admin**

`204` (no body). Cart items referencing the product vanish (CASCADE); orders keep snapshots. `404` when missing.

### 7.11 `GET /api/cart` — session required

`200` `{ "cart": { "items": [ … ], "totalQty": 3, "subtotalCents": 5950 } }` with `items[]` = `CartLine[]` (`CartView`/`CartLine` in §4.5), ordered by `productId` ASC. `401 UNAUTHENTICATED` otherwise.

### 7.12 `POST /api/cart/items` — session required

Request: `{ "productId": 1, "qty": 2 }` (`qty` optional, default 1).

Behavior (`lib/cart.ts` → `addToCart`): product missing → 404 `NOT_FOUND`; if the line exists the new line quantity is `existing + qty`; exceeding `MAX_QTY_PER_LINE` → 409 `LIMIT_PER_LINE` (fields: qty); exceeding current stock → 409 `STOCK_CONFLICT` with extra `conflicts` array (`StockConflict[]`) — otherwise upsert and return the full cart.

Success `201` `{ "cart": { … } }`. Errors: 400 `VALIDATION_ERROR`; 401; 404; 409 as above.

### 7.13 `PATCH /api/cart/items/:productId` — session required

Request: `{ "qty": 4 }` (absolute set, 1…`MAX_QTY_PER_LINE`; removal uses §7.14). Line not in cart or product gone → 404 `NOT_FOUND`; `qty > stock` → 409 `STOCK_CONFLICT`. Success `200` `{ "cart": { … } }`.

### 7.14 `DELETE /api/cart/items/:productId` — session required

Removes the line; `200` `{ "cart": { … } }` (cart may now be empty); `404` when the line does not exist.

### 7.15 `DELETE /api/cart` — session required

Clears all lines for the user; `200` `{ "cart": { "items": [], "totalQty": 0, "subtotalCents": 0 } }`.

### 7.16 `POST /api/orders` — session required; **the transactional heart**

Request (shipping only — the cart lives in the DB, payment does not exist):

```json
{ "fullName": "Robin Tan", "addressLine1": "12 Market Street", "addressLine2": "", "city": "Springfield", "postalCode": "12345", "country": "United States" }
```

Behavior (`lib/orders.ts` → `placeOrder`):
1. Validate shipping → 400 `VALIDATION_ERROR` with fields.
2. Read the cart joined with products. Empty → 409 `CART_EMPTY` (no `fields`).
3. For every line where `qty > stock` → 409 `STOCK_CONFLICT` with `conflicts: [{ productId, name, requested, available }, …]`. **No row is written in any failure case.**
4. In one `db.transaction`: decrement each product (`UPDATE products SET stock = stock - ?, updated_at = now WHERE id = ?` — assert 1 row changed per line), `INSERT` the order with `total_cents = Σ line_total_cents`, `INSERT` order items with **snapshot** name/price, delete the user's cart items.
5. Return the created order.

Success `201`:

```json
{ "order": {
    "id": 1, "userId": 2, "status": "PLACED", "placedAt": "2026-11-23T10:02:11.000Z",
    "shipping": { "fullName": "Robin Tan", "addressLine1": "12 Market Street", "addressLine2": "", "city": "Springfield", "postalCode": "12345", "country": "United States" },
    "items": [ { "productId": 1, "name": "Aurora Ceramic Mug", "qty": 2, "unitPriceCents": 1850, "lineTotalCents": 3700 } ],
    "totalCents": 3700
} }
```

Errors: 400 `VALIDATION_ERROR`; 401; 409 `CART_EMPTY` / `STOCK_CONFLICT`.

### 7.17 `GET /api/orders` — session required

`200` `{ "orders": [ Order, … ] }` — the caller's orders, newest first (`id DESC`), each with its items. Other users' orders are never visible.

### 7.18 `GET /api/orders/:id` — owner only (admin has **no** override)

`200` `{ "order": { … } }`; `404 NOT_FOUND` for anyone who is not the owner (privacy uses 404, not 403 — do not leak existence).

### 7.19 Status-code summary

| Situation | Response |
|---|---|
| Success with body | `200` / `201` (create/register) |
| Success without body | `204` (logout, product delete) |
| Bad/invalid input | `400 VALIDATION_ERROR` |
| No/invalid session where required | `401 UNAUTHENTICATED` |
| Wrong login data | `401 INVALID_CREDENTIALS` |
| Logged in, not admin | `403 FORBIDDEN` |
| Missing resource / not owner | `404 NOT_FOUND` |
| Uniqueness / per-line limit | `409` |
| Stock or empty-cart conflict | `409` with `code` telling them apart |
---

## 8. UI/UX specification

This section defines **screens and actions** (what the user sees and does), not implementation minutiae. Every string ID refers to Appendix C. Every `data-testid` is from §8.3 — the e2e suite and the screenshots depend on them.

### 8.1 Global layout and navigation

Present on every page (rendered by `src/app/layout.tsx`):

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Piccart   [ Search products…      (Search) ]      Cart (2)  My orders   │
│  (site-brand, links home)                           Hi, robin (Log out)  │
│                                                     — or, logged out —   │
│                                                     Log in   Register    │
├──────────────────────────────────────────────────────────────────────────┤
│                              … page content …                            │
├──────────────────────────────────────────────────────────────────────────┤
│  Piccart — demo shop. No real payments.                    (footer)      │
└──────────────────────────────────────────────────────────────────────────┘
```

Header state matrix:

| Session | Right side of header |
|---|---|
| Logged out | `Log in` (→ `/login`), `Register` (→ `/register`) |
| Shopper | `Cart (n)` badge, `My orders`, `Hi, {username}`, `Log out` button |
| Admin | same as shopper **plus** `Admin` link (→ `/admin/products`) |

Rules:

- `SearchBar` submits to `/` with `?query=…` (GET navigation, empty query → `/`). Present for all users.
- `CartBadge` renders `S-NAV-CART` + count only when logged in; guests see `Cart` without a count and clicking it goes to `/cart`, which redirects to `/login?next=/cart` (§8.4 Screen 5).
- **Cart state propagation:** a `window` event `cart:changed` is dispatched (no payload) after every successful cart mutation (add, set qty, remove, clear, order placed). `CartBadge` listens for it and re-fetches `GET /api/cart` (and also fetches on mount). Mutating components additionally call `router.refresh()` so server-rendered stock badges update.
- The admin link is rendered only for admins, but authorization is always enforced server-side (pages and API).

### 8.2 Design system (plain CSS in `src/app/globals.css`)

Tokens (CSS custom properties):

| Token | Value | Used for |
|---|---|---|
| `--color-brand` / `--color-brand-hover` | `#4f46e5` / `#4338ca` | primary buttons, links, brand |
| `--color-ink` / `--color-muted` | `#111827` / `#6b7280` | text / secondary text |
| `--color-border` | `#e5e7eb` | card & input borders |
| `--color-bg` / `--color-surface` | `#f9fafb` / `#ffffff` | page background / cards |
| `--color-danger` / `--color-success` / `--color-warning` | `#dc2626` / `#16a34a` / `#d97706` | errors / in-stock badge / low-stock badge |
| `--radius` | `8px` | cards, buttons, inputs |
| `--shadow` | `0 1px 2px rgb(0 0 0 / 0.06)` | cards |
| font | `system-ui, sans-serif` stack | everything |

Classes: `.container` (max-width 1120px, centered), `.btn` + `.btn--primary`/`.btn--secondary`/`.btn--danger` (disabled state: `opacity .5`, `cursor: not-allowed`), `.badge--in`/`.badge--low`/`.badge--out`, `.field` (label above input) + `.field-error` (red, 13px), `.card`, `.grid-products` (`repeat(auto-fill, minmax(220px, 1fr))`, gap 16px), `.table` (products & orders), `.banner--success`/`.banner--error`, `.empty-state`, `.qty-stepper` (− / value / + inline), `.pager`, `.two-col` (detail & checkout: content 2fr / side 1fr; collapses to one column under 640px), `.header` (wraps to stacked rows under 640px).

Client fetch helper (verbatim — `src/lib/fetcher.ts`):

```ts
import type { FieldError } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: FieldError[] = [],
  ) { super(message); }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Something went wrong. Please try again.', []);
  }
  if (response.ok) return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  const body = await response.json().catch(() => null);
  const err = body?.error;
  throw new ApiError(
    response.status,
    err?.code ?? 'UNKNOWN',
    err?.message ?? 'Something went wrong. Please try again.',
    err?.fields ?? [],
  );
}
```

### 8.3 Canonical `data-testid` registry

Convention: static testids; entities are tagged with `data-product-id` / `data-order-id` / `data-field` attributes alongside. Testids may repeat inside repeated containers (e.g. each `cart-line` contains a `qty-value`) — e2e selectors scope by the container. e2e tests use **only** these handles.

| testid | Element | Screen |
|---|---|---|
| `site-brand` | brand link → `/` | all |
| `search-input`, `search-submit` | search box + button | header |
| `nav-cart` | Cart link (contains `cart-badge-count` when signed in) | header |
| `nav-orders`, `nav-admin`, `nav-login`, `nav-register`, `nav-logout`, `nav-username` | header links / button / span | header |
| `sort-select` | sort dropdown | 1 |
| `product-grid`, `product-card` (`data-product-id`), `product-name`, `product-price`, `product-stock-badge`, `card-add` | catalog grid & cards | 1 |
| `catalog-empty` | empty catalog state | 1 |
| `pager-prev`, `pager-next`, `pager-status` | pagination | 1 |
| `product-title`, `product-price`, `product-stock-badge`, `product-description`, `product-meta` | detail info | 2 |
| `photo-main`, `photo-thumb` (`data-photo-index` 0–2) | gallery | 2 |
| `qty-minus`, `qty-value`, `qty-plus` | QtyStepper | 2, 5 |
| `add-to-cart`, `add-to-cart-error` | purchase panel | 2 |
| `register-email`, `register-username`, `register-password`, `register-submit` | register form | 3 |
| `login-email`, `login-password`, `login-submit`, `login-error` | login form/banner | 4 |
| `field-error` (`data-field`) | inline field error | 3, 4, 6, 10, 11 |
| `cart-line` (`data-product-id`), `cart-line-name`, `cart-line-price`, `cart-line-subtotal`, `cart-line-remove`, `cart-line-error` | cart row | 5 |
| `cart-subtotal`, `cart-checkout`, `cart-empty` | cart footer / states | 5 |
| `checkout-form`, `ship-full-name`, `ship-address1`, `ship-address2`, `ship-city`, `ship-postal`, `ship-country`, `checkout-submit`, `checkout-summary`, `checkout-total`, `checkout-conflict`, `checkout-empty` | checkout | 6 |
| `order-placed-banner`, `order-id` | confirmation banner | 7 |
| `orders-list`, `order-row` (`data-order-id`), `order-row-total`, `orders-empty` | my orders | 8 |
| `order-detail`, `order-status`, `order-items`, `order-total`, `order-placed-at`, `order-shipping` | order detail | 7, 9 |
| `admin-new-link`, `admin-table`, `admin-row` (`data-product-id`), `admin-stock-input`, `admin-stock-save`, `admin-row-edit`, `admin-row-delete`, `admin-banner` | admin products | 10 |
| `admin-name`, `admin-description`, `admin-price`, `admin-stock`, `admin-save`, `admin-delete` | product form | 11, 12 |
| `access-denied`, `not-found-page`, `error-page`, `error-retry` | guard / error screens | 13, 14 |

### 8.4 Screens

---

#### Screen 1 — Catalog · `/` · public

Purpose: browse, search, sort and page the catalog; add to cart in one click.

```text
┌ Products ────────────────────────────────────────────────────────┐
│ Sort: [ Newest first ▾ ]                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│ │ [photo]  │ │ [photo]  │ │ [photo]  │ │ [photo]  │               │
│ │ Mug      │ │ Tote Bag │ │ Beanie   │ │ Candle   │  …            │
│ │ $18.50   │ │ $32.00   │ │ $16.75   │ │ $14.25   │               │
│ │ In stock │ │ Only 2…  │ │ Only 5   │ │ In stock │               │
│ │ [Add 🛒] │ │ [Add 🛒] │ │ [Add 🛒] │ │ [Add 🛒] │               │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│            (Previous)   Page 1 of 2   (Next)                      │
└───────────────────────────────────────────────────────────────────┘
```

- Content: h1 `S-HOME-TITLE`; toolbar with `sort-select` (`S-SORT-NEWEST` etc.); `product-grid` of cards from `GET`-equivalent server call `listProducts(searchParams)`. Card = photo (`photos[0]`, 200×200, alt=name), name link, price (`formatMoney`), `StockBadge`, `card-add` button.
- Stock badge rules: `stock === 0` → `S-STOCK-OUT` (`.badge--out`); `1…LOW_STOCK_THRESHOLD` → `S-STOCK-LOW` with `{n}` (`.badge--low`); else `S-STOCK-IN` (`.badge--in`).
- Actions:

| Action | Result |
|---|---|
| Click photo / name | navigate to `/products/{id}` |
| Click `card-add` (stock > 0, logged in) | `POST /api/cart/items {productId, qty:1}` → dispatch `cart:changed`, `router.refresh()`, button label becomes `S-ADDED` for 1.5 s |
| Click `card-add` (logged out) | navigate to `/login?next={current path}` |
| `card-add` while `stock === 0` | button disabled (also true after stock hits 0 following a `router.refresh()`) |
| `card-add` returns 409 | show `add-to-cart-error` with the API message |
| `sort-select` change | navigate to `/?query={q}&sort={v}` (page resets to 1) |
| Search submit (header) | navigate to `/?query={q}` |
| `pager-prev` / `pager-next` | navigate preserving `query` & `sort`; disabled at bounds; `pager-status` = `Page {x} of {y}` |

- States: empty catalog → `catalog-empty`: `S-EMPTY-CATALOG-ALL` (no products at all) or `S-EMPTY-CATALOG-QUERY` with `{query}` (search miss) + `S-404-BACK` button home. Loading: static server render — none.

---

#### Screen 2 — Product detail · `/products/[id]` · public

```text
┌ ┌──────────────┐   Aurora Ceramic Mug          ┐ ┐
│ │              │   $18.50   [In stock]          │ │
│ │  photo-main  │   Hand-glazed stoneware mug…   │ │
│ │              │   Qty [−] 1 [+]   [Add to cart]│ │
│ └──────────────┘   Product #1                  │ │
│  [t1] [t2] [t3]                                 │ │
└─────────────────────────────────────────────────┘ ┘
```

- Content: `photo-main` (400×400) + three `photo-thumb` buttons (thumbnails switch `photo-main`'s `src`; selected thumbnail has a brand-colored border); `product-title` (h1), `product-price`, `product-stock-badge` (same rules as Screen 1), `product-description` paragraph, `product-meta` = `S-PRODUCT-DETAIL-META` with `{id}`.
- `ProductPurchasePanel`: `QtyStepper` (`qty-minus`/`qty-value`/`qty-plus`), min 1, max `min(stock, MAX_QTY_PER_LINE)`; hidden entirely when `stock === 0`; `add-to-cart` button (`S-ADD-TO-CART`, disabled when out of stock); `add-to-cart-error` paragraph for API errors.
- Actions: add to cart (same semantics as Screen 1 but with selected qty, `POST /api/cart/items {productId, qty}`); thumbnails swap main image; guest add → `/login?next=/products/{id}`.
- Missing id → Screen 14 (404).

---

#### Screen 3 — Register · `/register` · guests only (logged-in users are redirected to `/`)

```text
┌ Create your account ────────────────────────┐
│  Email            [                       ] │
│  Username         [                       ] │
│  Password         [                       ] │
│    At least 8 characters, with an uppercase │
│    letter, a lowercase letter and a digit.  │
│  [ Register ]                               │
│  Already have an account? Log in            │
└─────────────────────────────────────────────┘
```

- `RegisterForm` posts `POST /api/auth/register`; success → navigate to `next` param (same safe rule as Screen 4) or `/`; the session cookie is set by the 201 response (auto-login; header updates).
- Errors: `VALIDATION_ERROR` → per-field `field-error` spans (`data-field` = email/username/password, messages from the validation strings); `EMAIL_TAKEN`/`USERNAME_TAKEN` → under the respective field. Server components pass `next` through; `next` accepted only if it starts with a single `/` (open-redirect guard) else `/`.

---

#### Screen 4 — Login · `/login` · guests only

Same card pattern; fields email + password (`login-email`, `login-password`); `login-submit` (`S-LOGIN-SUBMIT`); 401 `INVALID_CREDENTIALS` → `login-error` banner (`S-ERR-INVALID-CREDENTIALS`); success → navigate to safe `next` or `/`. Link `S-LOGIN-NO-ACCOUNT` → `/register`. `?next=/cart` after guest add-to-cart lands here and returns the user to the cart after login.

---

#### Screen 5 — Cart · `/cart` · session required (page redirects guests to `/login?next=/cart`)

```text
┌ Your cart ───────────────────────────────────────────┐
│ ┌ [thumb] Aurora Ceramic Mug   $18.50                │
│ │   Qty [−] 2 [+]        $37.00   [Remove]          │
│ ├ [thumb] Wool Beanie         $16.75                │
│ │   Qty [−] 1 [+]        $16.75   [Remove]          │
│ └─────────────────────────────────────────────────── │
│        Subtotal: $53.75        [ Checkout ]          │
│        Continue shopping                             │
└──────────────────────────────────────────────────────┘
```

- `CartView` fetches `GET /api/cart` on mount. Line: thumb (`photo`, 48px), `cart-line-name` (links to detail), `cart-line-price` (unit), `QtyStepper` (max `min(stock, MAX_QTY_PER_LINE)`), `cart-line-subtotal`, `cart-line-remove` (`S-CART-REMOVE`).
- Actions: stepper change → `PATCH /api/cart/items/{productId} {qty}`; on `STOCK_CONFLICT`/`LIMIT_PER_LINE` the stepper reverts and `cart-line-error` shows `S-CART-LINE-CONFLICT` (`{n}` = available) or `S-ERR-QTY-LIMIT`; remove → `DELETE /api/cart/items/{productId}`; every success dispatches `cart:changed`.
- Footer: `cart-subtotal` = `S-CART-SUBTOTAL` + `formatMoney(subtotalCents)`; `cart-checkout` (`S-CART-CHECKOUT`) → `/checkout`; `S-CART-CONTINUE` link → `/`.
- Empty (no lines) → `cart-empty`: `S-CART-EMPTY` + `S-CART-BROWSE` link home.

---

#### Screen 6 — Checkout · `/checkout` · session required (guests → `/login?next=/checkout`)

```text
┌ Checkout ───────────────────────────────┬ Order summary ────────────┐
│ Full name*    [                       ] │ 2 × Aurora Mug   $37.00   │
│ Address*      [                       ] │ 1 × Wool Beanie  $16.75   │
│ Address line 2 [                      ] │ ───────────────────────── │
│ City*         [                       ] │ Total           $53.75    │
│ Postal code*  [                       ] │                           │
│ Country*      [ Select country ▾      ] │                           │
│ ℹ This demo does not process payments.  │                           │
│ [ Place order ]                         │                           │
└─────────────────────────────────────────┴───────────────────────────┘
```

- `CheckoutForm` fetches `GET /api/cart` for the summary; if the cart is empty after load → `checkout-empty` (`S-CART-EMPTY` + `S-CART-BROWSE`).
- Fields (labels `S-FULLNAME-LABEL`, `S-ADDRESS1-LABEL`, `S-ADDRESS2-LABEL`, `S-CITY-LABEL`, `S-POSTAL-LABEL`, `S-COUNTRY-LABEL` from Appendix C): `country` is a `<select>` of `COUNTRIES` with disabled placeholder option `S-COUNTRY-PLACEHOLDER`; info note `S-CHECKOUT-NO-PAYMENT` (no payment section exists at all).
- Actions: `checkout-submit` (`S-CHECKOUT-SUBMIT`) → `POST /api/orders`; disable button while pending.
  - `VALIDATION_ERROR` → `field-error` under each offending field (`data-field` = fullName/addressLine1/addressLine2/city/postalCode/country).
  - `STOCK_CONFLICT` → `checkout-conflict` panel: `S-ERR-STOCK-CONFLICT` heading + one line per conflict `{name}: requested {requested}, available {available}` + `S-CONFLICT-BACK` link to `/cart`.
  - `CART_EMPTY` → `checkout-empty`.
  - Success → dispatch `cart:changed`, `router.refresh()`, navigate to `/orders/{id}?placed=1` (Screen 7).

---

#### Screen 7 — Order placed (confirmation state of the order page) · `/orders/[id]?placed=1` · owner only

```text
┌ ┌ ✓ Order placed! ─────────────────────────────────────┐ ┐
│ │ Thanks, robin. Your order #1 has been received.      │ │
│ └──────────────────────────────────────────────────────┘ │
│  Order #1  [Placed]                    (order detail     │
│  Placed at: Nov 23, 2026, 10:02 AM UTC    follows in     │
│  Shipping address: 12 Market Street, …    Screen 9)      │
└──────────────────────────────────────────────────────────┘
```

- Rendered by the order detail page when `searchParams.placed === '1'` (set only right after checkout). Green banner `order-placed-banner`: `S-ORDER-PLACED-TITLE` + `S-ORDER-PLACED-BODY` (`{username}`, `{id}`); below it a `S-ORDER-PLACED-CONTINUE` link → `/`.

---

#### Screen 8 — My orders · `/orders` · session required (guests → `/login?next=/orders`)

```text
┌ My orders ───────────────────────────────────────────┐
│ Order #2   Nov 24, 2026, 9:12 AM UTC   3 items  $86.75 [Placed] │
│ Order #1   Nov 23, 2026, 10:02 AM UTC  2 items  $37.00 [Placed] │
└──────────────────────────────────────────────────────┘
```

- Server-rendered via `listOrders(userId)`, newest first. Each `order-row` (`data-order-id`) links to `/orders/{id}`: `Order #{id}`, `formatDateTime(placedAt)`, item count, `order-row-total` (`formatMoney`), status badge `S-ORDER-STATUS`.
- Empty → `orders-empty`: `S-ORDERS-EMPTY` + `S-CART-BROWSE` link.

---

#### Screen 9 — Order detail · `/orders/[id]` · owner only

Same page as Screen 7 without the banner: `order-detail` block with `Order #{id}` title, `order-status` badge, `order-placed-at` (`S-ORDER-PLACED-AT` + formatted date), `order-shipping` (`S-ORDER-SHIPPING-TITLE` + full name, address lines, city, postal code, country), `order-items` table (`S-ORDER-ITEMS-TITLE`; columns Item / Qty / Price / Total — snapshot `name` even if the product was deleted, `formatMoney` unit + line), `order-total` row (`S-ORDER-TOTAL`). Owner-only: another user's (or a deleted) id → Screen 14 (404) — never 403 (§7.18).

---

#### Screen 10 — Admin products · `/admin/products` · admin only (guests → `/login?next=/admin/products`; shoppers → Screen 13)

```text
┌ Products (admin)                          [ New product ] ┐
│ │ Photo │ Name            │ Price  │ Stock      │ Actions │
│ │ [t]   │ Aurora Mug      │ $18.50 │ [24] (Save)│ Edit Delete │
│ │ [t]   │ Wool Beanie     │ $16.75 │ [8]  (Save)│ Edit Delete │
└────────────────────────────────────────────────────────────┘
```

- Guard order in every `/admin/**` page: `getSessionUser` → `redirect('/login?next=…')` if absent → access-denied (Screen 13) if `role !== 'admin'`.
- `admin-banner` shows on `?created=1` / `?updated=1` / `?deleted=1` (`S-ADMIN-BANNER-CREATED` / `-UPDATED` / `-DELETED`).
- Table (`admin-table`, rows `admin-row` `data-product-id`): 40px thumb (`photos[0]`), name (link to Screen 12), `formatMoney(priceCents)`, `AdminStockCell` (`admin-stock-input` number input, min 0, max `MAX_STOCK`, + `admin-stock-save` button `S-ADMIN-STOCK-SAVE`), `admin-row-edit` link, `admin-row-delete` button (`S-ADMIN-DELETE`).
- Actions: stock save → `PATCH /api/products/{id} {stock}` → `router.refresh()`; failure shows the API message next to the cell. Delete → `window.confirm(S-ADMIN-DELETE-CONFIRM)`; confirmed → `DELETE /api/products/{id}` → `router.refresh()` (row disappears; catalog updates too).
- `admin-new-link` (`S-ADMIN-NEW`) → Screen 11.

---

#### Screen 11 — Admin new product · `/admin/products/new` · admin only

`ProductForm` (create mode): fields `admin-name` (`S-ADMIN-NAME`), `admin-description` textarea (`S-ADMIN-DESCRIPTION`), `admin-price` (`S-ADMIN-PRICE`, input `inputmode="decimal"`, placeholder `0.00`), `admin-stock` (`S-ADMIN-STOCK`, number). `admin-save` (`S-ADMIN-SAVE`) → `POST /api/products` → on success navigate to `/admin/products?created=1`; validation errors under fields. A note (`S-ADMIN-PHOTOS-NOTE`) explains photos are automatic — there is **no upload control**.

---

#### Screen 12 — Admin edit product · `/admin/products/[id]` · admin only

`ProductForm` (edit mode) pre-filled (price rendered as `(priceCents/100).toFixed(2)`), plus the three `photo-thumb` images with `S-ADMIN-PHOTOS-NOTE`, plus a **Danger zone** card: `admin-delete` (`S-ADMIN-DELETE`) → `window.confirm(S-ADMIN-DELETE-CONFIRM)` → `DELETE` → `/admin/products?deleted=1`. `admin-save` → `PATCH` → `/admin/products?updated=1`. Unknown id → Screen 14.

---

#### Screen 13 — Access denied · rendered inside any `/admin/**` page for non-admin users

`access-denied` card: `S-403-TITLE` (`S-403-BODY`) + `S-403-BACK` button → `/`. No redirect to a 403 route; the page itself renders this state (status remains 200 — fine for a demo).

---

#### Screen 14 — Not found · global `not-found.tsx` (also used for other users' orders)

`not-found-page`: `S-404-TITLE`, `S-404-BODY`, `S-404-BACK` button → `/`. The runtime `error.tsx` (client) renders `error-page`: `S-ERR-GENERIC` + `error-retry` button calling `reset()`.
---

## 9. Documentation deliverable

### 9.1 Goals and voice

The documentation is a **user guide for the UI/UX** — screens and actions, not functions. It describes what a shopper or admin sees and what they can do, with a Playwright screenshot beside every screen. It never mentions the API, SQL, Next.js, sessions or the database internals (one exception: the getting-started page may tell the admin how to run the app and where the bootstrap password appears).

Voice rules: present tense; imperative actions ("Click **Add to cart**"); every screenshot is referenced in the text above it; every "What you can do" list is numbered and ends in a visible result ("…the cart badge in the header shows 2"); no tech jargon, no API/DB internals; the words "stock" and "order" mean what the UI shows.

### 9.2 Documentation files (10 Markdown files in `docs/`)

Each file: one H1, a lead paragraph, screenshots with captions, "What you see" bullets, "What you can do" numbered actions, and a short "Tips" list where useful. Image references use relative paths: `![Caption](screenshots/<file>.png)`.

| File | H1 title | Covers | Screenshots |
|---|---|---|---|
| `01-introduction.md` | Welcome to Piccart | What the shop is, who the docs are for, a tour of the header (search, cart badge, account menu), the demo-data note | SHOT-01 |
| `02-getting-started.md` | Getting started | `npm install`, `npm run dev`, opening `http://localhost:3000`; the first-run admin credentials box (what it looks like, that it prints only once); demo data via `npm run seed` | SHOT-01 |
| `03-browsing-products.md` | Browsing products | Product cards, prices, stock badges (green/amber/out), search, sorting, pagination, empty-catalog states | SHOT-01, SHOT-02 |
| `04-product-details.md` | Product details | The photo gallery and thumbnails, the quantity stepper, add-to-cart states, out-of-stock behavior | SHOT-03, SHOT-04 |
| `05-creating-an-account.md` | Creating an account and logging in | Registering (field rules in plain words), auto-login after registering, logging in, logging out, wrong-password error, guest redirect to login and back | SHOT-05, SHOT-06 |
| `06-managing-your-cart.md` | Managing your cart | The cart page, quantity steppers and their limits, remove, the per-line availability error, subtotal, empty cart | SHOT-07 |
| `07-checking-out.md` | Checking out | The checkout form field by field, the no-payment notice, the order summary, fixing field errors, the stock-conflict panel and how to resolve it, the "Order placed!" screen | SHOT-08, SHOT-09 |
| `08-order-history.md` | Your order history | My orders list (newest first), order detail (status, date, shipping address, items, total), privacy note that orders are visible only to their owner | SHOT-10, SHOT-11 |
| `09-admin-guide.md` | Admin guide: products and stock | Logging in as admin, the products table, inline stock editing, creating a product (photos are automatic), editing name/price/stock, deleting a product and what happens to order history | SHOT-12, SHOT-13, SHOT-14 |
| `10-troubleshooting.md` | Troubleshooting | "Out of stock" meaning; "Only N available" in the cart; the stock-conflict panel at checkout; product photos are placeholders and may not load offline; admin password lost → delete the `.data` folder and restart (prints new credentials, products/orders reset); no e-mails are ever sent | — |

Write these in phase 15 (they depend on the finished UI and the screenshots).

### 9.3 Demo data (`scripts/seed-demo.mjs` — verbatim)

Used by e2e global setup, the docs screenshot run, and `npm run seed` for local development. Idempotent: safe to run repeatedly against any database.

| # | Product | Description | Price | Stock | photo seed base |
|---|---|---|---|---|---|
| 1 | Aurora Ceramic Mug | Hand-glazed stoneware mug, 350 ml. | 18.50 | 24 | `pcc-mug` |
| 2 | Linen Tote Bag | Sturdy washed-linen tote with inner pocket. | 32.00 | 12 | `pcc-tote` |
| 3 | Bamboo Cutting Board | Knife-friendly bamboo board, 30 × 20 cm. | 27.90 | 0 | `pcc-board` |
| 4 | Stainless Water Bottle | Double-walled, 750 ml, keeps cold 24 h. | 22.00 | 40 | `pcc-bottle` |
| 5 | Wool Beanie | Soft merino beanie, one size. | 16.75 | 8 | `pcc-beanie` |
| 6 | Scented Soy Candle | Cedar & vanilla soy wax, 45 h burn time. | 14.25 | 30 | `pcc-candle` |
| 7 | Leather Journal | A5 journal with recycled-leather cover. | 24.99 | 15 | `pcc-journal` |
| 8 | Enamel Camp Cup | Classic speckled enamel cup, 300 ml. | 12.40 | 3 | `pcc-cup` |
| 9 | Canvas Backpack | Water-resistant canvas, 20 l, laptop sleeve. | 48.00 | 10 | `pcc-backpack` |

Each product gets photos `…/400/400?seed=<base>-1`, `-2`, `-3`. A demo shopper is created if missing: email `shopper@piccart.test`, username `shopper`, password `Shopper-Docs-1` (overridable via `DEMO_USER_PASSWORD`).

```js
// scripts/seed-demo.mjs — idempotent demo data. Usage:
//   DATABASE_PATH=.data/demo.db node scripts/seed-demo.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const file = process.env.DATABASE_PATH ?? '.data/app.db';
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new Database(file);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql'), 'utf8'));

const PRODUCTS = [
  ['Aurora Ceramic Mug', 'Hand-glazed stoneware mug, 350 ml.', 1850, 24, 'pcc-mug'],
  ['Linen Tote Bag', 'Sturdy washed-linen tote with inner pocket.', 3200, 12, 'pcc-tote'],
  ['Bamboo Cutting Board', 'Knife-friendly bamboo board, 30 x 20 cm.', 2790, 0, 'pcc-board'],
  ['Stainless Water Bottle', 'Double-walled, 750 ml, keeps cold 24 h.', 2200, 40, 'pcc-bottle'],
  ['Wool Beanie', 'Soft merino beanie, one size.', 1675, 8, 'pcc-beanie'],
  ['Scented Soy Candle', 'Cedar & vanilla soy wax, 45 h burn time.', 1425, 30, 'pcc-candle'],
  ['Leather Journal', 'A5 journal with recycled-leather cover.', 2499, 15, 'pcc-journal'],
  ['Enamel Camp Cup', 'Classic speckled enamel cup, 300 ml.', 1240, 3, 'pcc-cup'],
  ['Canvas Backpack', 'Water-resistant canvas, 20 l, laptop sleeve.', 4800, 10, 'pcc-backpack'],
];

const insertProduct = db.prepare(`
  INSERT INTO products (name, description, price_cents, stock, photos)
  SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ?)`);

for (const [name, description, priceCents, stock, seedBase] of PRODUCTS) {
  const photos = JSON.stringify([1, 2, 3].map((i) => `https://picsum.photos/400/400?seed=${seedBase}-${i}`));
  insertProduct.run(name, description, priceCents, stock, photos, name);
}

const password = process.env.DEMO_USER_PASSWORD ?? 'Shopper-Docs-1';
const hash = bcrypt.hashSync(password, 10);
db.prepare(`
  INSERT INTO users (email, username, password_hash, role)
  SELECT 'shopper@piccart.test', 'shopper', ?, 'user'
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'shopper@piccart.test')`).run(hash);

console.log(`Seeded demo data into ${file}`);
db.close();
```

### 9.4 Screenshots (`scripts/capture-docs-screenshots.mjs` — verbatim)

Screenshot manifest — every shot is a 1280×800 desktop viewport unless marked mobile (390×844):

| ID | File | Screen | Setup before capture |
|---|---|---|---|
| SHOT-01 | `catalog.png` | Screen 1 | fresh seeded DB; shopper logged in |
| SHOT-02 | `catalog-mobile.png` | Screen 1 | mobile viewport, same state |
| SHOT-03 | `product-detail.png` | Screen 2 | `/products/1` |
| SHOT-04 | `product-detail-gallery.png` | Screen 2 | after clicking `photo-thumb` with `data-photo-index="1"` |
| SHOT-05 | `register.png` | Screen 3 | logged-out context |
| SHOT-06 | `login.png` | Screen 4 | logged-out context |
| SHOT-07 | `cart.png` | Screen 5 | shopper cart: mug ×2 + beanie ×1 (added via API) |
| SHOT-08 | `checkout.png` | Screen 6 | same cart, empty form, summary visible |
| SHOT-09 | `order-placed.png` | Screen 7 | `/orders/{orderId}?placed=1` — one order placed via API first |
| SHOT-10 | `orders.png` | Screen 8 | `/orders` with the order present |
| SHOT-11 | `order-detail.png` | Screen 9 | `/orders/{orderId}` without `?placed=1` |
| SHOT-12 | `admin-products.png` | Screen 10 | admin context, table with 9 rows |
| SHOT-13 | `admin-product-new.png` | Screen 11 | `/admin/products/new` |
| SHOT-14 | `admin-product-edit.png` | Screen 12 | `/admin/products/1` |

Script behavior (single self-contained run, `npm run docs:screenshots`):

1. Delete `.data/docs.db*`, then spawn `npm run dev` with env `PORT=3311`, `DATABASE_PATH=.data/docs.db`, `ADMIN_PASSWORD=Docs-Admin-1`; poll `http://localhost:3311` until it responds (60 s timeout).
2. `spawnSync` the seed script (§9.3) with the same `DATABASE_PATH`.
3. API setup with `fetch` against `http://localhost:3311`: login as admin (capture `set-cookie`), as shopper; add mug ×2 and beanie ×1 to the shopper cart; `POST /api/orders` with shipping `{fullName: 'Robin Tan', addressLine1: '12 Market Street', addressLine2: '', city: 'Springfield', postalCode: '12345', country: 'United States'}` → remember the order id.
4. Playwright chromium: one **shopper** context (UI login via Screen 4 with the shopper credentials — captures the real post-login header), one **admin** context (UI login with `admin@piccart.local` / `Docs-Admin-1`), one **guest** context.
5. Walk the manifest top to bottom; for each shot: `goto(url, { waitUntil: 'domcontentloaded' })`, then try `waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})` (picsum.photos may be unreachable offline — never fail the run for it), `waitForTimeout(400)`, `page.screenshot({ path: 'docs/screenshots/<file>', fullPage: false })`.
6. Close the browser, kill the dev server (`proc.kill()`), print a one-line summary listing any missing shots, exit 0 (exit 1 only if the server never came up or Playwright itself throws).

```js
// scripts/capture-docs-screenshots.mjs — skeleton to complete exactly as specified above
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = 'http://localhost:3311';
const ENV = { ...process.env, PORT: '3311', DATABASE_PATH: '.data/docs.db', ADMIN_PASSWORD: 'Docs-Admin-1' };

for (const f of ['.data/docs.db', '.data/docs.db-wal', '.data/docs.db-shm']) fs.rmSync(f, { force: true });

const server = spawn('npm', ['run', 'dev'], { env: ENV, stdio: 'inherit', detached: false });
async function waitUntilUp() { /* poll fetch(BASE) every 500 ms up to 60 s, then throw */ }

const adminCreds = { email: 'admin@piccart.local', password: 'Docs-Admin-1' };
const shopperCreds = { email: 'shopper@piccart.test', password: 'Shopper-Docs-1' };

async function apiLogin(creds) { /* POST /api/auth/login → return 'piccart_sid=…' from set-cookie */ }
async function apiPost(path, cookie, body) { /* fetch with Cookie header → return res.json() */ }

const SHOTS = [ /* manifest above: { file, url, context: 'shopper'|'admin'|'guest'|'mobile', before?: async (page) => {} } */ ];

try {
  spawnSync('node', ['scripts/seed-demo.mjs'], { env: ENV, stdio: 'inherit' });
  await waitUntilUp();
  // … API setup (cart + order) as in step 3 …
  const browser = await chromium.launch();
  // … contexts, UI logins, loop over SHOTS: goto → networkidle attempt → 400 ms → screenshot …
  await browser.close();
} finally {
  server.kill();
}
```

### 9.5 Docs build (`scripts/build-docs.mjs` + `scripts/docs-template.html` — verbatim behavior)

`npm run docs:build` produces a **single static page** `docs/site/index.html` plus `docs/site/screenshots/*`:

1. Read `docs/*.md` in filename order (override dirs with `DOCS_SRC_DIR` / `DOCS_OUT_DIR` env — the unit smoke test uses a temp out dir).
2. Convert each file with `marked` (`import { marked } from 'marked'`; `marked.parse(md, { async: false })` returns a string, GFM on by default).
3. Slugs for heading anchors come from `slugify` (§6.3) applied to heading text; build a TOC of all H1 (docs files) and H2 (sections) entries linking to `#<slug>`.
4. Inject into `scripts/docs-template.html` by replacing `{{TITLE}}`, `{{TOC}}` and `{{CONTENT}}`. Missing screenshot files: print `warn: missing docs/screenshots/<name>.png — run npm run docs:screenshots` and keep the `<img>` as-is (broken image is acceptable; the build must never crash on it).
5. Copy `docs/screenshots/*.png` → `docs/site/screenshots/` (those that exist). Print `docs built → docs/site/index.html (N sections, M screenshots)`.

`docs-template.html` shell (complete — inline CSS, responsive: sidebar becomes a top block under 720px):

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>
  :root { --brand:#4f46e5; --ink:#111827; --muted:#6b7280; --border:#e5e7eb; --bg:#f9fafb; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, sans-serif; color:var(--ink); background:var(--bg); line-height:1.6; }
  .layout { display:flex; max-width:1200px; margin:0 auto; gap:32px; padding:24px; }
  nav { width:260px; flex-shrink:0; }
  nav a { display:block; color:var(--muted); text-decoration:none; padding:4px 0; }
  nav a:hover { color:var(--brand); }
  nav .lvl1 { font-weight:600; margin-top:12px; color:var(--ink); }
  main { flex:1; min-width:0; max-width:820px; }
  h1, h2 { line-height:1.25; }
  img { max-width:100%; height:auto; border:1px solid var(--border); border-radius:8px; }
  pre { background:#111827; color:#f9fafb; padding:12px; border-radius:8px; overflow-x:auto; }
  code { background:#e5e7eb; padding:1px 4px; border-radius:4px; }
  pre code { background:none; padding:0; }
  table { border-collapse:collapse; width:100%; }
  th, td { border:1px solid var(--border); padding:6px 10px; text-align:left; }
  @media (max-width: 720px) { .layout { flex-direction:column; } nav { width:auto; } }
</style>
</head>
<body>
<div class="layout">
  <nav>{{TOC}}</nav>
  <main>{{CONTENT}}</main>
</div>
</body>
</html>
```

`docs/site/` is committed (it is the user-facing artifact). Rebuilding overwrites it.

---

## 10. Test plan

### 10.1 Principles and the TDD loop

- **Unit (Jest, `testEnvironment: 'node'`)** covers everything pure or server-side: validators, formatters, hashing, photo URLs, the DB layer, auth, bootstrap, catalog/cart/order logic, and the thin route-handler wiring. **No React component tests** — jsdom and RTL are intentionally absent.
- **E2E (Playwright, Chromium only)** covers real user journeys through real screens.
- Loop per phase: write the failing tests of the phase (exact IDs from §10.3/§10.4) → `npx jest <file>` or `npx playwright test <file>` → watch them fail → implement → green → `npm run typecheck` → commit.
- Run one file: `npx jest tests/unit/cart.test.ts` / `npx playwright test tests/e2e/checkout.spec.ts`. Filter one case by ID: append `-t U-CART-04` or `-t E2E-CHECKOUT-01` (put the ID in the test name).

### 10.2 Jest configuration and DB isolation

Config is Appendix A.4 (`next/jest`, node environment, `tests/unit/**/*.test.ts`, `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`). Every unit test that touches SQLite isolates itself with a temp database (verbatim — `tests/unit/helpers/test-db.ts`):

```ts
import { closeDb, getDb } from '@/db';

export function openTestDb(): ReturnType<typeof getDb> {
  closeDb();
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'piccart-test-')), 'test.db');
  return getDb(); // applies the schema
}

export const testDb = (): ReturnType<typeof getDb> => getDb();
export function closeTestDb(): void { closeDb(); }
```

Usage pattern in every DB-touching suite:

```ts
beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });
```

Route-handler tests build plain requests:

```ts
const request = new Request('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'a@b.co', username: 'abby', password: 'Passw0rd-x' }),
});
const response = await POST(request);
expect(response.status).toBe(201);
```

For dynamic routes, pass `{ params: Promise.resolve({ id: '3' }) }` as the second argument.

### 10.3 Unit test inventory (89 tests)

**`tests/unit/validation.test.ts` — U-VAL (14)**

| ID | Asserts |
|---|---|
| U-VAL-01 | valid registrations pass; returned email is lowercased and trimmed |
| U-VAL-02 | email: missing/empty → `S-ERR-EMAIL-REQUIRED`; `a@b`, `a b@c.de`, `@x.co`, 255-char → `S-ERR-EMAIL-FORMAT`/`S-ERR-EMAIL-LENGTH` |
| U-VAL-03 | username: 2 chars, 33 chars, `space name`, `bad!name` → `S-ERR-USERNAME-FORMAT`; missing → required string |
| U-VAL-04 | password: 7 chars → `S-ERR-PASSWORD-LENGTH`; `alllower1`/`ALLUPPER1`/`NoDigits!!` → `S-ERR-PASSWORD-CLASSES`; exactly 72 bytes ok, 73 bytes → `S-ERR-PASSWORD-LENGTH` |
| U-VAL-05 | bad registration yields **all** field errors at once (email+username+password) |
| U-VAL-06 | login: valid passes; bad email format errors; password only "required" (no policy) |
| U-VAL-07 | product create: valid passes with `description ''` default; name 101 chars / price / stock errors |
| U-VAL-08 | product patch: `{ stock: 3 }` + current → full `ProductInput` with current name/description/price; invalid stock rejected |
| U-VAL-09 | `parsePriceInput`: `'18.5'`→1850, `'0.01'`→1, `'32.00'`→3200, `5`→500 |
| U-VAL-10 | `parsePriceInput` rejects `'1.234'`, `'-2'`, `'0.00'`, `'abc'`, `10000001` with `S-ERR-PRODUCT-PRICE` |
| U-VAL-11 | addToCart: `qty` default 1; `qty 0/11/2.5/'x'` → `S-ERR-QTY-INVALID`; `productId` missing/non-integer → `S-ERR-PRODUCT-ID` |
| U-VAL-12 | setQty: 1 and 10 pass; 0, 11, non-integer rejected |
| U-VAL-13 | shipping: valid passes; each field's required/length error; country outside `COUNTRIES` → `S-ERR-COUNTRY-REQUIRED` |
| U-VAL-14 | non-object body (`null`, `42`, `'x'`) → single `body` field error `S-ERR-BODY` for every validator |

**`tests/unit/format.test.ts` — U-FMT (4)**

| ID | Asserts |
|---|---|
| U-FMT-01 | `formatMoney(1850)==='$18.50'`, `(1234567)==='$12,345.67'`, `(1)==='$0.01'` |
| U-FMT-02 | `formatDateTime('2026-11-23T10:02:11.000Z')` contains `Nov 23, 2026` and `UTC` |
| U-FMT-03 | `slugify('Screen 1 — Catalog / “Home”')` → `screen-1-catalog-home` |
| U-FMT-04 | `escapeLike('50_off\\100%')` escapes `\`, `%`, `_` |

**`tests/unit/password.test.ts` — U-PW (4)**: U-PW-01 hash/verify roundtrip; U-PW-02 wrong password → `verifyPassword` false; U-PW-03 two hashes of the same password differ (salt); U-PW-04 hash matches `/^\$2[aby]\$10\$/`.

**`tests/unit/photos.test.ts` — U-PHOTO (3)**: U-PHOTO-01 `photoUrl('pcc-mug-1')` returns the exact URL string; U-PHOTO-02 `generatePhotoSeed()` is 12 chars of `[a-z0-9]`; U-PHOTO-03 `generateProductPhotos()` → 3 distinct URLs, all matching `PHOTO_URL_PATTERN`.

**`tests/unit/db.test.ts` — U-DB (12)**

| ID | Asserts |
|---|---|
| U-DB-01 | running the schema twice on one connection never throws |
| U-DB-02 | inserted user gets `role 'user'` and an ISO `created_at` |
| U-DB-03 | inserting `Foo@x.com` after `foo@X.COM` violates uniqueness |
| U-DB-04 | same for usernames (NOCASE) |
| U-DB-05 | second `role='admin'` row rejected by the partial unique index |
| U-DB-06 | product CHECKs: `price_cents 0` and `stock -1` rejected |
| U-DB-07 | photos CHECK: non-JSON text and 2-element arrays rejected; 3-element accepted |
| U-DB-08 | cart PK upsert: second insert for the same (user, product) with `ON CONFLICT … DO UPDATE` changes qty |
| U-DB-09 | cart qty CHECK: 0 and 11 rejected |
| U-DB-10 | deleting a product removes its `cart_items` (CASCADE) |
| U-DB-11 | deleting a user removes sessions, cart items, orders and order items (CASCADE) |
| U-DB-12 | a session whose `expires_at` is in the past is selectable but must be treated expired (ISO string compare) |

**`tests/unit/auth.test.ts` — U-AUTH (10)**: U-AUTH-01 register success returns user + token, session row exists, role `user`; U-AUTH-02 case-different email → `EMAIL_TAKEN`; U-AUTH-03 case-different username → `USERNAME_TAKEN`; U-AUTH-04 stored email lowercased; U-AUTH-05 login success returns token; U-AUTH-06 login with different-case email succeeds; U-AUTH-07 wrong password → `INVALID_CREDENTIALS`; U-AUTH-08 unknown email → the **same** code and no timing/wording differences; U-AUTH-09 expired session → `getSessionUser` returns null **and** deletes the row; U-AUTH-10 `destroySession` invalidates the cookie token.

**`tests/unit/bootstrap.test.ts` — U-BOOT (4)**: U-BOOT-01 first call creates the admin, logs the box (spy `console.log`; output contains `PICCART ADMIN ACCOUNT CREATED`), password satisfies the §6.2 policy; U-BOOT-02 second call is a no-op (row count unchanged, nothing logged); U-BOOT-03 `ADMIN_PASSWORD` env is used verbatim (spy log shows it); U-BOOT-04 policy-violating `ADMIN_PASSWORD` throws before any insert. (Remember `delete process.env.ADMIN_PASSWORD` in `beforeEach`.)

**`tests/unit/products.test.ts` — U-PROD (10)**

| ID | Asserts |
|---|---|
| U-PROD-01 | `createProduct` returns a Product with 3 pattern-matching photos, stored JSON parses back to the same array |
| U-PROD-02 | default listing is newest first (inserted order reversed) |
| U-PROD-03 | `query` is a case-insensitive substring match on name; `%`/`_` in the query are literal (`escapeLike`) |
| U-PROD-04 | `name-asc` alphabetical (NOCASE); `price-asc` cheapest first with id tiebreak |
| U-PROD-05 | unknown sort → newest; page `0`/`-1`/`'x'` → page 1 |
| U-PROD-06 | 13 products → `total 13`, `totalPages 2`, page 2 returns the 1 remainder |
| U-PROD-07 | `getProduct` → null for missing id, `NaN`, `0`, `-3` |
| U-PROD-08 | patch stock only: name/description/price/`photos` unchanged, `updatedAt` ≥ `createdAt` |
| U-PROD-09 | patch of missing id → typed NOT_FOUND result |
| U-PROD-10 | `deleteProduct` true → cart line cascade-gone; an existing order keeps name/price snapshots |

**`tests/unit/cart.test.ts` — U-CART (8)**: U-CART-01 add creates a line; `getCart` totals (`lineTotal`, `totalQty`, `subtotalCents`) correct; U-CART-02 second add increments (2+3=5); U-CART-03 target qty > 10 → `LIMIT_PER_LINE`; U-CART-04 target qty > stock → `STOCK_CONFLICT` with `conflicts[0].requested/available` correct and no row changed; U-CART-05 `setCartQty` updates, `removeFromCart` deletes, unknown line → `NOT_FOUND`; U-CART-06 two users' carts are independent; U-CART-07 `clearCart` empties and `getCart` returns the zeroed view; U-CART-08 add of missing product → `NOT_FOUND`.

**`tests/unit/orders.test.ts` — U-ORDER (10)**

| ID | Asserts |
|---|---|
| U-ORDER-01 | happy path: order + items inserted with snapshots, every product's stock decremented by exactly the line qty, cart empty afterwards, `totalCents` = Σ `lineTotalCents` |
| U-ORDER-02 | shipping fields persisted verbatim (incl. empty `addressLine2`) |
| U-ORDER-03 | empty cart → `CART_EMPTY`; zero rows written anywhere |
| U-ORDER-04 | conflict on one of three lines → `STOCK_CONFLICT` lists **all** over-stock lines; stocks unchanged; no order rows |
| U-ORDER-05 | price snapshot: change the product price after placing; order items keep the old `unit_price_cents` |
| U-ORDER-06 | `listOrders` returns own orders newest-first only |
| U-ORDER-07 | `getOrder(owner, id)` returns full detail incl. items |
| U-ORDER-08 | `getOrder(otherUser, id)` → null |
| U-ORDER-09 | two-line order decrements both products |
| U-ORDER-10 | `line_total_cents` = `qty × unit_price_cents` for every item |

**`tests/unit/api-routes.test.ts` — U-API (8)**: U-API-01 register handler → 201, `Set-Cookie` contains `piccart_sid=`, body `{user}` without `passwordHash`; U-API-02 duplicate email → 409 envelope `EMAIL_TAKEN` with a `fields` array; U-API-03 bad login → 401 `INVALID_CREDENTIALS`; U-API-04 `/api/auth/me` with no cookie → 200 `{user: null}`; U-API-05 `POST /api/products` without cookie → 401 `UNAUTHENTICATED`; U-API-06 with a shopper cookie → 403 `FORBIDDEN`; U-API-07 admin `PATCH /api/products/:id {stock}` → 200 and the product is updated (cookie via `Cookie: piccart_sid=<token from registerUser-bootstrap or createSession>`); U-API-08 `POST /api/orders` with a conflicting cart → 409 `STOCK_CONFLICT` + `conflicts`.

**`tests/unit/docs-build.test.ts` — U-DOCS (2)**: U-DOCS-01 run the build with `DOCS_OUT_DIR` in a temp dir → `index.html` exists, contains `Piccart` and ≥ 10 TOC links whose `#anchors` match rendered heading ids; U-DOCS-02 a docs file referencing a missing screenshot still builds (warn tolerated, HTML valid).

### 10.4 E2E test inventory (31 tests)

Configuration (Appendix A.6): Chromium only, `workers: 1` (shared SQLite file), `baseURL http://localhost:3100`, `webServer` = `npm run dev` with `PORT=3100`, `DATABASE_PATH=.data/e2e.db`, `ADMIN_PASSWORD` = the shared constant, `reuseExistingServer: false`. `global-setup.ts` deletes `.data/e2e.db*` and runs `scripts/seed-demo.mjs` (§9.3) against it — so every run starts with the 9 demo products and the demo shopper, and the admin password is `E2E_ADMIN_PASSWORD = 'e2e-Admin-123'` (imported by `playwright.config.ts` from `tests/e2e/helpers.ts` — single source of truth).

Helpers (`tests/e2e/helpers.ts`): `registerViaApi(request, creds?)` (unique e-mail via a counter), `apiLogin(request, creds)` → cookie string, `adminCookie(request)`, `createProductViaApi(request, cookie, overrides)`, `addToCartViaApi(request, cookie, productId, qty)`, `placeOrderViaApi(request, cookie, shippingOverrides?)`, `loginViaUi(page, creds)` (goto `/login`, fill testids, submit, wait for `nav-username`).

| ID | Journey (setup → steps → assertions) |
|---|---|
| E2E-SMOKE-01 | open `/` → `site-brand`, `product-grid` with 9 `product-card`s, footer `S-FOOTER` text visible |
| E2E-BROWSE-01 | search `beanie` → exactly 1 card (Wool Beanie); search `zzz` → `catalog-empty` visible |
| E2E-BROWSE-02 | `sort-select` → `Price: low to high` → first card is Enamel Camp Cup ($12.40) |
| E2E-BROWSE-03 | admin creates 8 extra products via API (17 total) → `/?page=2` shows 5 cards, `pager-status` = `Page 2 of 2`, `pager-next` disabled |
| E2E-BROWSE-04 | `/products/1` → `product-title`, `product-price` `$18.50`, 3 `photo-thumb`; click thumb 1 → `photo-main` `src` changes |
| E2E-BROWSE-05 | `/products/3` → badge `Out of stock`, `add-to-cart` disabled; `/products/8` → badge `Only 3 left` |
| E2E-AUTH-01 | register a fresh user via UI → header shows `nav-username` with the username (auto-login) |
| E2E-AUTH-02 | register with `shopper@piccart.test` → `field-error[data-field=email]` = `S-ERR-EMAIL-TAKEN` text |
| E2E-AUTH-03 | register with password `weak` → `field-error[data-field=password]` visible |
| E2E-AUTH-04 | login with wrong password → `login-error` = `S-ERR-INVALID-CREDENTIALS` |
| E2E-AUTH-05 | login as shopper → `nav-username`; `nav-logout` click → `nav-login` visible |
| E2E-AUTH-06 | logged out: on `/products/1` click `add-to-cart` → URL `/login?next=%2Fproducts%2F1`; login → back on `/products/1` |
| E2E-CART-01 | fresh user, `card-add` on mug → `cart-badge-count` = `1` |
| E2E-CART-02 | fresh user, on `/products/1` set qty 2, add → badge `2`, cart page shows one line qty 2 |
| E2E-CART-03 | cart: stepper +/− updates `cart-line-subtotal` and `cart-subtotal` immediately |
| E2E-CART-04 | cart line for product 8 with qty 2 → admin drops stock to 1 via API → click `qty-plus` → `cart-line-error` = `Only 1 available.` |
| E2E-CART-05 | two lines; `cart-line-remove` on one → line gone, badge decremented |
| E2E-CART-06 | remove last line → `cart-empty` visible with `S-CART-BROWSE` link |
| E2E-CHECKOUT-01 | fresh user: mug ×2 + beanie ×1 via UI → `/checkout` → fill all fields → place → URL `/orders/{id}?placed=1`, `order-placed-banner` visible; `/admin/products` (admin login): mug stock input = `22`; `/cart` shows the empty state |
| E2E-CHECKOUT-02 | submit the empty form → `field-error` visible for fullName/addressLine1/city/postalCode/country |
| E2E-CHECKOUT-03 | shopper adds product 8 ×3 → admin sets stock 1 → place order → `checkout-conflict` visible, contains `Enamel Camp Cup` and `requested 3`; DB unchanged (product page still `Only 1 left`) |
| E2E-CHECKOUT-04 | logged out: goto `/checkout` → redirected to `/login?next=%2Fcheckout` |
| E2E-ORDERS-01 | order placed via API for the shopper → `/orders` shows a row with the correct total and item count; row click → order page |
| E2E-ORDERS-02 | order detail shows shipping block, items table (snapshot name/price), `order-total` |
| E2E-ORDERS-03 | user B opens `/orders/{A's id}` → `not-found-page` visible |
| E2E-ADMIN-01 | shopper goto `/admin/products` → `access-denied` visible; header has no `nav-admin` |
| E2E-ADMIN-02 | admin creates `E2E Test Widget` ($9.99, stock 5) via Screen 11 → redirected with `admin-banner` `Product created.`; card appears on `/`; detail page shows 3 photos |
| E2E-ADMIN-03 | set mug stock input to `5` → `admin-stock-save` → catalog badge becomes `Only 5 left` |
| E2E-ADMIN-04 | edit form price `9.99` → `21.50` → product page shows `$21.50` |
| E2E-ADMIN-05 | shopper adds product 2 to cart; admin deletes product 2 from the edit page (`window.confirm` auto-accepted) → shopper reloads `/cart` → line gone (empty state) |
| E2E-ADMIN-06 | API guard: `POST /api/products` with a shopper cookie → 403 `FORBIDDEN` |

### 10.5 Manual verification (after phase 15)

Walk §12's checklist once against a fresh `npm run dev` instance (fresh `.data` folder): watch the console for the admin box, register, shop, check out, verify stock decreased on the product page, verify the order list, then exercise the admin screens.

### 10.6 `npm run verify`

```
npm run typecheck && npm run test && npm run build && npm run test:e2e && npm run docs:build
```

`docs:screenshots` is **not** part of verify (needs the network for picsum.photos); run it manually before committing docs. Expected wall time: well under 10 minutes total. All five steps must pass before declaring the project done.
---

## 11. TDD implementation plan (phases 0–15)

**Discipline.** Phases 1–15 are strictly test-first: copy the phase's test IDs from §10, create the test file, run it, watch it fail (red), implement only what makes those tests pass (green), run `npm run typecheck`, commit. Phase 0 is config-only — no production behavior exists to test, which is why it has no test list; every later phase must be able to point at its red tests. Never begin a phase with a red suite from the previous phase.

**Working state:** `.data/` holds runtime databases; it is gitignored — never commit it. The e2e run and the docs screenshot run each delete and rebuild their own database, so phases never interfere with a dev server you may have running (different ports and DB files).

### Phase 0 — Scaffold and toolchain

- **Goal:** a runnable empty Next.js app with every config file, zero features.
- **Do:** follow §2.4 (scaffold), write all Appendix A files, install deps, `npx playwright install chromium`, `npm pkg set engines.node=">=22.12"`, create the directory skeleton of §3 (empty test files not yet — they come with their phases).
- **Done when:** `npm run dev` serves the placeholder page on :3000; `npm run typecheck` passes; `npx jest` exits 0 with "no tests"; `npx playwright test --list` lists 0 tests without error; `git commit -m "chore: scaffold project"`.

### Phase 1 — Schema and DB layer

- **Tests first:** `tests/unit/db.test.ts` — U-DB-01…U-DB-12.
- **Implement:** `src/db/schema.sql` (§5.2 verbatim), `src/db/index.ts` (§4.4 verbatim).
- **Done when:** 12/12 green; `git commit -m "feat(db): schema and connection layer"`.

### Phase 2 — Constants, validation and formatting

- **Tests first:** `tests/unit/validation.test.ts` U-VAL-01…14, `tests/unit/format.test.ts` U-FMT-01…04.
- **Implement:** `src/lib/types.ts` (§4.5), `src/lib/constants.ts` (§4.7), `src/lib/validation.ts` (§6.2), `src/lib/format.ts` (§6.3).
- **Done when:** 18/18 green; commit `"feat(lib): validation and formatting"`.

### Phase 3 — Password hashing and photo URLs

- **Tests first:** U-PW-01…04, U-PHOTO-01…03.
- **Implement:** `src/lib/password.ts` (§6.5), `src/lib/photos.ts` (§6.4).
- **Done when:** 7/7 green; commit `"feat(lib): password hashing and photo urls"`.

### Phase 4 — Auth domain (registration, login, sessions)

- **Tests first:** `tests/unit/auth.test.ts` U-AUTH-01…10.
- **Implement:** `src/lib/session.ts` (§6.7), `src/lib/auth.ts` (§6.8).
- **Done when:** 10/10 green; commit `"feat(auth): registration, login, db sessions"`.

### Phase 5 — Admin bootstrap

- **Tests first:** `tests/unit/bootstrap.test.ts` U-BOOT-01…04 (spy on `console.log`; clear `process.env.ADMIN_PASSWORD` between tests).
- **Implement:** `src/lib/bootstrap.ts` (§6.6), `src/instrumentation.ts` (§6.6 verbatim).
- **Manual check:** `rm -rf .data && npm run dev` prints the credentials box exactly once; a restart prints nothing.
- **Done when:** 4/4 green + manual check; commit `"feat(admin): startup bootstrap"`.

### Phase 6 — Products domain

- **Tests first:** `tests/unit/products.test.ts` U-PROD-01…10.
- **Implement:** `src/lib/products.ts` (§7.6–§7.10 behaviors).
- **Done when:** 10/10 green; commit `"feat(products): catalog, search, sort, pagination"`.

### Phase 7 — Auth and products API handlers

- **Tests first:** `tests/unit/api-routes.test.ts` U-API-01…07.
- **Implement:** `src/app/api/auth/register/route.ts`, `login`, `logout`, `me`, `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts` — all per §7, using the reference handler shape of §7.1.
- **Done when:** 7/7 green; commit `"feat(api): auth and product endpoints"`.

### Phase 8 — Cart and orders domain (the transaction)

- **Tests first:** `tests/unit/cart.test.ts` U-CART-01…08, `tests/unit/orders.test.ts` U-ORDER-01…10.
- **Implement:** `src/lib/cart.ts` (§7.11–§7.15), `src/lib/orders.ts` (§7.16–§7.18 incl. the single-transaction `placeOrder`).
- **Done when:** 18/18 green; commit `"feat(shop): cart and transactional order placement"`.

### Phase 9 — Cart and orders API handlers

- **Tests first:** U-API-08 (order conflict end-to-end through the handler).
- **Implement:** `src/app/api/cart/route.ts`, `cart/items/route.ts`, `cart/items/[productId]/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`.
- **Done when:** U-API-08 green **and** Appendix D's curl smoke run against `npm run dev` succeeds end-to-end; commit `"feat(api): cart and order endpoints"`.

### Phase 10 — UI shell, catalog, product detail (+ e2e infrastructure)

- **Tests first:** `tests/e2e/helpers.ts` + `global-setup.ts` + `playwright.config.ts` (Appendix A.6), then `smoke.spec.ts` E2E-SMOKE-01 and `browse.spec.ts` E2E-BROWSE-01…05.
- **Implement:** `scripts/seed-demo.mjs` (§9.3 — needed by global setup), `layout.tsx`, `globals.css` (§8.2), `SiteHeader`, `SearchBar`, `SortSelect`, `CartBadge`, `page.tsx` (catalog), `products/[id]/page.tsx`, `AddToCartButton`, `ProductPurchasePanel`, `QtyStepper`, `StockBadge`, `Pager`.
- **Done when:** 6/6 e2e green; catalog and detail match §8.4 Screens 1–2; commit `"feat(ui): shell, catalog and product pages"`.

### Phase 11 — Auth UI

- **Tests first:** `auth.spec.ts` E2E-AUTH-01…06.
- **Implement:** `RegisterForm`, `LoginForm`, `register/page.tsx`, `login/page.tsx` (with the safe-`next` guard).
- **Done when:** 6/6 green; commit `"feat(ui): register and login"`.

### Phase 12 — Cart UI

- **Tests first:** `cart.spec.ts` E2E-CART-01…06.
- **Implement:** `CartView`, `cart/page.tsx`.
- **Done when:** 6/6 green; commit `"feat(ui): cart page"`.

### Phase 13 — Checkout and order history UI

- **Tests first:** `checkout.spec.ts` E2E-CHECKOUT-01…04, `orders.spec.ts` E2E-ORDERS-01…03.
- **Implement:** `CheckoutForm`, `checkout/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx` (incl. the `?placed=1` banner), `not-found.tsx` (needed by E2E-ORDERS-03).
- **Done when:** 7/7 green; commit `"feat(ui): checkout and order history"`.

### Phase 14 — Admin UI

- **Tests first:** `admin.spec.ts` E2E-ADMIN-01…06.
- **Implement:** `admin/products/page.tsx`, `admin/products/new/page.tsx`, `admin/products/[id]/page.tsx`, `AdminStockCell`, `ProductForm`, `admin/access-denied.tsx`, `error.tsx`.
- **Done when:** 6/6 green; commit `"feat(ui): admin product management"`.

### Phase 15 — Documentation

- **Tests first:** `tests/unit/docs-build.test.ts` U-DOCS-01…02 (build script before docs content).
- **Implement:** `scripts/build-docs.mjs` + `scripts/docs-template.html` (§9.5), the ten `docs/*.md` files (§9.2), `scripts/capture-docs-screenshots.mjs` (§9.4); run `npm run docs:screenshots` (needs network for picsum.photos — tolerate missing images), then `npm run docs:build`; commit `docs/site/`.
- **Done when:** U-DOCS green; all 14 PNGs exist with size > 20 KB each (or are documented as offline-skipped); `npm run verify` passes end-to-end; §12 checked off item by item; commit `"docs: user guide built to html with screenshots"`.

---

## 12. Acceptance checklist

Check every line against **real output** before declaring done. Bracketed refs point at the requirement.

- [ ] Fresh start (`rm -rf .data && npm run dev`) prints the admin credentials box with a policy-compliant 16-char password; a restart prints nothing [R3]
- [ ] Registering with a used e-mail (any casing) shows "This email is already registered." under the field [R1]
- [ ] Passwords shorter than 8 chars or missing upper/lower/digit are rejected at registration with the Appendix C messages [R1]
- [ ] Login works with the registered e-mail; wrong password shows the generic invalid-credentials message; logout clears the session [R2]
- [ ] Cart, checkout and orders pages redirect logged-out users to `/login?next=…` and return them afterwards [R2]
- [ ] Admin can log in with the printed credentials and sees the Admin link; shoppers never do, and `/admin/**` + admin API return the access-denied state / 403 [R4, R10]
- [ ] Admin creates a product → it appears in the catalog with three `https://picsum.photos/400/400?seed=…` photos (square 400×400) and the set stock [R4, R5]
- [ ] Admin changes stock inline → catalog badge updates ("In stock" / "Only N left" / "Out of stock") [R10]
- [ ] Shopper adds to cart from card and detail; badge count matches total quantity; cart line steppers enforce 1–10 and availability [R6]
- [ ] Checkout form validates every shipping field; contains no payment section, only the "This demo does not process payments." notice [R7]
- [ ] Placing an order shows "Order placed!" with the order number, stores the order, and clears the cart [R7]
- [ ] Stock decreased by exactly the ordered quantities (check the admin table or product page) [R8]
- [ ] Ordering more than stock is blocked with the conflict panel listing requested vs available, and nothing is written [R8]
- [ ] My orders lists past orders newest-first; order detail shows snapshot name/prices even after the product was deleted or re-priced [R9]
- [ ] Deleting a product removes it from the catalog and from shoppers' carts, but past orders keep their snapshots [R10]
- [ ] `npm run verify` passes: typecheck → 89 unit tests → build → 31 e2e tests → docs build [R12]
- [ ] `docs/site/index.html` opens in a browser: sidebar TOC works, all sections present [R11]
- [ ] `docs/screenshots/` contains 14 non-empty PNGs matching §9.4, each embedded in the matching docs page [R11]
- [ ] The docs describe screens and actions only — no API/DB/implementation text (grep the docs for "API", "SQL", "endpoint" — the only allowed hit is the getting-started runbook) [R11]
- [ ] Every user-visible string matches Appendix C verbatim (spot-check e2e-asserted ones) [R1–R10]
- [ ] `README.md` states what the project is, `npm run dev`, `npm test`, `npm run test:e2e`, `npm run verify` [—]
---

## Appendix A — Complete config files

Copy each file verbatim. Versions are the pins verified on 2026-11-23 (§2).

### A.1 `package.json`

```json
{
  "name": "piccart",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "seed": "node scripts/seed-demo.mjs",
    "docs:screenshots": "node scripts/capture-docs-screenshots.mjs",
    "docs:build": "node scripts/build-docs.mjs",
    "verify": "npm run typecheck && npm run test && npm run build && npm run test:e2e && npm run docs:build"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "better-sqlite3": "^13.2.0",
    "next": "^16.4.6",
    "react": "^19.3.1",
    "react-dom": "^19.3.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.1",
    "@playwright/test": "^1.65.1",
    "@types/better-sqlite3": "^9.6.0",
    "@types/node": "^26.6.6",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "eslint": "^10.15.0",
    "eslint-config-next": "^16.4.6",
    "jest": "^30.5.2",
    "marked": "^18.2.1",
    "typescript": "^7.0.2"
  }
}
```

### A.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "docs/site"]
}
```

### A.3 `next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
```

### A.4 `jest.config.mjs`

```js
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  clearMocks: true,
};

export default createJestConfig(config);
```

(`next/jest` automatically picks up `jest.setup.ts` in the project root. Do not add ts-jest or babel.)

### A.5 `jest.setup.ts`

```ts
// Unit tests pick their own temp DATABASE_PATH (§10.2); nothing global is needed.
export {};
```

### A.6 `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';
import { E2E_ADMIN_PASSWORD } from './tests/e2e/helpers';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1, // one shared SQLite file — never parallelize (Appendix B.13)
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    env: { PORT: '3100', DATABASE_PATH: '.data/e2e.db', ADMIN_PASSWORD: E2E_ADMIN_PASSWORD },
  },
});
```

`tests/e2e/global-setup.ts`:

```ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

export default function globalSetup(): void {
  for (const f of ['.data/e2e.db', '.data/e2e.db-wal', '.data/e2e.db-shm']) {
    fs.rmSync(f, { force: true });
  }
  execFileSync('node', ['scripts/seed-demo.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_PATH: '.data/e2e.db' },
  });
}
```

`tests/e2e/helpers.ts` must define (at minimum) the shared constant used above:

```ts
export const E2E_ADMIN_PASSWORD = 'e2e-Admin-123'; // satisfies §6.2 policy
```

### A.7 `eslint.config.mjs`

```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['docs/site/**', '.data/**', 'node_modules/**'] },
];

export default eslintConfig;
```

### A.8 `.gitignore`

```text
node_modules/
.next/
out/
.data/
*.tsbuildinfo
next-env.d.ts
.env*.local
```

### A.9 `.env.example`

```text
# Copy to .env.local (Next.js loads it for dev and start). All values optional.
# DATABASE_PATH=.data/app.db
# ADMIN_PASSWORD=      # only read on first boot, when the admin account is created
# PORT=3000
```

### A.10 `README.md`

```markdown
# Piccart

A tiny demo e-commerce app: Next.js + SQLite, built test-first (Jest + Playwright).
No real payments — checkout stores orders locally.

- Run: `npm install && npm run dev` → http://localhost:3000 (admin password prints to the console on first start)
- Demo data: `npm run seed`
- Unit tests: `npm test` · E2E: `npm run test:e2e` · Everything: `npm run verify`
- User guide: `docs/site/index.html` (rebuild with `npm run docs:build`, screenshots with `npm run docs:screenshots`)
```

---

## Appendix B — Pitfalls and troubleshooting

Read once before phase 0 and again whenever something "impossible" happens.

1. **better-sqlite3 install** — it ships prebuilt binaries for common Node ABIs. If npm falls back to compiling, you need `python3`, `make`, `g++`. If prebuilds are missing for your exact Node version, either install build tools or switch to the other LTS line (22 ↔ 24 ↔ 26) — nothing in this spec depends on the major.
2. **Next 15/16 async request APIs** — `cookies()`, `headers()`, page `searchParams`/`params`, and route-handler `{ params }` are **Promises**: `const { id } = await params;`, `(await cookies()).toString()`. Symptom of forgetting: `params.id` is `undefined` or "cannot read properties of a Promise".
3. **`serverExternalPackages: ['better-sqlite3']`** — without it the bundler tries to bundle the native `.node` binding and fails ("Module did not self-register", "no such file or directory … .node"). Keep §A.3 exactly.
4. **instrumentation guards** — `register()` also runs in the Edge runtime and during `next build` workers. Keep both guards from §6.6, or the build crashes trying to open the DB. The DB must only be touched at real server runtime and in tests.
5. **bcryptjs 72-byte limit** — bcrypt silently truncates beyond 72 bytes; the validator rejects those passwords up front (`Buffer.byteLength`, not `.length` — multi-byte characters count as more than 1 byte).
6. **Turbopack is the default** for `next dev` and `next build` in Next 16. Do not add webpack config and do not pass `--turbo` (obsolete flag from older docs).
7. **`next lint` was removed in Next 16.** Lint with `eslint .` and the flat config of §A.7. `typecheck` (`tsc --noEmit`) is the gate that must pass; lint is advisory.
8. **Jest without React** — `next/jest` defaults to the jsdom environment; this project overrides to `'node'`. Server modules must not import `next/server`, `next/headers` or the `server-only` package — handlers use the standard `Request`/`Response` (§7.1), server components pass cookie header strings into lib functions (§6.7).
9. **better-sqlite3 binds `undefined` → throws** ("Too few parameter values" / type errors). Always coalesce optional values when binding (`value ?? null`) and keep integers as numbers.
10. **ISO string time comparison** is only correct because every writer produces Zulu ISO strings (`toISOString()` or the SQLite `strftime` defaults). Never store a locale-formatted date.
11. **LIKE wildcards** — search input must go through `escapeLike` with `LIKE ? ESCAPE '\'`, or a query of `%` returns the whole catalog.
12. **Playwright port discipline** — the config pins port 3100 and `reuseExistingServer: false` so runs are hermetic. If the port is busy, kill the stale process; do not switch ports in one place only (helpers and screenshots assume 3100/3311 respectively).
13. **e2e `workers: 1` is mandatory** — parallel workers share one SQLite file and would see each other's rows (duplicate e-mails, phantom stock changes). Flaky e2e? Check `workers` first.
14. **`process.cwd()`-relative schema load** — `npm run dev`, `npm start`, jest and Playwright all run npm scripts from the project root, which is what makes reading `src/db/schema.sql` safe. Keep exactly one copy of the schema; if you ever relocate it, update both readers.
15. **picsum.photos may be unreachable** (offline sandboxes, rate limits). e2e must never assert on pixel content — only on element counts and `src` attributes; the docs screenshot script tolerates broken images (§9.4 step 5).
16. **Hydration mismatches** — format every date/money through `format.ts` (fixed `en-US` + UTC) on the server, and do not re-format differently in client code; never print raw `Date` objects in JSX.
17. **Admin password is unrecoverable by design** — printed once at creation (R3). Recovery: stop the server, delete `.data/app.db*`, restart (fresh bootstrap; data resets). Never persist it anywhere or log it again.
18. **The single-admin partial unique index** — once an admin exists, any second `role='admin'` insert raises `SQLITE_CONSTRAINT_UNIQUE`. `ensureAdmin` treats that as "already done". Do not drop the index to "fix" a duplicate-admin bug; the bug is in the caller.
---

## Appendix C — Canonical UI strings

Every user-visible string, with its ID. `{placeholders}` are filled at render time; the surrounding text is exact. e2e tests assert these strings verbatim; the documentation copies them; do not paraphrase anywhere.

### C.1 Errors and validation (API `message`, inline `field-error` texts)

| ID | Text | Used by |
|---|---|---|
| S-ERR-VALIDATION | Please fix the highlighted fields. | envelope message for 400 |
| S-ERR-BODY | Invalid request body. | non-object/invalid JSON |
| S-ERR-INVALID-CREDENTIALS | Invalid email or password. | login 401, `login-error` |
| S-ERR-UNAUTHENTICATED | You must be logged in. | 401 envelope |
| S-ERR-FORBIDDEN | You do not have permission to do that. | 403 envelope |
| S-ERR-NOT-FOUND | Not found. | 404 envelope |
| S-ERR-GENERIC | Something went wrong. Please try again. | `error-page`, network errors |
| S-ERR-EMAIL-REQUIRED | Email is required. | register/login |
| S-ERR-EMAIL-FORMAT | Enter a valid email address. | register/login |
| S-ERR-EMAIL-LENGTH | Email is too long. | register (≤ 254 chars) |
| S-ERR-EMAIL-TAKEN | This email is already registered. | register 409 |
| S-ERR-USERNAME-REQUIRED | Username is required. | register |
| S-ERR-USERNAME-FORMAT | Username must be 3–32 characters and contain only letters, digits, hyphens or underscores. | register |
| S-ERR-USERNAME-TAKEN | This username is already taken. | register 409 |
| S-ERR-PASSWORD-REQUIRED | Password is required. | register/login |
| S-ERR-PASSWORD-LENGTH | Password must be 8–72 characters. | register |
| S-ERR-PASSWORD-CLASSES | Password must contain an uppercase letter, a lowercase letter and a digit. | register |
| S-ERR-PRODUCT-NAME | Name is required (max 100 characters). | product form |
| S-ERR-PRODUCT-DESCRIPTION | Description must be at most 2,000 characters. | product form |
| S-ERR-PRODUCT-PRICE | Price must be a positive amount up to $100,000.00, with at most 2 decimals. | product form |
| S-ERR-PRODUCT-STOCK | Stock must be a whole number between 0 and 1,000,000. | product form |
| S-ERR-PRODUCT-ID | Invalid product. | cart input validation |
| S-ERR-QTY-INVALID | Quantity must be a whole number between 1 and 10. | cart validation |
| S-ERR-QTY-LIMIT | You can order at most 10 units per line. | 409 `LIMIT_PER_LINE`, cart line error |
| S-ERR-STOCK-CONFLICT | Some items are no longer available in the requested quantity. | 409 `STOCK_CONFLICT`, `checkout-conflict` |
| S-ERR-CART-EMPTY | Your cart is empty. | 409 `CART_EMPTY`, `checkout-empty` |
| S-ERR-FULLNAME-REQUIRED | Full name is required. | checkout |
| S-ERR-FULLNAME-LENGTH | Full name must be 2–80 characters. | checkout |
| S-ERR-ADDRESS1-REQUIRED | Address is required. | checkout |
| S-ERR-ADDRESS1-LENGTH | Address must be 5–120 characters. | checkout |
| S-ERR-ADDRESS2-LENGTH | Address line 2 must be at most 120 characters. | checkout |
| S-ERR-CITY-REQUIRED | City is required. | checkout |
| S-ERR-CITY-LENGTH | City must be 2–60 characters. | checkout |
| S-ERR-POSTAL-REQUIRED | Postal code is required. | checkout |
| S-ERR-POSTAL-LENGTH | Postal code must be 3–16 characters. | checkout |
| S-ERR-COUNTRY-REQUIRED | Select a country. | checkout |

### C.2 Navigation and global

| ID | Text |
|---|---|
| S-BRAND | Piccart |
| S-NAV-CART | Cart |
| S-NAV-ORDERS | My orders |
| S-NAV-ADMIN | Admin |
| S-NAV-LOGIN | Log in |
| S-NAV-REGISTER | Register |
| S-NAV-LOGOUT | Log out |
| S-NAV-HI | Hi, {username} |
| S-SEARCH-PLACEHOLDER | Search products… |
| S-SEARCH-BUTTON | Search |
| S-FOOTER | Piccart — demo shop. No real payments. |

### C.3 Catalog and product detail (Screens 1–2)

| ID | Text |
|---|---|
| S-HOME-TITLE | Products |
| S-SORT-NEWEST | Newest first |
| S-SORT-NAME-ASC | Name A→Z |
| S-SORT-NAME-DESC | Name Z→A |
| S-SORT-PRICE-ASC | Price: low to high |
| S-SORT-PRICE-DESC | Price: high to low |
| S-EMPTY-CATALOG-ALL | No products yet. |
| S-EMPTY-CATALOG-QUERY | Nothing matches “{query}”. |
| S-STOCK-IN | In stock |
| S-STOCK-LOW | Only {n} left |
| S-STOCK-OUT | Out of stock |
| S-ADD-TO-CART | Add to cart |
| S-ADDED | Added ✓ |
| S-PRODUCT-DETAIL-META | Product #{id} |

### C.4 Register and login (Screens 3–4)

| ID | Text |
|---|---|
| S-REGISTER-TITLE | Create your account |
| S-REGISTER-SUBMIT | Register |
| S-REGISTER-HAVE-ACCOUNT | Already have an account? Log in |
| S-REGISTER-PASSWORD-HELP | At least 8 characters, with an uppercase letter, a lowercase letter and a digit. |
| S-LOGIN-TITLE | Log in |
| S-LOGIN-SUBMIT | Log in |
| S-LOGIN-NO-ACCOUNT | New here? Create an account |

Form labels for both screens: `Email` (`S-EMAIL-LABEL`), `Username` (`S-USERNAME-LABEL`), `Password` (`S-PASSWORD-LABEL`).

### C.5 Cart (Screen 5)

| ID | Text |
|---|---|
| S-CART-TITLE | Your cart |
| S-CART-EMPTY | Your cart is empty. |
| S-CART-BROWSE | Browse products |
| S-CART-SUBTOTAL | Subtotal |
| S-CART-CHECKOUT | Checkout |
| S-CART-CONTINUE | Continue shopping |
| S-CART-REMOVE | Remove |
| S-CART-LINE-CONFLICT | Only {n} available. |

### C.6 Checkout and orders (Screens 6–9)

| ID | Text |
|---|---|
| S-CHECKOUT-TITLE | Checkout |
| S-CHECKOUT-SUBMIT | Place order |
| S-CHECKOUT-NO-PAYMENT | This demo does not process payments. Your order is stored directly. |
| S-CHECKOUT-SUMMARY | Order summary |
| S-CONFLICT-BACK | Back to cart |
| S-FULLNAME-LABEL | Full name |
| S-ADDRESS1-LABEL | Address |
| S-ADDRESS2-LABEL | Address line 2 (optional) |
| S-CITY-LABEL | City |
| S-POSTAL-LABEL | Postal code |
| S-COUNTRY-LABEL | Country |
| S-COUNTRY-PLACEHOLDER | Select country |
| S-ORDER-PLACED-TITLE | Order placed! |
| S-ORDER-PLACED-BODY | Thanks, {username}. Your order #{id} has been received. |
| S-ORDER-PLACED-CONTINUE | Continue shopping |
| S-ORDERS-TITLE | My orders |
| S-ORDERS-EMPTY | You have not placed any orders yet. |
| S-ORDER-STATUS | Placed |
| S-ORDER-SHIPPING-TITLE | Shipping address |
| S-ORDER-ITEMS-TITLE | Items |
| S-ORDER-TOTAL | Total |
| S-ORDER-PLACED-AT | Placed at |

Order detail column headers: `Item`, `Qty`, `Price`, `Total` (`S-ITEM-HEADER`, `S-QTY-HEADER`, `S-PRICE-HEADER`, reuse `S-ORDER-TOTAL` for the last column).

### C.7 Admin (Screens 10–12)

| ID | Text |
|---|---|
| S-ADMIN-TITLE | Products (admin) |
| S-ADMIN-NEW | New product |
| S-ADMIN-STOCK-SAVE | Save |
| S-ADMIN-EDIT | Edit |
| S-ADMIN-DELETE | Delete |
| S-ADMIN-DELETE-CONFIRM | Delete this product? Order history will keep its snapshot. |
| S-ADMIN-BANNER-CREATED | Product created. |
| S-ADMIN-BANNER-UPDATED | Product updated. |
| S-ADMIN-BANNER-DELETED | Product deleted. |
| S-ADMIN-NAME | Name |
| S-ADMIN-DESCRIPTION | Description |
| S-ADMIN-PRICE | Price (USD) |
| S-ADMIN-STOCK | Stock |
| S-ADMIN-SAVE | Save product |
| S-ADMIN-PHOTOS-NOTE | Photos are assigned automatically and cannot be uploaded or changed. |
| S-ADMIN-DANGER | Danger zone |

Admin table column headers reuse: `Photo` (`S-ADMIN-PHOTO-HEADER`), `S-ADMIN-NAME`, `S-ADMIN-PRICE`, `S-ADMIN-STOCK`, `Actions` (`S-ADMIN-ACTIONS-HEADER`).

### C.8 Guard and error screens (Screens 13–14)

| ID | Text |
|---|---|
| S-403-TITLE | Access denied |
| S-403-BODY | You need an admin account to view this page. |
| S-403-BACK | Back to home |
| S-404-TITLE | Page not found |
| S-404-BODY | The page you are looking for does not exist or belongs to another user. |
| S-404-BACK | Back to home |
| S-ERROR-RETRY | Try again |

---

## Appendix D — API smoke-test script

Save as `scripts/smoke.sh` (optional but recommended) and run after `npm run dev` on a fresh database (`rm -rf .data`). It exercises the full happy path of §7 in nine calls and is the phase 9 "done when". Exit output should show: a 201 with a `user`, `me` echoing the user, the product with three picsum URLs, a cart with one line, an order with `totalCents` 1998, and the product stock reduced to `3`.

```bash
#!/usr/bin/env bash
# Piccart API smoke test — run against a FRESH dev server (rm -rf .data && npm run dev)
set -e
BASE=${BASE:-http://localhost:3000}
SHOPPER=/tmp/piccart-shopper.txt
ADMIN=/tmp/piccart-admin.txt

echo "== 1. register shopper (201 expected)"
curl -s -o /dev/null -w '%{http_code}\n' -c "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","username":"smoke","password":"Smoke-Test-1"}' \
  "$BASE/api/auth/register"

echo "== 2. me (echoes the shopper)"
curl -s -b "$SHOPPER" "$BASE/api/auth/me"; echo

echo "== 3. admin login — paste the bootstrap password from the server console"
read -r -p "admin password: " ADMIN_PW
curl -s -o /dev/null -c "$ADMIN" -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin@piccart.local\",\"password\":\"$ADMIN_PW\"}" \
  "$BASE/api/auth/login"

echo "== 4. admin creates a product (three picsum URLs expected)"
curl -s -b "$ADMIN" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Widget","description":"curl smoke test","price":"9.99","stock":5}' \
  "$BASE/api/products"; echo

echo "== 5. shopper adds 2 to the cart"
curl -s -b "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"productId":1,"qty":2}' "$BASE/api/cart/items"; echo

echo "== 6. place the order (snapshot prices, total 1998 expected)"
curl -s -b "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"fullName":"Smoke Test","addressLine1":"1 Test Way","addressLine2":"","city":"Testville","postalCode":"12345","country":"United States"}' \
  "$BASE/api/orders"; echo

echo "== 7. shopper orders list"
curl -s -b "$SHOPPER" "$BASE/api/orders"; echo

echo "== 8. product stock must now be 3"
curl -s "$BASE/api/products/1"; echo

echo "== 9. shopper must NOT see the admin endpoint (403 expected)"
curl -s -o /dev/null -w '%{http_code}\n' -b "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"name":"Nope","price":"1.00","stock":1}' "$BASE/api/products"
```

Step 6 assumes a fresh database so the seeded mug (id 1, $18.50, stock 24) exists — run `npm run seed` first if the database is empty; adjust the expected totals accordingly.
