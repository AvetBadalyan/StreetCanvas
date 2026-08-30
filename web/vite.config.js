import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    open: true,
  },

  build: {
    // Vite's default is `dist`. This project emits to `build` so the existing
    // deploy configuration keeps working unchanged - Vercel's project settings
    // and firebase.json both already point at `build`.
    outDir: "build",
    sourcemap: false,
  },
});
