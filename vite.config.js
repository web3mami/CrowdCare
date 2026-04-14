import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const solanaProxy = {
  "/api/solana-rpc": {
    target: "https://api.mainnet-beta.solana.com",
    changeOrigin: true,
    rewrite: () => "/",
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: solanaProxy,
  },
  preview: {
    proxy: solanaProxy,
  },
});
