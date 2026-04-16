# CrowdCare deployment notes

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

Indexed **USDC inflows** per campaign:

1. First deploy creates `crowdcare_ledger` on demand when the activity API or cron runs.
2. Set **`CRON_SECRET`** in Vercel (Production). Vercel Cron calls `GET /api/sync-ledger` with `Authorization: Bearer <CRON_SECRET>` (see [Vercel cron docs](https://vercel.com/docs/cron-jobs)).
3. Schedule is defined in [vercel.json](vercel.json) (default every 15 minutes).

The campaign page loads `GET /api/campaignActivity?id=<campaignId>` for **remote** USDC campaigns. Rows appear after a successful sync; parsing uses recent signatures for the campaign wallet (not a full historical indexer). By default **`fromAddress` is omitted** for privacy; add **`includePayer=1`** only if you need payer hints (e.g. internal tools).

## Security

- Do not expose `CRON_SECRET` or `ADMIN_PASSWORD` in the client.
- Ledger and activity endpoints are **read-only** for the public; only the cron route requires the bearer secret.
- **`POST /api/campaigns`** persists only an **allowlisted** set of `campaign` keys; unknown keys return **400**.

## npm audit (Solana stack)

`npm audit` may report **high** issues in `bigint-buffer` via `@solana/spl-token`. Fixing them today often requires `npm audit fix --force`, which downgrades `@solana/spl-token` incompatibly. Treat as a known transitive risk until the Solana JS stack publishes a patched release; review advisories before forcing downgrades.
