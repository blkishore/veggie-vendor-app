import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Veggie Vendor App",
        short_name: "VeggieApp",
        description: "Manage local produce sales, customer orders, and tomorrow's purchasing plan.",
        theme_color: "#173c2c",
        background_color: "#f5f7f3",
        display: "standalone",
        icons: [
          {
            src: "/pwa-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/pwa-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
        shortcuts: [
          {
            name: "Vendor dashboard",
            short_name: "Vendor",
            url: "/vendor",
            description: "Open the vendor dashboard",
          },
          {
            name: "Customer ordering",
            short_name: "Customer",
            url: "/customer",
            description: "Start a customer order",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,json}"],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:5000",
    },
  },
});
