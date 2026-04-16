/** Vercel Cron: Authorization: Bearer <CRON_SECRET> */
export function authorizeCronRequest(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${secret}`;
}
