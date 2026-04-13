/**
 * Deterministic demo keypair from Google `sub` (same seed as CrowdCare sign-in).
 */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export async function deriveDemoKeypair(googleSub) {
  const enc = new TextEncoder().encode("crowdcare-demo-v1|" + googleSub);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  const seed = new Uint8Array(hash);
  return Keypair.fromSeed(seed);
}

/** Base58-encoded 64-byte secret key (Phantom / Solflare “import private key”). */
export async function demoSecretKeyBase58(googleSub) {
  const kp = await deriveDemoKeypair(googleSub);
  return bs58.encode(kp.secretKey);
}
