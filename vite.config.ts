import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"; // Disabled

export default defineConfig(async ({ mode }) => {
  const projectRoot = import.meta.dirname;
  const env = loadEnv(mode, projectRoot, "");
  const apiProxyTarget =
    env.VITE_API_URL?.trim() ||
    `http://localhost:${env.PORT?.trim() || "5000"}`;

  return {
  // Load VITE_* from repo root .env (root is client/, not project root)
  envDir: projectRoot,
  plugins: [
    react(),
    // runtimeErrorOverlay(), // Disabled error overlay
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    dedupe: [
      "@floating-ui/dom",
      "@floating-ui/core",
      "@radix-ui/react-select",
      "cmdk",
      "@stripe/stripe-js",
    ],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      defaultIsModuleExports: "auto",
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    include: [
      "@floating-ui/dom",
      "@floating-ui/core",
      "@radix-ui/react-select",
      "cmdk",
      "@stripe/stripe-js",
    ],
    exclude: [],
    esbuildOptions: {
      plugins: [],
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      overlay: false, // Disable error overlay
    },
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
};
});
