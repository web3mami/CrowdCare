import { neon } from "@neondatabase/serverless";

/** @returns {import('@neondatabase/serverless').NeonQueryFunction | null} */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url || typeof url !== "string") return null;
  return neon(url.trim());
}
