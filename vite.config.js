import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Production deployment used when `npm run dev` proxies `/api` (override with `VITE_DEV_API_PROXY`). */
const DEFAULT_DEV_API_PROXY = "https://crowd-care-ten.vercel.app";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const fromEnv = env.VITE_DEV_API_PROXY?.trim().replace(/\/$/, "") || "";
  const devApiProxy =
    fromEnv ||
    (mode === "development" ? DEFAULT_DEV_API_PROXY : "");

  const proxy = {};

  if (devApiProxy) {
    proxy["/api"] = {
      target: devApiProxy,
      changeOrigin: true,
      secure: true,
    };
  } else {
    proxy["/api/solana-rpc"] = {
      target: "https://api.mainnet-beta.solana.com",
      changeOrigin: true,
      rewrite: () => "/",
    };
  }

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  };
});
