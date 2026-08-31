import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    open: true,
  },

  build: {
    // Vite's default is `dist`. This project emits to `build` so the Vercel
    // project's existing output-directory setting keeps working unchanged.
    outDir: "build",
    sourcemap: false,
  },
});
