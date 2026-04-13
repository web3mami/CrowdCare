/**
 * Deterministic demo keypair from Google `sub` (same seed as CrowdCare sign-in).
 */
var WEB3_ESM = "https://esm.sh/@solana/web3.js@1.95.8";

export async function deriveDemoKeypair(googleSub) {
  var { Keypair } = await import(WEB3_ESM);
  var enc = new TextEncoder().encode("crowdcare-demo-v1|" + googleSub);
  var hash = await crypto.subtle.digest("SHA-256", enc);
  var seed = new Uint8Array(hash);
  return Keypair.fromSeed(seed);
}

/** Base58-encoded 64-byte secret key (Phantom / Solflare “import private key”). */
export async function demoSecretKeyBase58(googleSub) {
  var kp = await deriveDemoKeypair(googleSub);
  var mod = await import("https://esm.sh/bs58@5.0.0");
  var bs58 = mod.default || mod;
  return bs58.encode(kp.secretKey);
}
