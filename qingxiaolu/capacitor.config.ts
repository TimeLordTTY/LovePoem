import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.qingxiaolu.app",
  appName: "情晓录",
  webDir: "mobile-dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: "#fffdfa",
      style: "LIGHT",
    },
    BackgroundRunner: {
      label: "com.qingxiaolu.sync",
      src: "runners/sync-runner.js",
      event: "backgroundSync",
      repeat: false,
      autoStart: false,
    },
  },
};

export default config;
