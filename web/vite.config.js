import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Tab-Pri",
        short_name: "Tab-Pri",
        description: "Private encrypted tab vault",
        theme_color: "#0b0c0f",
        background_color: "#090a0d",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }]
      }
    })
  ],
  build: { target: "es2022" }
});
