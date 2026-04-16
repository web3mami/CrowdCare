export async function ensureCrowdcareLedgerTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS crowdcare_ledger (
      id BIGSERIAL PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      signature TEXT NOT NULL,
      slot BIGINT,
      block_time TIMESTAMPTZ,
      mint TEXT NOT NULL DEFAULT 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount_ui NUMERIC(24, 10) NOT NULL,
      from_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (campaign_id, signature)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_crowdcare_ledger_campaign_id
    ON crowdcare_ledger(campaign_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_crowdcare_ledger_block_time
    ON crowdcare_ledger(block_time DESC)
  `;
}

/**
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {{
 *   campaign_id: string,
 *   signature: string,
 *   slot: number|null,
 *   block_time: string|null,
 *   mint: string,
 *   amount_ui: number,
 *   from_address: string|null,
 * }} row
 */
export async function insertLedgerRow(sql, row) {
  await sql`
    INSERT INTO crowdcare_ledger (
      campaign_id, signature, slot, block_time, mint, amount_ui, from_address
    )
    VALUES (
      ${row.campaign_id},
      ${row.signature},
      ${row.slot},
      ${row.block_time},
      ${row.mint},
      ${row.amount_ui},
      ${row.from_address}
    )
    ON CONFLICT (campaign_id, signature) DO NOTHING
  `;
}

/**
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {string} campaignId
 * @param {string|number} [limit]
 */
export async function listLedgerForCampaign(sql, campaignId, limit = 50) {
  const lim = Math.min(Math.max(1, Number(limit) || 50), 100);
  return sql`
    SELECT signature, slot, block_time, mint, amount_ui, from_address, created_at
    FROM crowdcare_ledger
    WHERE campaign_id = ${campaignId}
    ORDER BY COALESCE(block_time, created_at) DESC NULLS LAST
    LIMIT ${lim}
  `;
}
