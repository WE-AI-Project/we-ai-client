import { defineConfig, loadEnv } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { detectLocalStack } from "./electron/detectStack.mjs";

function localStackDetectionPlugin() {
  return {
    name: "weai-local-stack-detection",
    configureServer(server: any) {
      server.middlewares.use("/__local/detect-stack", (request: any, response: any) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end("Method Not Allowed");
          return;
        }
        let body = "";
        request.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
        request.on("end", async () => {
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          try {
            const { localPath } = JSON.parse(body);
            if (typeof localPath !== "string" || !localPath.trim()) throw new Error("localPath is required.");
            response.statusCode = 200;
            response.end(JSON.stringify(await detectLocalStack(localPath)));
          } catch (error) {
            response.statusCode = 400;
            response.end(JSON.stringify({ message: error instanceof Error ? error.message : "Failed to scan localPath." }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawProxyTarget = env.VITE_DEV_PROXY_TARGET?.trim() ?? "";
  const proxyTarget =
    rawProxyTarget.replace(/\/+$/, "") ||
    "http://localhost:8080";

  return {
    // Relative asset paths so the built app also loads correctly from a
    // file:// URL when packaged into the Electron desktop app.
    base: "./",
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used, so do not remove them.
      react(),
      tailwindcss(),
      localStackDetectionPlugin(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory.
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Explicit IPv4 binding so Chromium in Electron always connects cleanly on Windows
      host: "127.0.0.1",
      port: 5183,
      strictPort: true,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/ws": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ["**/*.svg", "**/*.csv"],
  };
});
