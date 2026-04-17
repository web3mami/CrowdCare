/**
 * Vercel serverless: JSON-RPC proxy so the browser calls same-origin /api/solana-rpc
 * (avoids CORS blocks from calling api.mainnet-beta.solana.com directly).
 *
 * Env (optional): SOLANA_RPC_URL — upstream JSON-RPC base, default mainnet.
 *
 * Only methods used by @solana/web3.js in this app are allowed (relay hardening).
 */
import { rateLimitRpc } from "./_lib/rateLimit.js";

const UPSTREAM =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const MAX_BODY_BYTES = 65536;

/** @type {ReadonlySet<string>} */
const ALLOWED_RPC_METHODS = new Set([
  "getTokenAccountBalance",
  "getBalance",
  "getLatestBlockhash",
  "sendTransaction",
  "getSignatureStatuses",
  "getBlockHeight",
]);

/**
 * @param {unknown} body
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function validateRpcMethods(body) {
  if (body == null) {
    return { ok: false, error: "Missing body" };
  }
  if (Array.isArray(body)) {
    for (let i = 0; i < body.length; i++) {
      const m = body[i]?.method;
      if (typeof m !== "string" || !ALLOWED_RPC_METHODS.has(m)) {
        return { ok: false, error: "Method not allowed" };
      }
    }
    return { ok: true };
  }
  const m = body?.method;
  if (typeof m !== "string" || !ALLOWED_RPC_METHODS.has(m)) {
    return { ok: false, error: "Method not allowed" };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res
      .status(405)
      .setHeader("Allow", "POST")
      .json({ error: "Method not allowed" });
    return;
  }

  if (!rateLimitRpc(req, res)) return;

  let rawLen = 0;
  let body = req.body;
  if (body == null) {
    res.status(400).json({ error: "Missing body" });
    return;
  }
  if (typeof body === "string") {
    rawLen = Buffer.byteLength(body, "utf8");
    if (rawLen > MAX_BODY_BYTES) {
      res.status(413).json({ error: "Body too large" });
      return;
    }
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  } else {
    try {
      rawLen = Buffer.byteLength(JSON.stringify(body), "utf8");
    } catch {
      rawLen = MAX_BODY_BYTES + 1;
    }
    if (rawLen > MAX_BODY_BYTES) {
      res.status(413).json({ error: "Body too large" });
      return;
    }
  }

  const v = validateRpcMethods(body);
  if (!v.ok) {
    res.status(400).json({ error: v.error });
    return;
  }

  try {
    const r = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(text);
  } catch (e) {
    console.error("[api/solana-rpc]", e);
    res.status(502).json({ error: "Upstream RPC request failed" });
  }
}
