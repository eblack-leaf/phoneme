import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  worker: {
    format: "es",
  },
  base: "/phoneme/",
  build: {
    // Pages serves /docs at the repo root. Vite won't clear a folder outside its root unless told,
    // and old hashed assets would pile up.
    outDir: '../docs',
    emptyOutDir: true,
  }
});
