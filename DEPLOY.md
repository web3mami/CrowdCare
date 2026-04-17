# CrowdCare deployment notes

## How funding and Activity work

**USDC campaigns**

- **Progress / “raised”** can combine what the creator saved in the campaign with **on-chain USDC** in the wallet’s canonical ATA (see app logic and `chainFunding` on list APIs). That gives a more honest picture when the saved number lags.
- **Activity** (if the ledger is enabled) lists **recent USDC inflows** the indexer saw for that wallet’s mint. It is **not** a complete accounting of all history.

**SOL campaigns**

- **Progress** uses the **saved** goal and raised values. Native SOL in the wallet is **not** auto-merged with “raised” (rent, fees, and SOL that was already there would skew the story). A future product rule could add something like a baseline lamports field.
- **Activity** uses **native SOL balance deltas** per transaction where possible. That can include noise; explorers remain the source of truth for audits.

**Activity limits (all types)**

- Rows appear only after a successful **ledger sync** (cron and/or manual `syncLedger`).
- Each sync walks at most **`LEDGER_SYNC_MAX_SIGNATURES`** recent signatures per wallet — very busy wallets may not show old transfers in Activity.
- **`fromAddress`** is omitted by default; use `includePayer=1` only for internal tooling.

## Database (Neon)

Set `DATABASE_URL` on Vercel (or your host). Campaign payloads and optional ledger rows live in Postgres.

## Google sign-in

See [GOOGLE-SETUP.md](GOOGLE-SETUP.md) for Web client ID and sync behavior.

## Solana RPC (server)

API routes that read USDC balances (`attachChainFundingToCampaigns`, ledger sync) use:

- `SOLANA_RPC_URL` — optional; defaults to `https://api.mainnet-beta.solana.com`.

The browser still uses **`/api/solana-rpc`** (or `VITE_SOLANA_RPC_URL` when set) for client-side reads. That proxy **allowlists JSON-RPC methods** used by this app (`getTokenAccountBalance`, `getBalance`, `getLatestBlockhash`, `sendTransaction`, `getSignatureStatuses`, `getBlockHeight`) and rejects oversized bodies (~64KB). If you upgrade `@solana/web3.js` and sends fail with `Method not allowed`, add the new method name in `api/solana-rpc.js`.

## Public campaign directory API

`GET /api/campaigns` is **paginated**: `limit` (default 50, max 200) and optional `cursor` (opaque, from the previous response’s `nextCursor`). The web app follows pages until done (internal cap). Direct callers can request a single page to reduce load.

## USDC progress vs SOL goals

- **USDC:** Progress can merge **saved** `raisedAmount` with **on-chain** USDC at the campaign wallet (canonical ATA on mainnet). Lists and detail views use the same rules; the server can attach `chainFunding` on GET for fewer browser RPC calls.
- **SOL:** Native balance is **not** auto-merged (rent, fees, and prior SOL in the wallet skew totals). Treat SOL **raised** as the value the creator saves in the campaign unless you add an explicit product rule (for example a `sol_baseline_lamports` field in the future).

## Activity ledger (optional)

Indexed **USDC SPL** and **native SOL** inflows per campaign (goal type picks which rows are shown):

1. First deploy creates `crowdcare_ledger` on demand when the activity API or cron runs. **Redeploying the app does not delete ledger rows** (they live in Postgres).
2. Set **`CRON_SECRET`** in Vercel (Production). Vercel Cron calls `GET /api/campaigns?syncLedger=1` with `Authorization: Bearer <CRON_SECRET>` (see [Vercel cron docs](https://vercel.com/docs/cron-jobs)). You can trigger the same URL manually (e.g. curl) after a deposit to refresh Activity without waiting for cron.
3. Schedule is defined in [vercel.json](vercel.json). **Vercel Hobby** only allows cron **once per day**; this repo uses **`0 10 * * *`** (10:00 UTC). On **Pro**, you can switch to a tighter schedule (e.g. every 15 minutes) if you want faster Activity updates.
4. **`LEDGER_SYNC_MAX_SIGNATURES`** (optional, default **1000**, max **5000**): how many newest signatures per wallet the indexer walks per sync. Raise it if Activity is missing older transfers (busy wallets need a higher cap). Heavy values mean more RPC work per cron run.
5. **`SOL_LEDGER_MIN_LAMPORTS`** (optional, default **1**): ignore native SOL balance increases smaller than this (noise / dust filter).

The `crowdcare_ledger` table uses **`UNIQUE (campaign_id, signature, mint)`** so the same transaction can’t insert duplicate rows for the same asset; existing databases migrate by dropping the old `(campaign_id, signature)` unique constraint on the next API/cron run that calls `ensureCrowdcareLedgerTable`.

**`GET /api/campaign/<campaignId>`** always includes **`activity`** (ledger rows) and **`databaseConfigured`** in the JSON alongside **`campaign`**. Optional query **`activityLimit`** caps rows returned to the client. Rows appear after a successful sync; the indexer walks up to **`LEDGER_SYNC_MAX_SIGNATURES`** newest signatures per wallet per run (not infinite history—use a block explorer for full audit). By default **`fromAddress` is omitted** for privacy; add **`includePayer=1`** only if you need payer hints (e.g. internal tools).

## Security

- Do not expose `CRON_SECRET` or `ADMIN_PASSWORD` in the client.
- Ledger and activity endpoints are **read-only** for the public; only the cron route requires the bearer secret.
- **`POST /api/campaigns`** persists only an **allowlisted** set of `campaign` keys; unknown keys return **400**.

### Rate limits (API abuse)

Public routes use a **sliding-window limit per client IP** (from `x-forwarded-for` / `x-real-ip`) in addition to existing auth and RPC method allowlists:

| Area | Env override (requests / minute) | Default |
|------|-------------------------------------|--------|
| `POST /api/solana-rpc` | `RATE_LIMIT_RPC_PER_MINUTE` | 90 |
| `GET /api/campaigns` (directory; not cron) | `RATE_LIMIT_CAMPAIGNS_GET_PER_MINUTE` | 100 |
| `POST /api/campaigns` | `RATE_LIMIT_CAMPAIGNS_POST_PER_MINUTE` | 40 |
| `GET /api/hub/...` | `RATE_LIMIT_HUB_GET_PER_MINUTE` | 80 |
| `GET /api/campaign/...` | `RATE_LIMIT_CAMPAIGN_DETAIL_PER_MINUTE` | 120 |

- **`429`** responses include **`Retry-After`** (seconds).
- **`GET /api/campaigns?syncLedger=1`** is **not** limited when the request passes **`CRON_SECRET`** (same as before).
- Limits are enforced **per serverless instance** (in-memory). For **fleet-wide** throttling, add [Vercel Firewall](https://vercel.com/docs/security/vercel-firewall) rules or a shared store (e.g. Upstash).
- Local / debugging: set **`RATE_LIMIT_DISABLED=1`** in the environment (do not use in production).

## Deploy smoke (runbook)

After each production deploy:

1. Open **`/api/health`** — expect JSON with `"ok": true` (or your health contract).
2. Load the **gate** and **app home**; open **one campaign** (USDC if you use merged funding).
3. **`GET /api/campaigns?limit=5`** — expect `campaigns` array and pagination fields.
4. If you use Activity: trigger **`GET /api/campaigns?syncLedger=1`** with `Authorization: Bearer <CRON_SECRET>` or wait for cron; reload a campaign and confirm **`activity`** in **`GET /api/campaign/<id>`**.
5. Optional: **`POST /api/admin/stats`** with HTTP Basic auth.

If Activity is empty but deposits exist: check **`SOLANA_RPC_URL`**, cron auth, and raise **`LEDGER_SYNC_MAX_SIGNATURES`** for noisy wallets.

## npm audit (Solana stack)

`npm audit` may report **high** issues in `bigint-buffer` via `@solana/spl-token`. Fixing them today often requires `npm audit fix --force`, which downgrades `@solana/spl-token` incompatibly. Treat as a known transitive risk until the Solana JS stack publishes a patched release; review advisories before forcing downgrades.
