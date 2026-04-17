/**
 * Sliding-window rate limiter (in-process).
 *
 * On Vercel, each serverless instance has its own memory — limits curb bursts per
 * warm instance but are not a global quota. For fleet-wide limits use Vercel
 * Firewall, Upstash, or similar (see DEPLOY.md).
 */

/** @type {Map<string, number[]>} */
const buckets = new Map();

/**
 * @param {string} name
 * @param {number} fallback
 */
export function rateLimitEnvInt(name, fallback) {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * @param {import("http").IncomingMessage} req
 * @returns {string}
 */
export function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const first = xff.split(",")[0].trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim().slice(0, 64);
  const ra = req.socket?.remoteAddress;
  if (typeof ra === "string" && ra) return ra.slice(0, 64);
  return "unknown";
}

/**
 * @param {string} key
 * @param {number} maxPerWindow
 * @param {number} windowMs
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
export function consumeRateToken(key, maxPerWindow, windowMs) {
  const now = Date.now();
  let arr = buckets.get(key);
  if (!arr) {
    arr = [];
    buckets.set(key, arr);
  }
  const cutoff = now - windowMs;
  while (arr.length > 0 && arr[0] < cutoff) arr.shift();
  if (arr.length >= maxPerWindow) {
    const retryAfterMs = arr[0] + windowMs - now;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }
  arr.push(now);
  return { ok: true };
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {{ scope: string, perMinute: number }} opts
 * @returns {boolean} true if the handler should continue
 */
export function rateLimitOr429(req, res, opts) {
  if (process.env.RATE_LIMIT_DISABLED === "1") return true;
  const ip = getClientIp(req);
  const key = `${opts.scope}:${ip}`;
  const r = consumeRateToken(key, opts.perMinute, 60_000);
  if (r.ok) return true;
  res
    .status(429)
    .setHeader("Retry-After", String(r.retryAfterSec))
    .json({ error: "Too many requests" });
  return false;
}

export function rateLimitRpc(req, res) {
  return rateLimitOr429(req, res, {
    scope: "rpc",
    perMinute: rateLimitEnvInt("RATE_LIMIT_RPC_PER_MINUTE", 90),
  });
}

export function rateLimitCampaignsGet(req, res) {
  return rateLimitOr429(req, res, {
    scope: "campaigns-get",
    perMinute: rateLimitEnvInt("RATE_LIMIT_CAMPAIGNS_GET_PER_MINUTE", 100),
  });
}

export function rateLimitCampaignsPost(req, res) {
  return rateLimitOr429(req, res, {
    scope: "campaigns-post",
    perMinute: rateLimitEnvInt("RATE_LIMIT_CAMPAIGNS_POST_PER_MINUTE", 40),
  });
}

export function rateLimitHubGet(req, res) {
  return rateLimitOr429(req, res, {
    scope: "hub-get",
    perMinute: rateLimitEnvInt("RATE_LIMIT_HUB_GET_PER_MINUTE", 80),
  });
}

export function rateLimitCampaignDetailGet(req, res) {
  return rateLimitOr429(req, res, {
    scope: "campaign-detail-get",
    perMinute: rateLimitEnvInt("RATE_LIMIT_CAMPAIGN_DETAIL_PER_MINUTE", 120),
  });
}
