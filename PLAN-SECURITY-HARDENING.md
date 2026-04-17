# Plan: security hardening (workflow-safe)

This plan implements the bug-bounty-style findings **incrementally** so `npm run dev`, Vite `/api` proxy, Google sync, hub/directory reads, and admin keep working.

**Status (repo):** Phases **A–D** are implemented. **Per-IP rate limits** (in-process) cover `solana-rpc`, directory `GET /api/campaigns`, `POST /api/campaigns`, hub, and campaign detail — see `api/_lib/rateLimit.js` and **DEPLOY.md**. Remaining optional items: **global** rate limits (Firewall / Upstash), constant-time admin compare, CSP.

## Phase A — RPC proxy allowlist (high leverage, low UX risk)

**Goal:** Stop open relay abuse while keeping the browser on same-origin `/api/solana-rpc`.

1. Inventory required methods: grep `@solana/web3.js` / client usage — expect at least `getTokenAccountBalance`, `getBalance`, `getLatestBlockhash`; add `getAccountInfo` / `getParsedTransaction` only if referenced.
2. In `api/solana-rpc.js`: parse `body.method`; if not in allowlist → **400** `{ error: "Method not allowed" }`.
3. Optional: reject `body` larger than ~**64KB** (or similar) with **413/400**.
4. Manual test: open a USDC campaign (progress bar), Profile wallet balance, create flow — all should still load.
5. Update **DEPLOY.md** with “RPC proxy is method-restricted.”

## Phase B — Campaign payload allowlist (integrity)

**Goal:** No extra attacker-controlled keys in stored JSON.

1. Define `ALLOWED_CAMPAIGN_KEYS` matching `validateCampaign.js` + legitimate optional fields (`goalCurrency`, `transparencyNote`, etc.).
2. In `api/campaigns.js` POST: build `sanitized` pick/omit; **400** if unexpected keys **or** strip + log server-side (prefer **400** in dev via env flag if you want strictness later).
3. Ensure `chainFunding` remains stripped (already done).
4. Test: create + sync campaign from UI; reload hub; no regression.

## Phase C — Directory list pagination (disclosure + DoS)

**Goal:** Reduce full-table scrape and RPC amplification on `GET /api/campaigns`.

1. Add query params: `limit` (default **50**, max **200**), optional `cursor` / `beforeUpdatedAt` using `updated_at` + `id` tie-break (simple stable ordering already `ORDER BY updated_at DESC`).
2. Return `{ campaigns, nextCursor }` or `hasMore` — update **`fetchCampaignsDirectoryFromApi`** in `src/lib/crowdcareApi.js` to request paginated data; **DirectoryActivePage** / **DirectoryPastPage** may need to fetch more pages or accept “first page only” until product wants infinite scroll.
3. **Backward compatibility:** If you must not break old clients, default behavior returns first page only; document that full list is no longer one shot.

**Note:** Server still runs `attachChainFundingToCampaigns` on the **returned page** only — reduces RPC blast per request.

## Phase D — Activity API privacy default

**Goal:** Don’t expose payer addresses by default.

1. In `api/campaign/[id].js` (when `includeActivity=1`): omit `fromAddress` unless `includePayer=1` (or `redactPayer=0`).
2. In `CampaignPage.jsx`: only show payer if API returns it (likely never for public).
3. Document in **DEPLOY.md**.

## Phase E — Optional follow-ups (outside minimal plan)

- **Global** edge rate limiting (Vercel Firewall, middleware, or Upstash) — complements in-process limits on `/api/solana-rpc`, `/api/campaigns`, hub, and campaign detail.
- **Constant-time** compare for admin password (minor).
- **CSP** headers for XSS defense-in-depth (careful with GIS / inline if any).

## Verification checklist

- [x] `npm run dev` — gate, sign-in, hub, campaign page, directories.
- [x] `npm run build` passes (CI: `.github/workflows/ci.yml`).
- [ ] Production: `/api/health`, hub fetch, campaign detail, admin Basic auth, cron with `CRON_SECRET` (401 without secret).

## Order of execution

**A → B → D** are smallest and safest; **C** touches more client files — schedule when you can adjust directory fetching.
