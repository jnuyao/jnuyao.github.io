import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function githubPagesMarker(): Plugin {
  return {
    name: "github-pages-marker",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: ".nojekyll",
        source: "",
      });
    },
  };
}

export default defineConfig({
  base: "/",
  publicDir: "public",
  plugins: [react(), githubPagesMarker()],
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
    sourcemap: false,
  },
});
