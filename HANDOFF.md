# Piccart handoff · 23 November 2026

## Stable checkpoint

The last successful `npm run verify` completed type checking, all 93 Jest tests, the production Next.js build, all 31 Playwright scenarios and the HTML guide export. The guide was also opened offline from a folder containing only its HTML file. All 14 distinct screenshots decoded, click-to-zoom worked, and the mobile layout fit a 390 px viewport.

The starting commit was `bd2944e`. It contained the catalog, product detail, registration and login screens over the existing SQLite domain and HTTP API. The completed work adds cart editing, checkout with stock-conflict recovery, order history and owner-only detail pages, and administrator product creation, editing, deletion and stock updates. Tests cover these flows, including a shopper attempting to read another account's order.

## Decisions to preserve

- Use Polish UI and documentation, PLN formatted with `pl-PL`, and dates in UTC. All parts of the UI and UX are in Polish, including all 9 demo product names and descriptions, Polish country names in the checkout shipping list, and Polish accessibility labels (`aria-label`). Keep prices in integer grosze. The shipping list starts with Polska and excludes the United States. The first-run administrator credentials box remains in English.
- The cart and checkout pages load their initial cart on the server. Client mutations use the HTTP API. The stock-conflict response carries per-product availability. Guests see a plain cart link and signed-in users see the quantity badge.
- An unavailable product still shows a disabled purchase button. Pagination bounds use disabled buttons so keyboard behavior and browser tests agree.
- The nine demo products have bundled WebP imagery in `public/products/`. The display helper maps their existing seed URLs to those assets. Other products retain the existing external photo URLs. The generated assets depict the merchandise. Playwright captures the actual running shop for every guide screenshot.
- Keep the TypeScript 7 configuration with explicit Node and Jest types. Registration handles SQLite unique constraints by their error code and field, including errors originating in a different JavaScript realm.
- Browser tests create and seed `.data/e2e.db` before starting Next on port 3100. Resetting SQLite after the server opens it caused the previous empty-catalog failure. Tests share one worker and clean up catalog mutations that would affect later scenarios.

## Running and verifying

Use Node 24 (verified with 24.22.3). Follow [README.md](README.md) for installation, seeding and startup. On Windows x64, the documented install with `--ignore-scripts` uses the SQLite binary shipped with the dependency when node-gyp encounters MSB8036. Playwright supports system Chrome on Windows and an explicit `PLAYWRIGHT_CHANNEL` override.

Run `npm run docs:screenshots` after changing screens or product imagery. It starts a dedicated shop on port 3311, resets only the documentation database and waits for images to decode before capturing each view. Run `npm run verify` afterwards. Verification rebuilds the guide from the existing PNGs, so screenshot capture is a separate step.

## Deliverables

- [Self-contained Polish guide](docs/site/index.html) with ten chapters, captions, navigation and click-to-zoom. The HTML can be copied on its own.
- [Markdown sources and original screenshots](docs/) and [capture script](scripts/capture-docs-screenshots.mjs).
- [Unit tests](tests/unit/) for domain, API and documentation behavior, and [browser scenarios](tests/e2e/) for guest, shopper and administrator flows.

This is the verified local demo checkpoint. The verification covered a Windows environment with Chrome. Production deployment and cross-browser certification were outside the handoff scope.
