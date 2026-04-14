import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devApiProxy = env.VITE_DEV_API_PROXY?.trim().replace(/\/$/, "") || "";

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
