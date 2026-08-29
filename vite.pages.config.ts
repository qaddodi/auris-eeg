import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/auris-eeg/",
  root: "pages",
  publicDir: resolve(import.meta.dirname, "public"),
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
});
