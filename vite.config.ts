import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 5175,
    proxy: {
      "/api": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      "/a2ui-agent": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      "/log": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      "/reset-log": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@a2ui/web-lib/ui": resolve(__dirname, "renderers/lit/src/0.8/ui/ui.ts"),
      "@a2ui/web-lib/0.8": resolve(__dirname, "renderers/lit/src/0.8/index.ts"),
      "@a2ui/web-lib": resolve(__dirname, "renderers/lit/src/index.ts"),
      "@a2ui/web_core": resolve(__dirname, "renderers/web_core/src/v0_8"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        primer: resolve(__dirname, "a2ui-primer.html"),
      },
    },
  },
});
