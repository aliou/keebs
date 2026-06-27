import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Local-only dev server for the keyboard tester. No backend, no deploy target.
// `pnpm dev` starts Vite on http://localhost:5173.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind only to localhost: this captures real keyboard input from a QMK
    // board; there is no reason to expose it on the LAN.
    host: "127.0.0.1",
    port: 5173,
  },
});
