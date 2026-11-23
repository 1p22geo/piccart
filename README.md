# Piccart

A tiny demo e-commerce app: Next.js + SQLite, built test-first (Jest + Playwright).
No real payments — checkout stores orders locally.

- Run: `npm install && npm run dev` → http://localhost:3000 (admin password prints to the console on first start)
- Demo data: `npm run seed`
- Unit tests: `npm test` · E2E: `npm run test:e2e` · Everything: `npm run verify`
- User guide: `docs/site/index.html` (rebuild with `npm run docs:build`, screenshots with `npm run docs:screenshots`)
