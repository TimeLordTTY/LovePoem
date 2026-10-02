import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";

export default defineConfig({
  root: resolve(__dirname, "mobile"),
  base: "./",
  publicDir: resolve(__dirname, "public"),
  worker: { format: "es" },
  plugins: [
    react(),
    {
      name: "copy-background-runner",
      closeBundle() {
        const destination = resolve(__dirname, "mobile-dist/runners");
        mkdirSync(destination, { recursive: true });
        copyFileSync(
          resolve(__dirname, "mobile/sync-runner.js"),
          resolve(destination, "sync-runner.js"),
        );
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, "mobile-dist"),
    emptyOutDir: true,
  },
});
