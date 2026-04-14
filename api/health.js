/** Quick check that serverless routes are reachable (no auth). */
export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Allow", "GET").json({ error: "Method not allowed" });
    return;
  }
  res.status(200).json({ ok: true, service: "crowdcare-api" });
}
