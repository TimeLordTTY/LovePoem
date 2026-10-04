import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";

const offlineVersion = randomUUID();

export default defineConfig({
  root: resolve(__dirname, "mobile"),
  base: "./",
  // APK 只包含程序资源，不把本机私人的历史图片或网页下载工具打包分发。
  publicDir: process.env.QX_NATIVE_BUILD === "1" ? false : resolve(__dirname, "public"),
  worker: { format: "es" },
  define: { __QX_BUILD_VERSION__: JSON.stringify(offlineVersion) },
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
        const output = resolve(__dirname, "mobile-dist");
        const indexHash = createHash("sha256").update(readFileSync(resolve(output, "index.html"))).digest("hex");
        const assets = readdirSync(resolve(output, "assets")).filter(name => /\.(js|css|woff2?|ttf|otf)$/.test(name)).sort().map(name => `assets/${name}`);
        const worker = readFileSync(resolve(__dirname, "mobile/offline-worker.js"), "utf8");
        writeFileSync(resolve(output, "offline-sw.js"), worker.replace("__QX_OFFLINE_MANIFEST__", JSON.stringify({ version: offlineVersion, indexHash, assets })));
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, "mobile-dist"),
    emptyOutDir: true,
  },
});
