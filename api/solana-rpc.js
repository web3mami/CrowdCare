/**
 * Vercel serverless: JSON-RPC proxy so the browser calls same-origin /api/solana-rpc
 * (avoids CORS blocks from calling api.mainnet-beta.solana.com directly).
 *
 * Env (optional): SOLANA_RPC_URL — upstream JSON-RPC base, default mainnet.
 */
const UPSTREAM =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res
      .status(405)
      .setHeader("Allow", "POST")
      .json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (body == null) {
    res.status(400).json({ error: "Missing body" });
    return;
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
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
