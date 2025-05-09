import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@paer/shared": resolve(__dirname, "../shared"),
      },
    },
    optimizeDeps: {
      include: ["@paer/shared"],
      force: true,
    },
    build: {
      outDir: "dist",
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      // Set static asset path for build
      assetsDir: "",
      // Asset path prefix
      base: "/",
      // Generate separate chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            vendor: ["zustand", "axios", "@tanstack/react-query"],
          },
        },
      },
      // Minimize for production
      minify: mode === "production",
      sourcemap: mode !== "production",
    },
    // Proxy API requests to the backend during development
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/api"),
        },
      },
    },
  };
});
